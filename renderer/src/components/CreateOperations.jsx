import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";

export default function CreateOperations() {
  const [form, setForm] = useState({
    name: "",
    program_id: "",
    status: "active",
  });

  const [programQuery, setProgramQuery] = useState("");
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  /* ----------------------------------
     Program search (autocomplete)
  ---------------------------------- */
  useEffect(() => {
    if (programQuery.trim() === "") {
      setPrograms([]);
      return;
    }

    const fetchPrograms = async () => {
      setLoadingPrograms(true);

      const currentInstituteId = localStorage.getItem("institute_id");
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, departments(name)")
        .eq("institution_id", currentInstituteId)
        .eq("is_active", true)
        .ilike("name", `%${programQuery}%`);

      if (error) {
        console.error("Error fetching programs:", error);
      } else {
        setPrograms(data || []);
      }
      setLoadingPrograms(false);
    };

    fetchPrograms();
  }, [programQuery]);

  /* ----------------------------------
     Submit handler
  ---------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("operations").insert([
      {
        name: form.name,
        program_id: form.program_id,
        status: form.status,
      },
    ]);

    if (error) {
      alert(`Failed to create operation: ${error.message}`);
      return;
    }

    showToast("Operation created successfully");
    setForm({ name: "", program_id: "", status: "active" });
    setProgramQuery("");
    setPrograms([]);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Operation (Semester)</h2>

      <div className="form-field">
        <label>Operation Name</label>
        <input
          className="form-input"
          placeholder="Fall 2025"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            setForm({ ...form, program_id: "" });
          }}
          placeholder="Type program name..."
          required
        />

        {loadingPrograms && (
          <div className="autocomplete-loading">Searching...</div>
        )}

        {programs.length > 0 && (
          <div className="autocomplete-list">
            {programs.map((prog) => (
              <div
                key={prog.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setProgramQuery(prog.name);
                  setForm({ ...form, program_id: prog.id });
                  setPrograms([]);
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

      <div className="form-field">
        <label>Status</label>
        <select
          className="form-select"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
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
          {localStorage.getItem("institute_name") || localStorage.getItem("institute_id")}
        </div>
      </div>

      <button type="submit" className="form-submit">
        Create Operation
      </button>
    </form>
  );
}
