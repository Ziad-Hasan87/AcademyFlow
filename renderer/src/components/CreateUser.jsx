import { useState, useEffect } from "react";
import { createUser } from "../utils/authentication";
import { ROLES } from "../utils/types";
import { MdOutlineEmail } from "react-icons/md";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchOperations, fetchGroups, fetchSubgroups, fetchDepartments} from "../utils/fetch";

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

  // Staff-specific fields
  const [staffInfo, setStaffInfo] = useState({
    staff_id: "",
    department_id: "",
    codename: "",
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

  // Department autocomplete (Staff)
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [departmentResults, setDepartmentResults] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Fetch programs for autocomplete
  useEffect(() => {
    if (programQuery.trim() === "") {
      setProgramResults([]);
      return;
    }

    fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms);
  }, [programQuery, currentInstituteId]);

  // Fetch departments for autocomplete (Staff)
  useEffect(() => {
    if (
      departmentQuery.trim() === "" ||
      !currentInstituteId ||
      form.role === "Student"
    ) {
      setDepartmentResults([]);
      return;
    }

    fetchDepartments(
      currentInstituteId,
      departmentQuery,
      setDepartmentResults,
      setLoadingDepartments
    );
  }, [departmentQuery, currentInstituteId, form.role]);

  useEffect(() => {
    console.log("Selected Program ID:", studentInfo.program_id);
    console.log("Institute ID:", currentInstituteId);
  }, [studentInfo.program_id]);

  // Fetch operations for autocomplete based on selected program
  useEffect(() => {
    if (operationQuery.trim() === "" || !studentInfo.program_id) {
      setOperationResults([]);
      return;
    }

    fetchOperations(studentInfo.program_id, operationQuery, setOperationResults, setLoadingOperations);
  }, [operationQuery, studentInfo.program_id]);

  // Fetch groups when program is selected
  useEffect(() => {
    if (!studentInfo.program_id) {
      setGroups([]);
      return;
    }
    fetchGroups(studentInfo.program_id, "", setGroups, setLoadingGroups);
  }, [studentInfo.program_id]);

  // Fetch subgroups when group is selected
  useEffect(() => {
    if (!studentInfo.group_id) {
      setSubgroups([]);
      return;
    }

    fetchSubgroups(studentInfo.group_id, "", setSubgroups, setLoadingSubgroups);
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

    // ================================
    // STUDENT INSERT
    // ================================
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

    // ================================
    // STAFF INSERT (non-students)
    // ================================
    if (form.role !== "Student") {
      if (!staffInfo.department_id) {
        alert("Please select a valid department from the dropdown.");
        return;
      }

      const { error: staffError } = await supabase
        .from("staffs")
        .insert([
          {
            id: user.id,
            staff_id: Number(staffInfo.staff_id),
            department_id: staffInfo.department_id,
            codename: staffInfo.codename,
          },
        ]);

      if (staffError) {
        console.error(staffError);
        alert("User created, but staff info failed");
        return;
      }
    }

    showToast("User created successfully");

    // Reset form
    setForm({
      name: "",
      role: "",
      institute_id: currentInstituteId,
      password: "",
      email: "",
    });

    setStudentInfo({
      program_id: "",
      is_representative: false,
      operation_id: "",
      roll_no: "",
      group_id: "",
      subgroup_id: "",
    });

    setStaffInfo({
      staff_id: "",
      department_id: "",
      codename: "",
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
      {/* Staff-only fields (Non-students) */}
      {form.role && form.role !== "Student" && (
        <div className="form-group-box">
          <h3 className="form-section-title">Staff Details</h3>

          <div className="form-field">
            <label>Staff ID</label>
            <input
              type="number"
              className="form-input"
              value={staffInfo.staff_id}
              onChange={(e) =>
                setStaffInfo({ ...staffInfo, staff_id: e.target.value })
              }
              placeholder="Enter staff ID"
              required
            />
          </div>

          <div className="form-field autocomplete-container">
            <label>Department</label>
            <input
              className="form-input"
              value={departmentQuery}
              onChange={(e) => {
                setDepartmentQuery(e.target.value);
                setStaffInfo({ ...staffInfo, department_id: "" });
              }}
              onBlur={() => {
                setTimeout(() => setDepartmentResults([]), 200);
              }}
              placeholder="Type department name..."
              required
            />

            {loadingDepartments && (
              <div className="autocomplete-loading">Searching...</div>
            )}

            {departmentResults.length > 0 && (
              <div className="autocomplete-list">
                {departmentResults.map((dept) => (
                  <div
                    key={dept.id}
                    className="autocomplete-item"
                    onMouseDown={() => {
                      setDepartmentQuery(`${dept.name} (${dept.code})`);
                      setStaffInfo({
                        ...staffInfo,
                        department_id: dept.id,
                      });
                      setDepartmentResults([]);
                    }}
                  >
                    {dept.name}
                    {dept.code && (
                      <span style={{ color: "#999", fontSize: "12px" }}>
                        {" "}
                        ({dept.code})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-field">
            <label>Codename</label>
            <input
              type="text"
              className="form-input"
              value={staffInfo.codename}
              onChange={(e) =>
                setStaffInfo({ ...staffInfo, codename: e.target.value })
              }
              placeholder="Enter codename"
              required
            />
          </div>
        </div>
      )}

      <button type="submit" className="form-submit">
        Create User
      </button>
    </form>
  );
}
