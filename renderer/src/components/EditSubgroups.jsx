import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchGroups } from "../utils/fetch";

export default function EditSubgroups({ subgroupId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [form, setForm] = useState({
    id: "",
    name: "",
    program_id: "",
    group_id: "",
    created_at: "",
  });

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch existing subgroup
  const fetchSubgroup = async () => {
    if (!subgroupId) return;

    const { data, error } = await supabase
      .from("subgroups")
      .select(`
        id,
        name,
        created_at,
        group_id,
        groups (
          id,
          name,
          program_id,
          programs (
            id,
            name
          )
        )
      `)
      .eq("id", subgroupId)
      .single();

    if (error) {
      console.error("Error fetching subgroup:", error);
      return;
    }

    const group = data.groups;
    const program = data.groups?.programs;

    setForm({
      id: data.id,
      name: data.name,
      program_id: program?.id || "",
      group_id: group?.id || "",
      created_at: data.created_at,
    });

    setProgramQuery(program?.name || "");
    setGroupQuery(group?.name || "");
  };

  // Fetch programs
  useEffect(() => {
    if (!currentInstituteId) return;

    if (programQuery.trim() === "") {
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

  // Fetch groups
  useEffect(() => {
    if (groupQuery.trim() === "" || !form.program_id) {
      setGroupResults([]);
      return;
    }

    fetchGroups(
      form.program_id,
      groupQuery,
      setGroupResults,
      setLoadingGroups
    );
  }, [groupQuery, form.program_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("subgroups")
      .update({
        name: form.name,
        group_id: form.group_id,
      })
      .eq("id", form.id);

    if (error) {
      alert("Failed to update subgroup: " + error.message);
    } else {
      showToast("Subgroup updated successfully!");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this subgroup? This may affect related students."
      )
    )
      return;

    const { error } = await supabase
      .from("subgroups")
      .delete()
      .eq("id", form.id);

    if (error) {
      alert("Failed to delete subgroup: " + error.message);
    } else {
      showToast("Subgroup deleted successfully!");
      onCancel();
    }
  };

  useEffect(() => {
    fetchSubgroup();
  }, [subgroupId]);

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit Subgroup</h2>

      <div className="form-field">
        <label>Subgroup ID</label>
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f0f0",
            color: "#555",
            borderRadius: "4px",
            fontWeight: "bold",
            fontSize: "0.9em",
          }}
        >
          {form.id}
        </div>
      </div>

      <div className="form-field">
        <label>Subgroup Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          required
        />
      </div>

      {/* Program */}
      <div className="form-field autocomplete-container">
        <label>Program</label>
        <input
          className="form-input"
          value={programQuery}
          onChange={(e) => {
            setProgramQuery(e.target.value);
            setForm({ ...form, program_id: "", group_id: "" });
            setGroupQuery("");
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
                  setProgramQuery(prog.name);
                  setForm({
                    ...form,
                    program_id: prog.id,
                    group_id: "",
                  });
                  setProgramResults([]);
                  setGroupQuery("");
                }}
              >
                {prog.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group */}
      <div className="form-field autocomplete-container">
        <label>Group</label>
        <input
          className="form-input"
          value={groupQuery}
          onChange={(e) => {
            setGroupQuery(e.target.value);
            setForm({ ...form, group_id: "" });
          }}
          onBlur={() => setTimeout(() => setGroupResults([]), 200)}
          disabled={!form.program_id}
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
            fontWeight: "bold",
          }}
        >
          {userData?.institute_name || currentInstituteId}
        </div>
      </div>

      <div className="form-field">
        <label>Created At</label>
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f0f0",
            color: "#555",
            borderRadius: "4px",
            fontSize: "0.9em",
          }}
        >
          {form.created_at
            ? new Date(form.created_at).toLocaleString()
            : "N/A"}
        </div>
      </div>

      <button type="submit" className="form-submit">
        Save Subgroup
      </button>

      <button
        type="button"
        className="form-cancel"
        onClick={onCancel}
      >
        Cancel
      </button>

      <button
        type="button"
        className="form-submit"
        style={{ backgroundColor: "#dc3545", marginTop: "10px" }}
        onClick={handleDelete}
      >
        Delete Subgroup
      </button>
    </form>
  );
}