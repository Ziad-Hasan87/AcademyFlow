import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../utils/toast";

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

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);

  const [startDay, setStartDay] = useState("");
  const [endDay, setEndDay] = useState("");
  const [description, setDescription] = useState("");

  /** Fetch vacation by ID **/
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

      // populate selectedId / program / operation
      if (data.from_table === "programs" || data.from_table === "departments") {
        setSelectedId(data.for_users);
        const table = data.from_table === "programs" ? "programs" : "departments";
        const { data: results } = await supabase
          .from(table)
          .select("id, name")
          .eq("id", data.for_users)
          .single();
        setIdQuery(results?.name || "");
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

  /** SEARCH PROGRAMS **/
  useEffect(() => {
    if (forType === "operations" && programQuery.trim() !== "") {
      supabase
        .from("programs")
        .select("id, name")
        .eq("institution_id", currentInstituteId)
        .ilike("name", `%${programQuery}%`)
        .then(({ data }) => setProgramResults(data || []));
    } else setProgramResults([]);
  }, [programQuery, forType, currentInstituteId]);

  /** SEARCH OPERATIONS **/
  useEffect(() => {
    if (forType === "operations" && selectedProgram && operationQuery.trim() !== "") {
      supabase
        .from("operations")
        .select("id, name")
        .eq("program_id", selectedProgram.id)
        .ilike("name", `%${operationQuery}%`)
        .then(({ data }) => setOperationResults(data || []));
    } else setOperationResults([]);
  }, [operationQuery, selectedProgram, forType]);
  // SEARCH DEPARTMENTS / PROGRAMS FOR ID FIELD
useEffect(() => {
  if (forType === "programs" && idQuery.trim() !== "") {
    supabase
      .from("programs")
      .select("id, name")
      .eq("institution_id", currentInstituteId)
      .ilike("name", `%${idQuery}%`)
      .then(({ data }) => setIdResults(data || []));
  } 
  else if (forType === "departments" && idQuery.trim() !== "") {
    supabase
      .from("departments")
      .select("id, name")
      .eq("institute_id", currentInstituteId)  // Corrected: use institute_id
      .ilike("name", `%${idQuery}%`)
      .then(({ data }) => setIdResults(data || []));
  } 
  else {
    setIdResults([]);
  }
}, [idQuery, forType, currentInstituteId]);


  /** Submit update **/
  const handleSubmit = async (e) => {
    e.preventDefault();

    let forUsers = null;
    let fromTable = forType;

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

    if (error) {
      alert("Failed to update vacation: " + error.message);
    } else {
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

      {/* Program/Department search */}
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

      {/* Operations: program → operation selection */}
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
