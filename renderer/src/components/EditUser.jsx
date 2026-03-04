import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import {
  fetchPrograms,
  fetchGroups,
  fetchOperations,
  fetchDepartments,
} from "../utils/fetch";
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

  const [staffForm, setStaffForm] = useState({
    department_id: null,
    staff_id: "",
    codename: "",
  });

  const [programs, setPrograms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [operations, setOperations] = useState([]);
  const [departments, setDepartments] = useState([]);

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);

      const { data: userRes } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (!userRes) {
        showToast("User not found", "error");
        return;
      }

      setForm({
        name: userRes.name || "",
        role: userRes.role || "",
      });

      // Load student if exists
      const { data: studentRes } = await supabase
        .from("students")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

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

      // Load staff if exists
      const { data: staffRes } = await supabase
        .from("staffs")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (staffRes) {
        setStaffForm({
          department_id: staffRes.department_id || null,
          staff_id: staffRes.staff_id || "",
          codename: staffRes.codename || "",
        });
      }

      setLoading(false);
    };

    fetchUser();
  }, [userId]);

  /* ================= FETCH STATIC DATA ================= */
  useEffect(() => {
    if (!currentInstituteId) return;

    fetchPrograms(currentInstituteId, "", setPrograms, () => {});
    fetchDepartments(currentInstituteId, "", setDepartments, () => {});
  }, [currentInstituteId]);

  useEffect(() => {
    if (!studentForm.program_id) return;

    fetchGroups(studentForm.program_id, "", setGroups, () => {});
    fetchOperations(studentForm.program_id, "", setOperations, () => {});
  }, [studentForm.program_id]);

  useEffect(() => {
    if (!studentForm.group_id) {
      setSubgroups([]);
      return;
    }

    const loadSubgroups = async () => {
      const { data } = await supabase
        .from("subgroups")
        .select("id, name")
        .eq("group_id", studentForm.group_id);

      setSubgroups(data || []);
    };

    loadSubgroups();
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

    /* ================= ROLE SWITCH LOGIC ================= */

    if (form.role === "Student") {
      // Remove staff record if exists
      await supabase.from("staffs").delete().eq("id", userId);

      const cleanedStudent = {
        ...studentForm,
        group_id: studentForm.group_id || null,
        subgroup_id: studentForm.subgroup_id || null,
        operation_id: studentForm.operation_id || null,
      };

      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (existingStudent) {
        await supabase
          .from("students")
          .update(cleanedStudent)
          .eq("id", userId);
      } else {
        await supabase
          .from("students")
          .insert([{ id: userId, ...cleanedStudent }]);
      }
    } else {
      // Remove student record if exists
      await supabase.from("students").delete().eq("id", userId);

      const cleanedStaff = {
        ...staffForm,
        department_id: staffForm.department_id || null, // 👈 NULL if deselected
      };

      const { data: existingStaff } = await supabase
        .from("staffs")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (existingStaff) {
        await supabase
          .from("staffs")
          .update(cleanedStaff)
          .eq("id", userId);
      } else {
        await supabase
          .from("staffs")
          .insert([{ id: userId, ...cleanedStaff }]);
      }
    }

    showToast("User updated successfully");
    setLoading(false);
    onCancel();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit User</h2>

      {/* NAME */}
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

      {/* ROLE */}
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
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* ================= STUDENT ================= */}
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
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Operation</label>
            <select
              className="form-select"
              value={studentForm.operation_id}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  operation_id: e.target.value,
                })
              }
            >
              <option value="">Select Operation</option>
              {operations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
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
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
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
              <option value="">None</option>
              {subgroups.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
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

      {/* ================= STAFF ================= */}
      {form.role !== "Student" && (
        <>
          <div className="form-field">
            <label>Staff ID</label>
            <input
              type="number"
              className="form-input"
              value={staffForm.staff_id}
              onChange={(e) =>
                setStaffForm({
                  ...staffForm,
                  staff_id: e.target.value,
                })
              }
            />
          </div>

          <div className="form-field">
            <label>Department</label>
            <select
              className="form-select"
              value={staffForm.department_id || ""}
              onChange={(e) =>
                setStaffForm({
                  ...staffForm,
                  department_id: e.target.value || null,
                })
              }
            >
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Codename</label>
            <input
              className="form-input"
              value={staffForm.codename}
              onChange={(e) =>
                setStaffForm({
                  ...staffForm,
                  codename: e.target.value,
                })
              }
            />
          </div>
        </>
      )}

      <button type="submit" className="form-submit">
        Save Changes
      </button>
    </form>
  );
}