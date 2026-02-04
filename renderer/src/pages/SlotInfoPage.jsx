import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import Modal from "../components/Modal";
import AddButton from "../components/AddButton";
import CreateSlots from "../components/CreateSlots";
import EditSlots from "../components/EditSlots";
import { useAuth } from "../contexts/AuthContext";

export default function SlotInfoPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  // Program state
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Operation state
  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);

  // Slot state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  /* =======================
     Fetch Programs
  ======================= */
  useEffect(() => {
    if (!programQuery.trim()) {
      setProgramResults([]);
      return;
    }

    const fetchPrograms = async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .eq("institution_id", currentInstituteId)
        .eq("is_active", true)
        .ilike("name", `%${programQuery}%`);

      if (!error) setProgramResults(data || []);
    };

    fetchPrograms();
  }, [programQuery, currentInstituteId]);

  /* =======================
     Fetch Operations
  ======================= */
  useEffect(() => {
    if (!operationQuery.trim() || !selectedProgram) {
      setOperationResults([]);
      return;
    }

    const fetchOperations = async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("id, name")
        .eq("program_id", selectedProgram.id)
        .eq("status", "active")
        .ilike("name", `%${operationQuery}%`);

      if (!error) setOperationResults(data || []);
    };

    fetchOperations();
  }, [operationQuery, selectedProgram]);

  /* =======================
     Fetch Slots
  ======================= */
  const fetchSlots = async () => {
    if (!selectedOperation) return;

    setLoadingSlots(true);

    const { data, error } = await supabase
      .from("slotinfo")
      .select("*")
      .eq("operation_id", selectedOperation.id)
      .order("serial_no", { ascending: true });

    if (!error) setSlots(data || []);
    setLoadingSlots(false);
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedOperation]);

  return (
    <div className="page-content">
      {/* ================= MODALS ================= */}

      <Modal
        isOpen={isCreateOpen}
        title="Create Slot"
        onClose={() => {
          setIsCreateOpen(false);
          fetchSlots();
        }}
      >
        <CreateSlots
          operationId={selectedOperation?.id}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchSlots();
          }}
        />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Slot"
        onClose={() => {
          setIsEditOpen(false);
          fetchSlots();
        }}
      >
        <EditSlots
          slotId={selectedSlotId}
          onCancel={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false);
            fetchSlots();
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
        <br/>
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
