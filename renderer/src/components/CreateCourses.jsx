import { useEffect, useState } from "react";
import supabase from "../utils/supabase";

export default function CreateCourses() {
  const currentInstituteId = localStorage.getItem("institute_id");
  const [form, setForm] = useState({
    name: "",
    program_id: "",
    operation_id: "",
  });

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);

  // Fetch programs for autocomplete
  useEffect(() => {
    if (programQuery.trim() === "") {
      setProgramResults([]);
      return;
    }

    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, departments(name)")
        .eq("institution_id", currentInstituteId)
        .eq("is_active", true)
        .ilike("name", `%${programQuery}%`);

      if (error) {
        console.error("Error fetching programs:", error);
      } else {
        setProgramResults(data);
      }
      setLoadingPrograms(false);
    };

    fetchPrograms();
  }, [programQuery, currentInstituteId]);

  // Fetch operations for autocomplete based on selected program
  useEffect(() => {
    if (operationQuery.trim() === "" || !form.program_id) {
      setOperationResults([]);
      return;
    }

    const fetchOperations = async () => {
      setLoadingOperations(true);
      const { data, error } = await supabase
        .from("operations")
        .select("id, name, status")
        .eq("program_id", form.program_id)
        .eq("status", "active")
        .ilike("name", `%${operationQuery}%`);

      if (error) {
        console.error("Error fetching operations:", error);
      } else {
        setOperationResults(data);
      }
      setLoadingOperations(false);
    };

    fetchOperations();
  }, [operationQuery, form.program_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("courses").insert([
      {
        name: form.name,
        operation_id: form.operation_id,
      },
    ]);

    if (error) {
      alert(`Failed to create course: ${error.message}`);
      return;
    }

    alert("Course created successfully");
    setForm({ name: "", program_id: "", operation_id: "" });
    setProgramQuery("");
    setOperationQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Course</h2>

      <div className="form-field">
        <label>Course Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter course name..."
          required
        />
      </div>

      <div className="form-field autocomplete-container">
        <label>Program</label>
        <input
          className="form-input"
          value={programQuery}
          onChange={(e) => {
            setProgramQuery(e.target.value);
            setForm({ ...form, program_id: "", operation_id: "" });
            setOperationQuery("");
          }}
          placeholder="Type program name..."
          required
        />

        {loadingPrograms && (
          <div className="autocomplete-loading">Searching...</div>
        )}

        {programResults.length > 0 && (
          <div className="autocomplete-list">
            {programResults.map((prog) => (
              <div
                key={prog.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setProgramQuery(prog.name);
                  setForm({ ...form, program_id: prog.id, operation_id: "" });
                  setProgramResults([]);
                  setOperationQuery("");
                }}
              >
                {prog.name}
                {prog.departments?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
                    {" "}
                    ({prog.departments.name})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-field autocomplete-container">
        <label>Operation</label>
        <input
          className="form-input"
          value={operationQuery}
          onChange={(e) => {
            setOperationQuery(e.target.value);
            setForm({ ...form, operation_id: "" });
          }}
          placeholder="Type operation name..."
          disabled={!form.program_id}
          required
        />

        {loadingOperations && (
          <div className="autocomplete-loading">Searching...</div>
        )}

        {operationResults.length > 0 && (
          <div className="autocomplete-list">
            {operationResults.map((op) => (
              <div
                key={op.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setOperationQuery(op.name);
                  setForm({ ...form, operation_id: op.id });
                  setOperationResults([]);
                }}
              >
                {op.name}
                {op.programs?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
                    {" "}
                    ({op.programs.name})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-field">
        <label>Institute</label>
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f0f0",
            color: "#555",
            borderRadius: "4px",
            fontStyle: "bold",
          }}
        >
          {localStorage.getItem("institute_name") || currentInstituteId}
        </div>
      </div>

      <button type="submit" className="form-submit">
        Create Course
      </button>
    </form>
  );
}
