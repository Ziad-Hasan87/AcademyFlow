import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import Modal from "./Modal"; // normal modal
import CreateRoutineEvent from "./CreateRoutineEvent";
import { fetchPrograms, fetchOperations, fetchSlots } from "../utils/fetch";

export default function CreateRoutinePage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  // Program & Operation selection
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);

  // Routine table
  const [slots, setSlots] = useState([]);

  // Modal for adding routine event
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /** Fetch Programs **/
  useEffect(() => {
    if (programQuery.trim() === "") {
      setProgramResults([]);
      return;
    }
    fetchPrograms(currentInstituteId, programQuery, setProgramResults, () => {});
  }, [programQuery, currentInstituteId]);

  /** Fetch Operations for Selected Program **/
  useEffect(() => {
    if (!selectedProgram) return setOperationResults([]);
    if (operationQuery.trim() === "") {
      setOperationResults([]);
      return;
    }
    fetchOperations(selectedProgram.id, operationQuery, setOperationResults, () => {});
  }, [operationQuery, selectedProgram]);

  /** Fetch Slots for Selected Operation **/
  useEffect(() => {
    if (!selectedOperation) return setSlots([]);
    fetchSlots(selectedOperation.id, setSlots);
  }, [selectedOperation]);

  return (
    <div className="routine-page" style={{ padding: "20px", color: "#1a1a1a", overflowY: "auto", width: "100%" }}>
      <h2>Create Routine</h2>

      {/* Program Search */}
      <div className="form-field autocomplete-container" style={{ maxWidth: "300px", marginBottom: "16px" }}>
        <label>Program:</label>
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
                  setProgramQuery(prog.name);
                  setSelectedProgram(prog);
                  setProgramResults([]);
                }}
              >
                {prog.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Search */}
      {selectedProgram && (
        <div className="form-field autocomplete-container" style={{ maxWidth: "300px", marginBottom: "16px" }}>
          <label>Operation:</label>
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
          />
          {operationResults.length > 0 && (
            <div className="autocomplete-list">
              {operationResults.map((op) => (
                <div
                  key={op.id}
                  className="autocomplete-item"
                  onMouseDown={() => {
                    setOperationQuery(op.name);
                    setSelectedOperation(op);
                    setOperationResults([]);
                  }}
                >
                  {op.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Routine Table */}
      {selectedOperation && slots.length > 0 && (
        <table
          className="routine-table"
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", marginTop: "16px", width: "100%" }}
        >
          <thead>
            <tr>
              <th>Slot / Day</th>
              {days.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td>
                  {slot.name} (
                  {new Date(`1970-01-01T${slot.start}Z`).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} –{" "}
                  {new Date(`1970-01-01T${slot.end}Z`).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                </td>
                {days.map((day) => (
                  <td key={day}>
                    <button
                      className="routine-add-btn"
                      onClick={() => {
                        setSelectedSlotId(slot.id);
                        setIsEventModalOpen(true);
                      }}
                    >
                      Add Event
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for Adding Routine Event */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Create Routine Event"
      >
        <CreateRoutineEvent slotId={selectedSlotId} />
      </Modal>
    </div>
  );
}
