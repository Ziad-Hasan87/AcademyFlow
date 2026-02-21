import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchGroups } from "../utils/fetch";

export default function CreateSubgroups() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [form, setForm] = useState({
    name: "",
    group_id: "",
  });

  /* ================= PROGRAM SEARCH ================= */
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  /* ================= GROUP DROPDOWN ================= */
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  /* ===== Fetch programs when searching ===== */
  useEffect(() => {
    if (!programQuery.trim()) {
      setProgramResults([]);
      return;
    }

    fetchPrograms(
      currentInstituteId,
      programQuery,
      setProgramResults,
      setLoadingPrograms
    );
  }, [programQuery, currentInstituteId]);

  /* ===== Fetch groups when program selected ===== */
  useEffect(() => {
    if (!selectedProgram) {
      setGroups([]);
      setForm({ ...form, group_id: "" });
      return;
    }

    fetchGroups(
      selectedProgram.id,
      "",
      setGroups,
      setLoadingGroups
    );
  }, [selectedProgram]);

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.group_id) {
      showToast("Please select a group", "error");
      return;
    }

    const { error } = await supabase.from("subgroups").insert([
      {
        name: form.name,
        group_id: form.group_id,
      },
    ]);

    if (error) {
      showToast(`Failed to create subgroup: ${error.message}`, "error");
      return;
    }

    showToast("Subgroup created successfully");

    setForm({ name: "", group_id: "" });
    setProgramQuery("");
    setSelectedProgram(null);
    setGroups([]);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Subgroup</h2>

      {/* ================= PROGRAM ================= */}
      <div className="form-field autocomplete-container">
        <label>Program</label>
        <input
          className="form-input"
          placeholder="Search program..."
          value={programQuery}
          onChange={(e) => {
            setProgramQuery(e.target.value);
            setSelectedProgram(null);
            setGroups([]);
            setForm({ ...form, group_id: "" });
          }}
          onBlur={() => setTimeout(() => setProgramResults([]), 200)}
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
                  setSelectedProgram(prog);
                  setProgramQuery(prog.name);
                  setProgramResults([]);
                }}
              >
                {prog.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= GROUP ================= */}
      {selectedProgram && (
        <div className="form-field">
          <label>Group</label>
          <select
            className="form-select"
            value={form.group_id}
            onChange={(e) =>
              setForm({ ...form, group_id: e.target.value })
            }
            required
          >
            <option value="">Select group</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ================= SUBGROUP NAME ================= */}
      <div className="form-field">
        <label>Subgroup Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          placeholder="Enter subgroup name..."
          required
        />
      </div>

      {/* ================= INSTITUTE ================= */}
      <div className="form-field">
        <label>Institute</label>
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f0f0",
            color: "#555",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {userData?.institute_name || currentInstituteId}
        </div>
      </div>

      <button type="submit" className="form-submit">
        Create Subgroup
      </button>
    </form>
  );
}