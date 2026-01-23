import Modal from "../components/Modal";
import CreateGroups from "../components/CreateGroups";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import EditGroups from "../components/EditGroups";
import { useAuth } from "../contexts/AuthContext";

export default function GroupsPage() {
  const { userData } = useAuth();
  const [isCreateOpen, setisCreateOpen] = useState(false);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const fetchPrograms = async () => {
    const currentInstituteId = userData?.institute_id;
    const { data, error } = await supabase
      .from("programs")
      .select("id, name")
      .eq("institution_id", currentInstituteId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching programs:", error);
    } else {
      setPrograms(data);
    }
  };

  const fetchGroups = async (programId = "") => {
    setLoading(true);

    const currentInstituteId = userData?.institute_id;

    let query = supabase
    .from("groups")
    .select(`
      id,
      name,
      created_at,
      program_id,
      programs!inner (
        name,
        institution_id
      )
    `)
    .eq("programs.institution_id", currentInstituteId)
    .order("name", { ascending: true });


    if (programId) {
      query = query.eq("program_id", programId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching groups:", error);
    } else {
      setGroups(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
    fetchPrograms();
  }, []);

  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setisCreateOpen(true)}
        aria-label="Create Group"
      >
        + Add
      </button>
      <Modal
        isOpen={isCreateOpen}
        title="Create Group"
        onClose={() => {
          setisCreateOpen(false);
          fetchGroups();
        }}
      >
        <CreateGroups />
      </Modal>
      <Modal
        isOpen={isEditOpen}
        title="Edit Group"
        onClose={() => {
          setisEditOpen(false);
          fetchGroups();
        }}
      >
        <EditGroups
          groupId={selectedGroupId}
          onCancel={() => setisEditOpen(false)}
        />
      </Modal>
      <div>
        <h2>Groups</h2>
        <div
          className="form-field"
          style={{ maxWidth: "300px", marginBottom: "16px" }}
        >
          <select
            className="form-select"
            value={selectedProgram}
            onChange={(e) => {
              const progId = e.target.value;
              setSelectedProgram(progId);
              fetchGroups(progId);
            }}
          >
            <option value="">All Programs</option>
            {programs.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {groups.map((group) => (
          <div
            key={group.id}
            className="list-item"
            onClick={() => {
              setSelectedGroupId(group.id);
              setisEditOpen(true);
            }}
          >
            <h3>{group.name}</h3>
            <p>{group.programs?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
