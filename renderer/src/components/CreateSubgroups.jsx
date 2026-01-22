import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";

export default function CreateSubgroups() {
  const currentInstituteId = localStorage.getItem("institute_id");
  const [form, setForm] = useState({
    name: "",
    group_id: "",
  });

  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch groups for autocomplete
  useEffect(() => {
    if (groupQuery.trim() === "") {
      setGroupResults([]);
      return;
    }

    const fetchGroups = async () => {
      setLoadingGroups(true);
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, programs(name, institution_id)")
        .eq("programs.institution_id", currentInstituteId)
        .ilike("name", `%${groupQuery}%`);

      if (error) {
        console.error("Error fetching groups:", error);
      } else {
        setGroupResults(data);
      }
      setLoadingGroups(false);
    };

    fetchGroups();
  }, [groupQuery, currentInstituteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("subgroups").insert([
      {
        name: form.name,
        group_id: form.group_id,
      },
    ]);

    if (error) {
      alert(`Failed to create subgroup: ${error.message}`);
      return;
    }

    showToast("Subgroup created successfully");
    setForm({ name: "", group_id: "" });
    setGroupQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Subgroup</h2>

      <div className="form-field">
        <label>Subgroup Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter subgroup name..."
          required
        />
      </div>

      <div className="form-field autocomplete-container">
        <label>Group</label>
        <input
          className="form-input"
          value={groupQuery}
          onChange={(e) => {
            setGroupQuery(e.target.value);
            setForm({ ...form, group_id: "" });
          }}
          placeholder="Type group name..."
          required
        />

        {loadingGroups && (
          <div className="autocomplete-loading">Searching...</div>
        )}

        {groupResults.length > 0 && (
          <div className="autocomplete-list">
            {groupResults.map((grp) => (
              <div
                key={grp.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setGroupQuery(grp.name);
                  setForm({ ...form, group_id: grp.id });
                  setGroupResults([]);
                }}
              >
                {grp.name}
                {grp.programs?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
                    {" "}
                    ({grp.programs.name})
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
        Create Subgroup
      </button>
    </form>
  );
}
