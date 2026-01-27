import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";

export default function EditGroups({ groupId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    program_id: "",
    created_at: "",
  });

  // Fetch group by ID
  const fetchGroup = async () => {
    if (!groupId) return;

    const { data, error } = await supabase
      .from("groups")
      .select(`
        id,
        name,
        program_id,
        created_at,
        programs ( name )
      `)
      .eq("id", groupId)
      .single();

    if (error) {
      console.error("Error fetching group:", error);
      return;
    }

    setForm({
      id: data.id,
      name: data.name,
      program_id: data.program_id,
      created_at: data.created_at,
    });

    setProgramQuery(data.programs?.name || "");
  };

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

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("groups")
      .update({
        name: form.name,
        program_id: form.program_id,
      })
      .eq("id", form.id);

    if (error) {
      alert("Failed to update group: " + error.message);
    } else {
      showToast("Group updated successfully!");
    }
  };

  // Delete group
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this group? This may affect related subgroups and students.")) {
      return;
    }

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", form.id);

    if (error) {
      alert("Failed to delete group: " + error.message);
    } else {
      showToast("Group deleted successfully!");
      onCancel();
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit Group</h2>

      <div className="form-field">
        <label>Group ID</label>
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  setProgramQuery(prog.name);
                  setForm((prev) => ({
                    ...prev,
                    program_id: prog.id,
                  }));
                  setProgramResults([]);
                }}
              >
                {prog.name}{" "}
                {prog.departments?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
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
        Save Group
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
        Delete Group
      </button>
    </form>
  );
}
