import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";

export default function EditCourses({ courseId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    operation_id: "",
    created_at: "",
  });

  // Fetch course by ID
  const fetchCourse = async () => {
    if (!courseId) return;

    const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        name,
        created_at,
        operation_id,
        operations ( name )
      `)
      .eq("id", courseId)
      .single();

    if (error) {
      console.error("Error fetching course:", error);
      return;
    }

    setForm({
      id: data.id,
      name: data.name,
      operation_id: data.operation_id,
      created_at: data.created_at,
    });

    setOperationQuery(data.operations?.name || "");
  };

  // Fetch operations for autocomplete
  useEffect(() => {
    if (operationQuery.trim() === "") {
      setOperationResults([]);
      return;
    }

    const fetchOperations = async () => {
      setLoadingOperations(true);
      const { data, error } = await supabase
        .from("operations")
        .select("id, name, status, programs(name, institution_id)")
        .eq("programs.institution_id", currentInstituteId)
        .eq("status", "active")
        .ilike("name", `%${operationQuery}%`);

      if (error) {
        console.error("Error fetching operations:", error);
      } else {
        setOperationResults(data);
      }
      setLoadingOperations(false);
    };

    fetchOperations();
  }, [operationQuery, currentInstituteId]);

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("courses")
      .update({
        name: form.name,
        operation_id: form.operation_id,
      })
      .eq("id", form.id);

    if (error) {
      alert("Failed to update course: " + error.message);
    } else {
      showToast("Course updated successfully!");
    }
  };

  // Delete course
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course?")) {
      return;
    }

    const { error } = await supabase.from("courses").delete().eq("id", form.id);

    if (error) {
      alert("Failed to delete course: " + error.message);
    } else {
      showToast("Course deleted successfully!");
      onCancel();
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit Course</h2>

      <div className="form-field">
        <label>Course ID</label>
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
        <label>Course Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter course name..."
          required
        />
      </div>

      <div className="form-field autocomplete-container">
        <label>Operation</label>
        <input
          className="form-input"
          value={operationQuery}
          onChange={(e) => {
            setOperationQuery(e.target.value);
            setForm({ ...form, operation_id: "" });
          }}
          placeholder="Type operation name..."
          required
        />

        {loadingOperations && (
          <div className="autocomplete-loading">Searching...</div>
        )}

        {operationResults.length > 0 && (
          <div className="autocomplete-list">
            {operationResults.map((op) => (
              <div
                key={op.id}
                className="autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOperationQuery(op.name);
                  setForm((prev) => ({
                    ...prev,
                    operation_id: op.id,
                  }));
                  setOperationResults([]);
                }}
              >
                {op.name}
                {op.programs?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
                    {" "}
                    ({op.programs.name})
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
        Save Course
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
        Delete Course
      </button>
    </form>
  );
}
