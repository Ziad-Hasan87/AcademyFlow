import Modal from "../components/Modal";
import CreateSubgroups from "../components/CreateSubgroups";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import EditSubgroups from "../components/EditSubgroups";

export default function SubgroupsPage() {
  const [isCreateOpen, setisCreateOpen] = useState(false);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(null);

  const fetchGroups = async () => {
    const currentInstituteId = localStorage.getItem("institute_id");
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, programs(name, institution_id)")
      .eq("programs.institution_id", currentInstituteId)
      .order("name");

    if (error) {
      console.error("Error fetching groups:", error);
    } else {
      setGroups(data);
    }
  };

  const fetchSubgroups = async (groupId = "") => {
    setLoading(true);

    const currentInstituteId = localStorage.getItem("institute_id");

    let query = supabase
      .from("subgroups")
      .select(`
        id,
        name,
        created_at,
        group_id,
        groups (
          name,
          programs (
            name,
            institution_id
          )
        )
      `)
      .eq("groups.programs.institution_id", currentInstituteId)
      .order("name", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching subgroups:", error);
    } else {
      setSubgroups(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSubgroups();
    fetchGroups();
  }, []);

  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setisCreateOpen(true)}
        aria-label="Create Subgroup"
      >
        + Add
      </button>
      <Modal
        isOpen={isCreateOpen}
        title="Create Subgroup"
        onClose={() => {
          setisCreateOpen(false);
          fetchSubgroups();
        }}
      >
        <CreateSubgroups />
      </Modal>
      <Modal
        isOpen={isEditOpen}
        title="Edit Subgroup"
        onClose={() => {
          setisEditOpen(false);
          fetchSubgroups();
        }}
      >
        <EditSubgroups
          subgroupId={selectedSubgroupId}
          onCancel={() => setisEditOpen(false)}
        />
      </Modal>
      <div>
        <h2>Subgroups</h2>
        <div
          className="form-field"
          style={{ maxWidth: "300px", marginBottom: "16px" }}
        >
          <select
            className="form-select"
            value={selectedGroup}
            onChange={(e) => {
              const grpId = e.target.value;
              setSelectedGroup(grpId);
              fetchSubgroups(grpId);
            }}
          >
            <option value="">All Groups</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {subgroups.map((subgroup) => (
          <div
            key={subgroup.id}
            className="list-item"
            onClick={() => {
              setSelectedSubgroupId(subgroup.id);
              setisEditOpen(true);
            }}
          >
            <h3>{subgroup.name}</h3>
            {subgroup.groups?.programs?.name && (
              <p style={{ fontSize: "0.85em", color: "#666" }}>
                {subgroup.groups.programs.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
