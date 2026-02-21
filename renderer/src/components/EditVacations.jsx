import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../utils/toast";
import { fetchPrograms, fetchOperations, fetchDepartments } from "../utils/fetch";

export default function EditVacations({ vacationId, onCancel, onSuccess }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [forType, setForType] = useState("all");

  const [idQuery, setIdQuery] = useState("");
  const [idResults, setIdResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [startDay, setStartDay] = useState("");
  const [endDay, setEndDay] = useState("");
  const [description, setDescription] = useState("");

  // Fetch vacation by ID
  useEffect(() => {
    if (!vacationId) return;

    const fetchVacation = async () => {
      const { data, error } = await supabase
        .from("vacations")
        .select("*")
        .eq("id", vacationId)
        .single();

      if (error) return console.error("Error fetching vacation:", error);

      setForType(data.from_table || "all");
      setStartDay(data.start_day || "");
      setEndDay(data.end_day || "");
      setDescription(data.description || "");

      if (data.from_table === "programs" || data.from_table === "departments") {
        setSelectedId(data.for_users);
        const table = data.from_table === "programs" ? "programs" : "departments";
        const { data: result } = await supabase
          .from(table)
          .select("id, name")
          .eq("id", data.for_users)
          .single();
        setIdQuery(result?.name || "");
      } else if (data.from_table === "operations") {
        const { data: op } = await supabase
          .from("operations")
          .select("id, name, program_id")
          .eq("id", data.for_users)
          .single();
        setSelectedOperation(op);
        setOperationQuery(op?.name || "");

        if (op?.program_id) {
          const { data: prog } = await supabase
            .from("programs")
            .select("id, name")
            .eq("id", op.program_id)
            .single();
          setSelectedProgram(prog);
          setProgramQuery(prog?.name || "");
        }
      }
    };

    fetchVacation();
  }, [vacationId]);

  // Search programs
  useEffect(() => {
    if (forType === "operations" && programQuery.trim() !== "" && currentInstituteId) {
      fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms);
    } else setProgramResults([]);
  }, [programQuery, forType, currentInstituteId]);

  // Search operations
  useEffect(() => {
    if (forType === "operations" && selectedProgram && operationQuery.trim() !== "") {
      fetchOperations(selectedProgram.id, operationQuery, setOperationResults, setLoadingOperations);
    } else setOperationResults([]);
  }, [operationQuery, selectedProgram, forType]);

  // Search programs or departments for ID field
  useEffect(() => {
    if (forType === "programs" && idQuery.trim() !== "" && currentInstituteId) {
      fetchPrograms(currentInstituteId, idQuery, setIdResults, () => {});
    } else if (forType === "departments" && idQuery.trim() !== "" && currentInstituteId) {
      fetchDepartments(currentInstituteId, idQuery, setIdResults, () => {});
    } else {
      setIdResults([]);
    }
  }, [idQuery, forType, currentInstituteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let forUsers = null;
    const fromTable = forType;

    if (forType === "all") forUsers = currentInstituteId;
    else if (forType === "programs" || forType === "departments") forUsers = selectedId;
    else if (forType === "operations") forUsers = selectedOperation?.id;

    if (!forUsers) return alert("Please select a value for Id/Operation");

    const { error } = await supabase
      .from("vacations")
      .update({
        start_day: startDay,
        end_day: endDay,
        description,
        from_table: fromTable,
        for_users: forUsers,
      })
      .eq("id", vacationId);

    if (error) alert("Failed to update vacation: " + error.message);
    else {
      showToast("Vacation updated successfully!");
      onSuccess();
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2 className="form-title">Edit Vacation</h2>

      <div className="form-field">
        <label>For:</label>
        <select
          className="form-select"
          value={forType}
          onChange={(e) => {
            setForType(e.target.value);
            setIdQuery("");
            setSelectedId(null);
            setProgramQuery("");
            setSelectedProgram(null);
            setOperationQuery("");
            setSelectedOperation(null);
          }}
        >
          <option value="all">All</option>
          <option value="programs">Programs</option>
          <option value="departments">Departments</option>
          <option value="operations">Operations</option>
        </select>
      </div>

      {(forType === "programs" || forType === "departments") && (
        <div className="form-field autocomplete-container">
          <label>Name:</label>
          <input
            className="form-input"
            placeholder={`Search ${forType}...`}
            value={idQuery}
            onChange={(e) => {
              setIdQuery(e.target.value);
              setSelectedId(null);
            }}
            onBlur={() => setTimeout(() => setIdResults([]), 200)}
          />
          {idResults.length > 0 && (
            <div className="autocomplete-list">
              {idResults.map((item) => (
                <div
                  key={item.id}
                  className="autocomplete-item"
                  onMouseDown={() => {
                    setIdQuery(item.name);
                    setSelectedId(item.id);
                    setIdResults([]);
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {forType === "operations" && (
        <>
          <div className="form-field autocomplete-container">
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
                      setSelectedOperation(null);
                      setOperationQuery("");
                    }}
                  >
                    {prog.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-field autocomplete-container">
            <label>Operation:</label>
            <input
              className="form-input"
              placeholder="Search operation..."
              value={operationQuery}
              onChange={(e) => {
                setOperationQuery(e.target.value);
                setSelectedOperation(null);
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
        </>
      )}

      <div className="form-field">
        <label>Start Day:</label>
        <input
          type="date"
          className="form-input"
          value={startDay}
          onChange={(e) => setStartDay(e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label>End Day:</label>
        <input
          type="date"
          className="form-input"
          value={endDay}
          onChange={(e) => setEndDay(e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label>Description:</label>
        <textarea
          className="form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <button type="submit" className="form-submit">
        Update Vacation
      </button>
      <button
        type="button"
        className="form-cancel"
        onClick={onCancel}
        style={{ marginLeft: "8px" }}
      >
        Cancel
      </button>
    </form>
  );
}