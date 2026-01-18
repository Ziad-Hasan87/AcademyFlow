import { useState, useEffect } from "react";
import { createUser } from "../utils/authentication";
import { ROLES } from "../utils/types";
import { MdOutlineEmail } from "react-icons/md";

export default function CreateUserForm() {
  // Get current user's institute from localStorage
  const currentInstituteId = localStorage.getItem("institute_id");

  const [form, setForm] = useState({
    role: "",
    institute_id: currentInstituteId || "",
    password: "",
    email: "",
  });

  // Student-specific fields
  const [studentInfo, setStudentInfo] = useState({
    program_id: "",
    is_representative: false,
  });

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
        email: form.email || `user-${Date.now()}@academy.local`,
        password: form.password,
        role: form.role,
        institute_id: form.institute_id,
      });

      // If role is Student, insert into student table
      if (form.role === "Student") {
        const { error: studentError } = await supabase
          .from("students") // corrected table name
          .insert([
            {
              id: user.id,
              program_id: studentInfo.program_id,
              is_representative: studentInfo.is_representative,
            },
          ]);

        if (studentError) {
          console.error(studentError);
          alert("User created, but student info failed");
          return;
        }
      }

      alert("User created successfully");

      // Reset form
      setForm({ role: "", institute_id: currentInstituteId, password: "", email: "" });
      setStudentInfo({ program_id: "", is_representative: false });
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
            {localStorage.getItem("institute_name") || form.institute_id}
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

          <div className="form-field">
            <label htmlFor="program-id">Program ID (uuid)</label>
            <input
              id="program-id"
              type="text"
              className="form-input"
              placeholder="Enter program ID"
              value={studentInfo.program_id}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, program_id: e.target.value })
              }
              required
            />
          </div>

          <div className="form-checkbox">
            <input
              id="is-representative"
              type="checkbox"
              checked={studentInfo.is_representative}
              onChange={(e) =>
                setStudentInfo({
                  ...studentInfo,
                  is_representative: e.target.checked,
                })
              }
            />
            <label htmlFor="is-representative">Is representative</label>
          </div>
        </div>
      )}

      <button type="submit" className="form-submit">
        Create User
      </button>
    </form>
  );
}
