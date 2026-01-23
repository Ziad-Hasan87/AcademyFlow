import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";

export default function EditSubgroups({ subgroupId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    group_id: "",
    created_at: "",
  });

  // Fetch subgroup by ID
  const fetchSubgroup = async () => {
    if (!subgroupId) return;

    const { data, error } = await supabase
      .from("subgroups")
      .select(`
        id,
        name,
        group_id,
        created_at,
        groups ( name )
      `)
      .eq("id", subgroupId)
      .single();

    if (error) {
      console.error("Error fetching subgroup:", error);
      return;
    }

    setForm({
      id: data.id,
      name: data.name,
      group_id: data.group_id,
      created_at: data.created_at,
    });

    setGroupQuery(data.groups?.name || "");
  };

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

  // Submit update
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

  // Delete subgroup
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subgroup? This may affect related students.")) {
      return;
    }

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
            fontStyle: "bold",
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  setGroupQuery(grp.name);
                  setForm((prev) => ({
                    ...prev,
                    group_id: grp.id,
                  }));
                  setGroupResults([]);
                }}
              >
                {grp.name}{" "}
                {grp.programs?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
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
      <button type="button" className="form-cancel" onClick={onCancel}>
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
