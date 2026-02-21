import Modal from "../components/Modal";
import CreateGroups from "../components/CreateGroups";
import EditGroups from "../components/EditGroups";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AddButton from "../components/AddButton";
import { fetchPrograms, fetchGroups } from "../utils/fetch";

export default function GroupsPage() {
  const { userData } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  /** Load programs using the new fetchPrograms utility */
  const loadPrograms = async () => {
    if (!userData?.institute_id) return;
    await fetchPrograms(
      userData.institute_id,
      "",          // programQuery empty initially
      setPrograms, // callback to set programs
      () => {}     // no loading state needed here
    );
  };

  /** Load groups using the new fetchGroups utility */
  const loadGroups = async (programId = "") => {
    setLoading(true);
    await fetchGroups(
      programId,
      "",         // groupQuery empty initially
      setGroups,  // callback to set groups
      setLoading  // loading state
    );
    setLoading(false);
  };

  useEffect(() => {
    loadPrograms();
    loadGroups();
  }, [userData?.institute_id]);

  return (
    <div className="page-content">
      <Modal
        isOpen={isCreateOpen}
        title="Create Group"
        onClose={() => {
          setIsCreateOpen(false);
          loadGroups(selectedProgram);
        }}
      >
        <CreateGroups />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Group"
        onClose={() => {
          setIsEditOpen(false);
          loadGroups(selectedProgram);
        }}
      >
        <EditGroups
          groupId={selectedGroupId}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      <div className="page-sidebar-title">
        <h2>Groups</h2>
        <AddButton
          onClick={() => setIsCreateOpen(true)}
          ariaLabel="Create Group"
        />
      </div>

      <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
        <select
          className="form-select"
          value={selectedProgram}
          onChange={(e) => {
            const progId = e.target.value;
            setSelectedProgram(progId);
            loadGroups(progId);
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

      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {groups.map((group) => (
          <div
            key={group.id}
            className="list-item"
            onClick={() => {
              setSelectedGroupId(group.id);
              setIsEditOpen(true);
            }}
          >
            <h3>{group.name}</h3>
            <p>{group.programs?.name || ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}