import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";

export default function CreatePrograms() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  const [form, setForm] = useState({
    name: "",
    institution_id: currentInstituteId ||  "",
    is_active: true,
    department_id: "",
  });

  const [deptQuery, setDeptQuery] = useState("");
  const [deptResults, setDeptResults] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  useEffect(() => {
    if (deptQuery.trim() === "") {
      setDeptResults([]);
      return;
    }
    const fetchDepartments = async () => {
      setLoadingDepts(true);
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("institute_id", currentInstituteId)
        .ilike("name", `%${deptQuery}%`);

      if (error) {
        console.error("Error fetching departments:", error);
      } else {
        setDeptResults(data);
      }
      setLoadingDepts(false);
    };

    fetchDepartments();
  }, [deptQuery, currentInstituteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("programs").insert([
      {
        name: form.name,
        institution_id: form.institution_id,
        is_active: form.is_active,
        department_id: form.department_id,
      },
    ]);

    if (error) {
      alert(`Failed to create program: ${error.message}`);
      return;
    }

    showToast("Program created successfully");
    setForm({ name: "", institution_id: "", is_active: true });
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

        {loadingDepts && (
          <div className="autocomplete-loading">Searching...</div>
        )}

        {deptResults.length > 0 && (
          <div className="autocomplete-list">
            {deptResults.map((dept) => (
              <div
                key={dept.id}
                className="autocomplete-item"
                onMouseDown={() => {
                  setDeptQuery(dept.name);
                  setForm({ ...form, department_id: dept.id });
                  setDeptResults([]);
                }}
              >
                {dept.name}
                <span style={{ color: "#999", fontSize: "12px" }}>
                  {" "}
                  ({dept.code})
                </span>
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
              {userData?.institute_name || form.institute_id}
          </div>
      </div>

      <button type="submit" className="form-submit">
        Create Program
      </button>
    </form>
  );
}
