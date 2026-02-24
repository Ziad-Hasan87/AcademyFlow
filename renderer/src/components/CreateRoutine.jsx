import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchOperations } from "../utils/fetch";

export default function CreateRoutine() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);

  const [routineName, setRoutineName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!programQuery.trim()) return setProgramResults([]);
    fetchPrograms(currentInstituteId, programQuery, setProgramResults, () => {});
  }, [programQuery, currentInstituteId]);

  useEffect(() => {
    if (!selectedProgram || !operationQuery.trim())
      return setOperationResults([]);
    fetchOperations(selectedProgram.id, operationQuery, setOperationResults, () => {});
  }, [operationQuery, selectedProgram]);

  useEffect(() => {
    if (selectedProgram && selectedOperation) {
      setRoutineName(`${selectedProgram.name} ${selectedOperation.name}`);
    }
  }, [selectedProgram, selectedOperation]);

  async function handleCreateRoutine() {
    if (!selectedOperation || !routineName.trim()) return;

    setIsCreating(true);

    const { error } = await supabase.from("routine").insert([
      {
        operation_id: selectedOperation.id,
        name: routineName.trim(),
      },
    ]);

    if (error) {
      console.error("Error creating routine:", error);
    } else {
      alert("Routine created successfully");
      setRoutineName("");
      setSelectedOperation(null);
      setOperationQuery("");
    }

    setIsCreating(false);
  }

  return (
    <div style={{ padding: "20px", width: "100%" }}>
      <h2>Create Routine</h2>

      {/* Program */}
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
            setRoutineName("");
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

      {/* Operation */}
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
              setRoutineName("");
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

      {/* Routine Name */}
      {selectedOperation && (
        <div style={{ maxWidth: "300px", marginBottom: "16px" }}>
          <label>Routine Name:</label>
          <input
            className="form-input"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
          />
        </div>
      )}

      {selectedOperation && (
        <button
          className="primary-btn"
          onClick={handleCreateRoutine}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create Routine"}
        </button>
      )}
    </div>
  );
}