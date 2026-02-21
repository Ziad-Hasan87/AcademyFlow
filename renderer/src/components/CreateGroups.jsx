import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms } from "../utils/fetch";

export default function CreateGroups() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [form, setForm] = useState({
    name: "",
    program_id: "",
  });

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Fetch programs for autocomplete
  useEffect(() => {
    if (programQuery.trim() === "") {
      setProgramResults([]);
      return;
    }

    fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms);
  }, [programQuery, currentInstituteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("groups").insert([
      {
        name: form.name,
        program_id: form.program_id,
      },
    ]);

    if (error) {
      alert(`Failed to create group: ${error.message}`);
      return;
    }

    showToast("Group created successfully");
    setForm({ name: "", program_id: "" });
    setProgramQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Group</h2>

      <div className="form-field">
        <label>Group Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter group name..."
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
          onBlur={() => {
            setTimeout(() => setProgramResults([]), 200);
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
                  setForm({ ...form, program_id: prog.id });
                  setProgramResults([]);
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
          {userData?.institute_name || currentInstituteId}
        </div>
      </div>

      <button type="submit" className="form-submit">
        Create Group
      </button>
    </form>
  );
}
