import { useState, useEffect } from "react";
import { createUser } from "../utils/authentication";
import { ROLES } from "../utils/types";
import { MdOutlineEmail } from "react-icons/md";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";

export default function CreateUserForm() {
  const { userData } = useAuth();
  // Get current user's institute from context
  const currentInstituteId = userData?.institute_id;

  const [form, setForm] = useState({
    name: "",
    role: "",
    institute_id: currentInstituteId || "",
    password: "",
    email: "",
  });

  // Student-specific fields
  const [studentInfo, setStudentInfo] = useState({
    program_id: "",
    is_representative: false,
    operation_id: "",
    roll_no: "",
    group_id: "",
    subgroup_id: "",
  });

  // Autocomplete states
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);

  // Dropdown states
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);

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

  // Fetch operations for autocomplete based on selected program
  useEffect(() => {
    if (operationQuery.trim() === "" || !studentInfo.program_id) {
      setOperationResults([]);
      return;
    }

    const fetchOperations = async () => {
      setLoadingOperations(true);
      const { data, error } = await supabase
        .from("operations")
        .select("id, name, status")
        .eq("program_id", studentInfo.program_id)
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
  }, [operationQuery, studentInfo.program_id]);

  // Fetch groups when program is selected
  useEffect(() => {
    if (!studentInfo.program_id) {
      setGroups([]);
      return;
    }

    const fetchGroups = async () => {
      setLoadingGroups(true);
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("program_id", studentInfo.program_id)
        .order("name");

      if (error) {
        console.error("Error fetching groups:", error);
      } else {
        setGroups(data || []);
      }
      setLoadingGroups(false);
    };

    fetchGroups();
  }, [studentInfo.program_id]);

  // Fetch subgroups when group is selected
  useEffect(() => {
    if (!studentInfo.group_id) {
      setSubgroups([]);
      return;
    }

    const fetchSubgroups = async () => {
      setLoadingSubgroups(true);
      const { data, error } = await supabase
        .from("subgroups")
        .select("id, name")
        .eq("group_id", studentInfo.group_id)
        .order("name");

      if (error) {
        console.error("Error fetching subgroups:", error);
      } else {
        setSubgroups(data || []);
      }
      setLoadingSubgroups(false);
    };

    fetchSubgroups();
  }, [studentInfo.group_id]);

  /* ----------------------------------
     Submit handler
  ---------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.institute_id) {
      alert("Current user's institute not found. Cannot create user.");
      return;
    }

    try {
      // Create user
      const user = await createUser({
        email: form.email,
        password: form.password,
        role: form.role,
        institute_id: form.institute_id,
        name: form.name,
      });

      // If role is Student, insert into student table
      if (form.role === "Student") {
        const { error: studentError } = await supabase
          .from("students")
          .insert([
            {
              id: user.id,
              program_id: studentInfo.program_id,
              is_representative: studentInfo.is_representative,
              operation_id: studentInfo.operation_id,
              roll_no: studentInfo.roll_no,
              group_id: studentInfo.group_id || null,
              subgroup_id: studentInfo.subgroup_id || null,
            },
          ]);

        if (studentError) {
          console.error(studentError);
          alert("User created, but student info failed");
          return;
        }
      }

      showToast("User created successfully");

      // Reset form
      setForm({ name: "", role: "", institute_id: currentInstituteId, password: "", email: "" });
      setStudentInfo({
        program_id: "",
        is_representative: false,
        operation_id: "",
        roll_no: "",
        group_id: "",
        subgroup_id: "",
      });
      setProgramQuery("");
      setOperationQuery("");
    } catch (error) {
      console.error(error);
      alert(`Failed to create user: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create User</h2>

      {/* Email */}
      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          className="form-input"
          placeholder="Enter full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="form-field">
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap:5}}>
          <MdOutlineEmail />
          <span>E-mail</span>
        </div>
        <input
          id="email"
          type="text"
          className="form-input"
          placeholder="Leave blank for auto-generated"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      {/* Role */}
      <div className="form-field">
        <label htmlFor="role">Role</label>
        <select
          id="role"
          className="form-select"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          required
        >
          <option value="">Select role</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Display current institute */}
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

      {/* Password */}
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="form-input"
          placeholder="Enter password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>

      {/* Student-only fields */}
      {form.role === "Student" && (
        <div className="form-group-box">
          <h3 className="form-section-title">Student Details</h3>

          <div className="form-field autocomplete-container">
            <label>Program</label>
            <input
              className="form-input"
              value={programQuery}
              onChange={(e) => {
                setProgramQuery(e.target.value);
                setStudentInfo({
                  ...studentInfo,
                  program_id: "",
                  operation_id: "",
                  group_id: "",
                  subgroup_id: "",
                });
                setOperationQuery("");
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
                    onMouseDown={() => {
                      setProgramQuery(prog.name);
                      setStudentInfo({
                        ...studentInfo,
                        program_id: prog.id,
                        operation_id: "",
                        group_id: "",
                        subgroup_id: "",
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
                setStudentInfo({ ...studentInfo, operation_id: "" });
              }}
              onBlur={() => {
                setTimeout(() => setOperationResults([]), 200);
              }}
              placeholder="Type operation name..."
              disabled={!studentInfo.program_id}
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
                    onMouseDown={() => {
                      setOperationQuery(op.name);
                      setStudentInfo({ ...studentInfo, operation_id: op.id });
                      setOperationResults([]);
                    }}
                  >
                    {op.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-field">
            <label>Roll Number</label>
            <input
              className="form-input"
              value={studentInfo.roll_no}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, roll_no: e.target.value })
              }
              placeholder="Enter roll number..."
              required
            />
          </div>

          <div className="form-field">
            <label>Class Representative</label>
            <select
              className="form-select"
              value={studentInfo.is_representative ? "yes" : "no"}
              onChange={(e) =>
                setStudentInfo({
                  ...studentInfo,
                  is_representative: e.target.value === "yes",
                })
              }
              required
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div className="form-field">
            <label>Group (Optional)</label>
            <select
              className="form-select"
              value={studentInfo.group_id}
              onChange={(e) => {
                setStudentInfo({
                  ...studentInfo,
                  group_id: e.target.value,
                  subgroup_id: "",
                });
              }}
              disabled={!studentInfo.program_id || loadingGroups}
            >
              <option value="">Select a group</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Subgroup (Optional)</label>
            <select
              className="form-select"
              value={studentInfo.subgroup_id}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, subgroup_id: e.target.value })
              }
              disabled={!studentInfo.group_id || loadingSubgroups}
            >
              <option value="">Select a subgroup</option>
              {subgroups.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button type="submit" className="form-submit">
        Create User
      </button>
    </form>
  );
}
