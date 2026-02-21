import Modal from "../components/Modal";
import CreateOperations from "../components/CreateOperations";
import EditOperations from "../components/EditOperations";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AddButton from "../components/AddButton";
import { fetchPrograms, fetchOperations } from "../utils/fetch";

export default function OperationsPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [operations, setOperations] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");

  const [selectedOperationId, setSelectedOperationId] = useState(null);

  /** Fetch all active programs for this institute **/
  const loadPrograms = async () => {
    if (!currentInstituteId) return;
    await fetchPrograms(currentInstituteId, "", setPrograms, () => {});
  };

  /** Fetch operations for the selected program **/
  const loadOperations = async (programId = "") => {
    if (!programId && !selectedProgram) return;
    const id = programId || selectedProgram;
    await fetchOperations(
      id,
      "", // empty query to fetch all initially
      setOperations,
      setLoadingOperations
    );
  };

  /** Initial load **/
  useEffect(() => {
    loadPrograms();
    loadOperations();
  }, []);

  /** Reload operations when program changes **/
  useEffect(() => {
    if (selectedProgram) loadOperations(selectedProgram);
  }, [selectedProgram]);

  /** Also reload when modals close (after create/edit) **/
  useEffect(() => {
    if (!isCreateOpen && !isEditOpen) {
      loadPrograms();
      loadOperations();
    }
  }, [isCreateOpen, isEditOpen]);

  return (
    <div className="page-content">
      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        title="Create Operation"
        onClose={() => setIsCreateOpen(false)}
      >
        <CreateOperations />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        title="Edit Operation"
        onClose={() => setIsEditOpen(false)}
      >
        <EditOperations
          operationId={selectedOperationId}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      <div className="page-sidebar-title">
        <h2>Operations</h2>
        <AddButton onClick={() => setIsCreateOpen(true)} ariaLabel="Create Operation" />
      </div>

      {/* Program filter */}
      <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
        <select
          className="form-select"
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
        >
          <option value="">All Programs</option>
          {programs.map((prog) => (
            <option key={prog.id} value={prog.id}>
              {prog.name}
            </option>
          ))}
        </select>
      </div>

      {loadingOperations && <p>Loading…</p>}

      <div className="lists-container">
        {operations.map((operation) => (
          <div
            key={operation.id}
            className={operation.status === "active" ? "list-item" : "list-item-inactive"}
            onClick={() => {
              setSelectedOperationId(operation.id);
              setIsEditOpen(true);
            }}
          >
            <h3>{operation.name}</h3>
            <p>{operation.programs?.name}</p>
            <p
              style={{
                fontSize: "0.85em",
                color: "#666",
                textTransform: "capitalize",
              }}
            >
              Status: {operation.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}