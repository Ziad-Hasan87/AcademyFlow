import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { createUser } from "../utils/authentication";
import { ROLES } from "../utils/types";
import { MdOutlineEmail } from "react-icons/md";


export default function CreateUserForm() {
  const [form, setForm] = useState({
    role: "",
    institute_id: "",
    password: "",
    email: "",
  });

  const [instituteQuery, setInstituteQuery] = useState("");
  const [institutes, setInstitutes] = useState([]);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);

  // Student-specific fields
  const [studentInfo, setStudentInfo] = useState({
    program_id: "",
    is_representative: false,
  });

  /* ----------------------------------
     Institute search (autocomplete)
  ---------------------------------- */
  useEffect(() => {
    if (instituteQuery.length < 2) {
      setInstitutes([]);
      return;
    }

    const fetchInstitutes = async () => {
      setLoadingInstitutes(true);

      const { data, error } = await supabase
        .from("institutes")
        .select("id, name")
        .ilike("name", `%${instituteQuery}%`)
        .limit(10);

      if (!error) setInstitutes(data || []);
      setLoadingInstitutes(false);
    };

    fetchInstitutes();
  }, [instituteQuery]);

  /* ----------------------------------
     Submit handler
  ---------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Use authentication function to create user
      const user = await createUser({
        email: form.email || `user-${Date.now()}@academy.local`,
        password: form.password,
        role: form.role,
        institute_id: form.institute_id,
      });

      // If role is Student, insert into student table
      if (form.role === "Student") {
        const { error: studentError } = await supabase
          .from("student")
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
      setForm({ role: "", institute_id: "", password: "" });
      setStudentInfo({ program_id: "", is_representative: false });
      setInstituteQuery("");
    } catch (error) {
      console.error(error);
      alert(`Failed to create user: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create User</h2>
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

      {/* 
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

      {/* Institute Search */}
      <div className="form-field">
        <label htmlFor="institute">Institute</label>
        <div className="autocomplete-container">
          <input
            id="institute"
            type="text"
            className="form-input"
            placeholder="Search institute (e.g. Har...)"
            value={instituteQuery}
            onChange={(e) => setInstituteQuery(e.target.value)}
            autoComplete="off"
          />

          {institutes.length > 0 && (
            <ul className="autocomplete-list">
              {institutes.map((inst) => (
                <li
                  key={inst.id}
                  className="autocomplete-item"
                  onClick={() => {
                    setForm({ ...form, institute_id: inst.id });
                    setInstituteQuery(inst.name);
                    setInstitutes([]);
                  }}
                >
                  {inst.name}
                </li>
              ))}
            </ul>
          )}

          {loadingInstitutes && (
            <div className="autocomplete-loading">Searching…</div>
          )}
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
