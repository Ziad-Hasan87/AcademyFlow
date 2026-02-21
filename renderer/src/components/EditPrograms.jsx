import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchDepartments } from "../utils/fetch";

export default function EditPrograms({ programId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [deptQuery, setDeptQuery] = useState("");
  const [deptResults, setDeptResults] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    institution_id: currentInstituteId || "",
    is_active: true,
    department_name: "",
    department_id: "",
  });

  const fetchProgram = async () => {
    if (!programId) return;

    const { data, error } = await supabase
      .from("programs")
      .select(`
        id,
        name,
        institution_id,
        is_active,
        department_id,
        departments ( name )
      `)
      .eq("id", programId)
      .single();

    if (error) {
      console.error("Error fetching program:", error);
      return;
    }

    setForm({
      id: data.id,
      name: data.name,
      institution_id: data.institution_id,
      is_active: data.is_active,
      department_id: data.department_id,
    });

    setDeptQuery(data.departments?.name || "");
  };

  useEffect(() => {
    if (deptQuery.trim() === "") {
      setDeptResults([]);
      return;
    }

    fetchDepartments(currentInstituteId, deptQuery, setDeptResults, setLoadingDepts);
  }, [deptQuery, currentInstituteId]);

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("programs")
      .update({
        name: form.name,
        institution_id: form.institution_id,
        is_active: form.is_active,
        department_id: form.department_id,
      })
      .eq("id", form.id);

    if (error) {
      alert("Failed to update program: " + error.message);
    } else {
      showToast("Program updated successfully!");
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [programId]);

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit Program</h2>

      <div className="form-field">
        <label>Program ID</label>
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f0f0",
            color: "#555",
            borderRadius: "4px",
            fontStyle: "bold",
          }}
        >
          {form.id}
        </div>

        <label>Program Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="form-field autocomplete-container">
        <label>Department</label>
        <input
          className="form-input"
          value={deptQuery}
          onChange={(e) => {
            setDeptQuery(e.target.value);
            setForm({ ...form, department_id: "" });
          }}
          onBlur={() => {
            setTimeout(() => setDeptResults([]), 200);
          }}
          placeholder="Type department name..."
          required
        />

        {loadingDepts && <div className="autocomplete-loading">Searching...</div>}

        {deptResults.length > 0 && (
          <div className="autocomplete-list">
            {deptResults.map((dept) => (
              <div
                key={dept.id}
                className="autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  setDeptQuery(dept.name);
                  setForm((prev) => ({
                    ...prev,
                    department_id: dept.id,
                  }));
                  setDeptResults([]);
                }}
              >
                {dept.name}{" "}
                <span style={{ color: "#999", fontSize: "12px" }}>
                  ({dept.code})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-field">
        <label>Program Status</label>
        <select
          className="form-select"
          value={form.is_active ? "active" : "inactive"}
          onChange={(e) =>
            setForm({ ...form, is_active: e.target.value === "active" })
          }
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
          {userData?.institute_name || form.institution_id}
        </div>
      </div>

      <button type="submit" className="form-submit">
        Save Program
      </button>
      <button type="button" className="form-cancel" onClick={onCancel}>
          Cancel
      </button>
    </form>
  );
}
