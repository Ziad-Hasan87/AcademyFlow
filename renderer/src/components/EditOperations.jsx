import { useEffect, useState } from "react";

import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms } from "../utils/fetch";

export default function EditOperations({ operationId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    program_id: "",
    status: "active",
    created_at: "",
  });

  // Fetch operation by ID
  const fetchOperation = async () => {
    if (!operationId) return;

    const { data, error } = await supabase
      .from("operations")
      .select(`
        id,
        name,
        program_id,
        status,
        created_at,
        programs ( name )
      `)
      .eq("id", operationId)
      .single();

    if (error) {
      console.error("Error fetching operation:", error);
      return;
    }

    setForm({
      id: data.id,
      name: data.name,
      program_id: data.program_id,
      status: data.status,
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

    fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms);
  }, [programQuery, currentInstituteId]);

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("operations")
      .update({
        name: form.name,
        program_id: form.program_id,
        status: form.status,
      })
      .eq("id", form.id);

    if (error) {
      alert("Failed to update operation: " + error.message);
    } else {
      showToast("Operation updated successfully!");
    }
  };

  // Delete operation
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this operation? This may affect related courses and other data.")) {
      return;
    }

    const { error } = await supabase
      .from("operations")
      .delete()
      .eq("id", form.id);

    if (error) {
      alert("Failed to delete operation: " + error.message);
    } else {
      showToast("Operation deleted successfully!");
      onCancel();
    }
  };

  useEffect(() => {
    fetchOperation();
  }, [operationId]);

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit Operation</h2>

      <div className="form-field">
        <label>Operation ID</label>
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
        <label>Operation Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Fall 2025"
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
        Save Operation
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
        Delete Operation
      </button>
    </form>
  );
}
