import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchOperations, fetchPrograms } from "../utils/fetch";

export default function EditCourses({ courseId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [form, setForm] = useState({
    id: "",
    name: "",
    program_id: "",
    operation_id: "",
    created_at: "",
  });

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const fetchCourse = async () => {
    if (!courseId) return;

    const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        name,
        created_at,
        operation_id,
        operations (
          id,
          name,
          program_id,
          programs ( id, name )
        )
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
      program_id: data.operations?.program_id || "",
      operation_id: data.operation_id,
      created_at: data.created_at,
    });

    setProgramQuery(data.operations?.programs?.name || "");
    setOperationQuery(data.operations?.name || "");
  };

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

  useEffect(() => {
    if (operationQuery.trim() === "" || !form.program_id) {
      setOperationResults([]);
      return;
    }

    fetchOperations(
      form.program_id,
      operationQuery,
      setOperationResults,
      setLoadingOperations
    );
  }, [operationQuery, form.program_id]);

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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", form.id);

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
            fontWeight: "bold",
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
            setForm({ ...form, program_id: "", operation_id: "" });
            setOperationQuery("");
          }}
          onBlur={() => {
            setTimeout(() => setProgramResults([]), 200);
          }}
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
                    operation_id: "",
                  });
                  setProgramResults([]);
                  setOperationQuery("");
                }}
              >
                {prog.name}
                {prog.departments?.name && (
                  <span style={{ color: "#999", fontSize: "12px" }}>
                    {" "}
                    ({prog.departments.name})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
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
          onBlur={() => {
            setTimeout(() => setOperationResults([]), 200);
          }}
          disabled={!form.program_id}
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
                  setForm({ ...form, operation_id: op.id });
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