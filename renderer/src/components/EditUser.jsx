import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { fetchPrograms, fetchGroups } from "../utils/fetch";
import { useAuth } from "../contexts/AuthContext";

const ROLES = ["Teacher", "Observer", "Admin", "Student", "Moderator"];

export default function EditUser({ userId, onCancel }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    role: "",
  });

  const [studentForm, setStudentForm] = useState({
    program_id: "",
    group_id: "",
    subgroup_id: "",
    roll_no: "",
    is_representative: false,
    operation_id: "",
  });

  const [programs, setPrograms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);

      const { data: userDataRes } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      setForm({
        name: userDataRes.name || "",
        role: userDataRes.role || "",
      });

      if (userDataRes.role === "Student") {
        const { data: studentRes } = await supabase
          .from("students")
          .select("*")
          .eq("id", userId)
          .single();

        if (studentRes) {
          setStudentForm({
            program_id: studentRes.program_id || "",
            group_id: studentRes.group_id || "",
            subgroup_id: studentRes.subgroup_id || "",
            roll_no: studentRes.roll_no || "",
            is_representative: studentRes.is_representative || false,
            operation_id: studentRes.operation_id || "",
          });
        }
      }

      setLoading(false);
    };

    fetchUser();
  }, [userId]);

  /* ================= FETCH PROGRAMS ================= */
  useEffect(() => {
    fetchPrograms(currentInstituteId, "", setPrograms, () => {});
  }, [currentInstituteId]);

  /* ================= FETCH GROUPS ================= */
  useEffect(() => {
    if (!studentForm.program_id) return;

    fetchGroups(
      studentForm.program_id,
      "",
      setGroups,
      () => {}
    );
  }, [studentForm.program_id]);

  /* ================= FETCH SUBGROUPS ================= */
  useEffect(() => {
    if (!studentForm.group_id) return;

    const fetchSubgroups = async () => {
      const { data } = await supabase
        .from("subgroups")
        .select("id, name")
        .eq("group_id", studentForm.group_id);

      setSubgroups(data || []);
    };

    fetchSubgroups();
  }, [studentForm.group_id]);

  /* ================= SAVE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    /* ---- Update users table ---- */
    const { error: userError } = await supabase
      .from("users")
      .update({
        name: form.name,
        role: form.role,
      })
      .eq("id", userId);

    if (userError) {
      showToast(userError.message, "error");
      setLoading(false);
      return;
    }

    /* ---- Handle student logic ---- */
    if (form.role === "Student") {
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingStudent) {
        await supabase
          .from("students")
          .update({
            program_id: studentForm.program_id,
            group_id: studentForm.group_id,
            subgroup_id: studentForm.subgroup_id,
            roll_no: studentForm.roll_no,
            is_representative: studentForm.is_representative,
            operation_id: studentForm.operation_id,
          })
          .eq("id", userId);
      } else {
        await supabase.from("students").insert([
          {
            id: userId,
            ...studentForm,
          },
        ]);
      }
    } else {
      // If role changed from Student to something else → remove student row
      await supabase.from("students").delete().eq("id", userId);
    }

    showToast("User updated successfully");
    setLoading(false);
    onCancel();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit User</h2>

      {/* Name */}
      <div className="form-field">
        <label>Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          required
        />
      </div>

      {/* Role */}
      <div className="form-field">
        <label>Role</label>
        <select
          className="form-select"
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
          required
        >
          {ROLES.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* STUDENT FIELDS */}
      {form.role === "Student" && (
        <>
          <div className="form-field">
            <label>Program</label>
            <select
              className="form-select"
              value={studentForm.program_id}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  program_id: e.target.value,
                  group_id: "",
                  subgroup_id: "",
                })
              }
            >
              <option value="">Select Program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Group</label>
            <select
              className="form-select"
              value={studentForm.group_id}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  group_id: e.target.value,
                  subgroup_id: "",
                })
              }
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Subgroup</label>
            <select
              className="form-select"
              value={studentForm.subgroup_id}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  subgroup_id: e.target.value,
                })
              }
            >
              <option value="">Select Subgroup</option>
              {subgroups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Roll No</label>
            <input
              className="form-input"
              value={studentForm.roll_no}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  roll_no: e.target.value,
                })
              }
            />
          </div>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={studentForm.is_representative}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    is_representative: e.target.checked,
                  })
                }
              />
              Representative
            </label>
          </div>
        </>
      )}

      <button type="submit" className="form-submit">
        Save Changes
      </button>
    </form>
  );
}