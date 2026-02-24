import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AddButton from "../components/AddButton";
import CreateSubgroups from "../components/CreateSubgroups";
import EditSubgroups from "../components/EditSubgroups";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchGroups, fetchSubgroups } from "../utils/fetch";

export default function SubgroupsPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(null);

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [subgroups, setSubgroups] = useState([]);
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);

  useEffect(() => {
    if (!programQuery.trim()) {
      setProgramResults([]);
      return;
    }

    fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms);
  }, [programQuery, currentInstituteId]);

  useEffect(() => {
    if (!selectedProgram) {
      setGroups([]);
      setSelectedGroup("");
      return;
    }

    fetchGroups(selectedProgram.id, "", setGroups, setLoadingGroups);
  }, [selectedProgram]);

  useEffect(() => {
    if (!selectedGroup) {
      fetchSubgroups(null, "", setSubgroups, setLoadingSubgroups);
      return;
    }

    fetchSubgroups(selectedGroup, "", setSubgroups, setLoadingSubgroups);
  }, [selectedGroup]);

  return (
    <div className="page-content">
      {/* ================= MODALS ================= */}
      <Modal
        isOpen={isCreateOpen}
        title="Create Subgroup"
        onClose={() => {
          setIsCreateOpen(false);
          fetchSubgroups(selectedGroup || null, "", setSubgroups, setLoadingSubgroups);
        }}
      >
        <CreateSubgroups />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Subgroup"
        onClose={() => {
          setIsEditOpen(false);
          fetchSubgroups(selectedGroup || null, "", setSubgroups, setLoadingSubgroups);
        }}
      >
        <EditSubgroups
          subgroupId={selectedSubgroupId}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      {/* ================= HEADER ================= */}
      <div className="page-sidebar-title">
        <h2>Subgroups</h2>
          <AddButton
            onClick={() => setIsCreateOpen(true)}
            ariaLabel="Create Subgroup"
          />
        
      </div>

      {/* ================= PROGRAM SEARCH ================= */}
      <div className="form-field autocomplete-container">
        <label>Program</label>
        <input
          className="form-input"
          placeholder="Search program..."
          value={programQuery}
          onChange={(e) => {
            setProgramQuery(e.target.value);
            setSelectedProgram(null);
            setSelectedGroup("");
            setGroups([]);
            setSubgroups([]);
          }}
          onBlur={() => setTimeout(() => setProgramResults([]), 200)}
        />
        {programResults.length > 0 && (
          <div className="autocomplete-list">
            {programResults.map((prog) => (
              <div
                key={prog.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setSelectedProgram(prog);
                  setProgramQuery(prog.name);
                  setProgramResults([]);
                }}
              >
                {prog.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= GROUP SELECT ================= */}
      {selectedProgram && (
        <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
          <label>Group</label>
          <select
            className="form-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ================= SUBGROUP LIST ================= */}
      {loadingSubgroups && <p>Loading…</p>}
      <div className="lists-container">
        {subgroups.map((subgroup) => (
          <div
            key={subgroup.id}
            className="list-item"
            onClick={() => {
              setSelectedSubgroupId(subgroup.id);
              setIsEditOpen(true);
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

        {!loadingSubgroups && subgroups.length === 0 && (
          <p style={{ color: "#777" }}>No subgroups found.</p>
        )}
      </div>
    </div>
  );
}