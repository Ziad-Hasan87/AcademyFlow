import { useEffect, useState } from "react";
import supabase from "../utils/supabase";

export default function CreatePrograms() {
  const [form, setForm] = useState({
    name: "",
    institution_id: "",
    is_active: true,
  });

  const [instituteQuery, setInstituteQuery] = useState("");
  const [institutes, setInstitutes] = useState([]);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);

  /* ----------------------------------
     Institution search (autocomplete)
  ---------------------------------- */
  useEffect(() => {
    if (instituteQuery.length < 2) {
      setInstitutes([]);
      return;
    }

    const fetchInstitutes = async () => {
      setLoadingInstitutes(true);

      const { data, error } = await supabase
        .from("institutes")
        .select("id, name")
        .ilike("name", `%${instituteQuery}%`)
        .limit(10);

      if (!error) setInstitutes(data || []);
      setLoadingInstitutes(false);
    };

    fetchInstitutes();
  }, [instituteQuery]);

  /* ----------------------------------
     Submit handler
  ---------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("programs").insert([
      {
        name: form.name,
        institution_id: form.institution_id,
        is_active: form.is_active,
      },
    ]);

    if (error) {
      alert(`Failed to create program: ${error.message}`);
      return;
    }

    alert("Program created successfully");
    setForm({ name: "", institution_id: "", is_active: true });
    setInstituteQuery("");
    setInstitutes([]);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Program</h2>

      <div className="form-field">
        <label>Program Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="form-field">
        <label>Institution</label>

        <input
          className="form-input"
          placeholder="Search institution"
          value={instituteQuery}
          onChange={(e) => setInstituteQuery(e.target.value)}
        />

        {institutes.length > 0 && (
          <ul className="autocomplete-list">
            {institutes.map((inst) => (
              <li
                key={inst.id}
                className="autocomplete-item"
                onClick={() => {
                  setForm({ ...form, institution_id: inst.id });
                  setInstituteQuery(inst.name);
                  setInstitutes([]);
                }}
              >
                {inst.name}
              </li>
            ))}
          </ul>
        )}

        {loadingInstitutes && (
          <div className="autocomplete-loading">Searching…</div>
        )}
      </div>

      <button type="submit" className="form-submit">
        Create Program
      </button>
    </form>
  );
}
