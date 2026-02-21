import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AddButton from "../components/AddButton";
import CreateSlots from "../components/CreateSlots";
import EditSlots from "../components/EditSlots";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchOperations, fetchSlots } from "../utils/fetch";

export default function SlotInfoPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  // Program state
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Operation state
  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [loadingOperations, setLoadingOperations] = useState(false);

  // Slot state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  /* ======================= FETCH PROGRAMS ======================= */
  useEffect(() => {
    if (!programQuery.trim()) {
      setProgramResults([]);
      return;
    }

    fetchPrograms(
      currentInstituteId,
      programQuery,
      setProgramResults,
      setLoadingPrograms
    );
  }, [programQuery, currentInstituteId]);

  /* ======================= FETCH OPERATIONS ======================= */
  useEffect(() => {
    if (!operationQuery.trim() || !selectedProgram) {
      setOperationResults([]);
      return;
    }

    fetchOperations(
      selectedProgram.id,
      operationQuery,
      setOperationResults,
      setLoadingOperations
    );
  }, [operationQuery, selectedProgram]);

  /* ======================= FETCH SLOTS ======================= */
  useEffect(() => {
    fetchSlots(selectedOperation?.id, setSlots);
  }, [selectedOperation]);

  return (
    <div className="page-content">
      {/* ================= MODALS ================= */}
      <Modal
        isOpen={isCreateOpen}
        title="Create Slot"
        onClose={() => {
          setIsCreateOpen(false);
          fetchSlots(selectedOperation?.id, setSlots);
        }}
      >
        <CreateSlots
          operationId={selectedOperation?.id}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchSlots(selectedOperation?.id, setSlots);
          }}
        />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Slot"
        onClose={() => {
          setIsEditOpen(false);
          fetchSlots(selectedOperation?.id, setSlots);
        }}
      >
        <EditSlots
          slotId={selectedSlotId}
          onCancel={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false);
            fetchSlots(selectedOperation?.id, setSlots);
          }}
        />
      </Modal>

      {/* ================= HEADER ================= */}
      <div className="page-sidebar-title">
        <h2>Slot Info</h2>
        {selectedProgram && selectedOperation && (
          <AddButton
            onClick={() => setIsCreateOpen(true)}
            ariaLabel="Create Slot"
          />
        )}
      </div>

      {/* ================= PROGRAM SEARCH ================= */}
      <div className="form-field autocomplete-container">
        <label>Programs</label>
        <input
          className="form-input"
          placeholder="Search program..."
          value={programQuery}
          onChange={(e) => {
            setProgramQuery(e.target.value);
            setSelectedProgram(null);
            setSelectedOperation(null);
            setOperationQuery("");
            setSlots([]);
          }}
          onBlur={() => setTimeout(() => setProgramResults([]), 200)}
        />
        {loadingPrograms && <div className="autocomplete-loading">Searching...</div>}
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
                  setSelectedOperation(null);
                  setOperationQuery("");
                  setSlots([]);
                }}
              >
                {prog.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= OPERATION SEARCH ================= */}
      <div className="form-field autocomplete-container">
        <label>Operations</label>
        <input
          className="form-input"
          placeholder="Search operation..."
          value={operationQuery}
          onChange={(e) => {
            setOperationQuery(e.target.value);
            setSelectedOperation(null);
            setSlots([]);
          }}
          onBlur={() => setTimeout(() => setOperationResults([]), 200)}
          disabled={!selectedProgram}
        />
        {loadingOperations && <div className="autocomplete-loading">Searching...</div>}
        {operationResults.length > 0 && (
          <div className="autocomplete-list">
            {operationResults.map((op) => (
              <div
                key={op.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setSelectedOperation(op);
                  setOperationQuery(op.name);
                  setOperationResults([]);
                }}
              >
                {op.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= SLOT LIST ================= */}
      {loadingSlots && <p>Loading…</p>}

      <div className="lists-container">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="list-item"
            onClick={() => {
              setSelectedSlotId(slot.id);
              setIsEditOpen(true);
            }}
          >
            <strong>{slot.serial_no} | </strong> {slot.name}
            <div style={{ fontSize: "0.9em", color: "#666" }}>
              {slot.start} – {slot.end}
            </div>
          </div>
        ))}

        {!loadingSlots && selectedOperation && slots.length === 0 && (
          <p style={{ color: "#777" }}>No slots created yet.</p>
        )}
      </div>
    </div>
  );
}