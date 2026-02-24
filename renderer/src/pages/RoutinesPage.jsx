import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";
import { fetchPrograms } from "../utils/fetch";
import { fetchRoutinesByProgram } from "../utils/fetch";
import Modal from "../components/Modal";
import EditRoutine from "../components/EditRoutine";
import AddButton from "../components/AddButton";
import CreateRoutine from "../components/CreateRoutine";

export default function RoutinesPage() {
  const { userData } = useAuth();
  const instituteId = userData?.institute_id;

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (!programQuery.trim()) return setProgramResults([]);
    fetchPrograms(instituteId, programQuery, setProgramResults, () => {});
  }, [programQuery, instituteId]);

  useEffect(() => {
    if (!selectedProgram) return setRoutines([]);
    fetchRoutinesByProgram(selectedProgram.id, setRoutines, setLoading);
  }, [selectedProgram]);

  useEffect(() => {
    if (!isCreateOpen && !isEditOpen) {
        if (!selectedProgram) return setRoutines([]);
        fetchRoutinesByProgram(selectedProgram.id, setRoutines, setLoading);
    }
  }, [isCreateOpen, isEditOpen]);

  function openRoutine(routine) {
    setSelectedRoutine(routine);
    setisEditOpen(true);
  }

  return (
  <div className="page-content">
    {isCreateOpen && (
    <Modal
        isOpen={isCreateOpen}
        title="Create Operation"
        onClose={() => setIsCreateOpen(false)}
      >
        <CreateRoutine/>
      </Modal>)
    }
    {/* Header */}
    <div className="page-sidebar-title">
        <h2>Routines</h2>
        <AddButton onClick={() => setIsCreateOpen(true)} ariaLabel="Create Operation" />
    </div>

    {/* Program Search */}
    <div
      className="form-field autocomplete-container"
      style={{ maxWidth: "300px", marginBottom: "16px" }}
    >
      <label>Program:</label>
      <input
        className="form-input"
        placeholder="Search program..."
        value={programQuery}
        onChange={(e) => {
          setProgramQuery(e.target.value);
          setSelectedProgram(null);
          setRoutines([]);
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

    {/* Loading */}
    {loading && <p>Loading routines...</p>}

    {/* Empty State */}
    {!loading && selectedProgram && routines.length === 0 && (
      <p>No routines found.</p>
    )}

    {/* Routine List */}
    <div className="lists-container">
      {routines.map((routine) => (
        <div
          key={routine.id}
          className="list-item"
          onClick={() => openRoutine(routine)}
        >
          <h3>{routine.name}</h3>
          <p>{routine.operation?.name}</p>
          <p
            style={{
              fontSize: "0.85em",
              color: "#666",
            }}
          >
            Created:{" "}
            {new Date(routine.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>

    {/* Edit Modal */}
    <Modal
      isOpen={isEditOpen}
      title={`Edit Routine: ${selectedRoutine?.name || ""}`}
      onClose={() => setisEditOpen(false)}
    >
      {selectedRoutine && (
        <EditRoutine
          selectedOperation={selectedRoutine.operation}
          routine={selectedRoutine}
          onClose={() => setisEditOpen(false)}
        />
      )}
    </Modal>
  </div>
);
}