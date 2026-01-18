import { useEffect, useState } from "react";
import supabase from "../utils/supabase";

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
    if (programQuery.length < 2) {
      setPrograms([]);
      return;
    }

    const fetchPrograms = async () => {
      setLoadingPrograms(true);

      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .ilike("name", `%${programQuery}%`)
        .limit(10);

      if (!error) setPrograms(data || []);
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

    alert("Operation created successfully");
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

      <div className="form-field">
        <label>Program</label>

        <input
          className="form-input"
          placeholder="Search program"
          value={programQuery}
          onChange={(e) => setProgramQuery(e.target.value)}
        />

        {programs.length > 0 && (
          <ul className="autocomplete-list">
            {programs.map((prog) => (
              <li
                key={prog.id}
                className="autocomplete-item"
                onClick={() => {
                  setForm({ ...form, program_id: prog.id });
                  setProgramQuery(prog.name);
                  setPrograms([]);
                }}
              >
                {prog.name}
              </li>
            ))}
          </ul>
        )}

        {loadingPrograms && (
          <div className="autocomplete-loading">Searching…</div>
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

      <button type="submit" className="form-submit">
        Create Operation
      </button>
    </form>
  );
}
