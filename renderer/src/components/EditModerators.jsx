import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchCourseModerators, fetchTeachersByInstitute } from "../utils/fetch";
import { MdPersonAdd, MdDelete } from "react-icons/md";

export default function EditModerators({ courseId, courseName }) {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [moderators, setModerators] = useState([]);
  const [loadingModerators, setLoadingModerators] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [teacherResults, setTeacherResults] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // ─── Load moderators ────────────────────────────────────────────────────────
  const loadModerators = () => {
    fetchCourseModerators(courseId, setModerators, setLoadingModerators);
  };

  useEffect(() => {
    if (!courseId) return;
    loadModerators();
  }, [courseId]);

  // ─── Search teachers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSearch) return;
    fetchTeachersByInstitute(
      currentInstituteId,
      teacherQuery,
      setTeacherResults,
      setLoadingTeachers
    );
  }, [teacherQuery, showSearch, currentInstituteId]);

  // ─── Add moderator ───────────────────────────────────────────────────────────
  const handleAdd = async (teacher) => {
    const alreadyAdded = moderators.some((m) => m.user_id === teacher.id);
    if (alreadyAdded) {
      showToast("This teacher is already a moderator for this course.");
      return;
    }

    setAddingId(teacher.id);

    const { error } = await supabase
      .from("course_moderators")
      .insert([{ course_id: courseId, user_id: teacher.id }]);

    setAddingId(null);

    if (error) {
      console.error("Error adding moderator:", error);
      showToast("Failed to add moderator.");
    } else {
      showToast(`${teacher.name} added as moderator.`);

      // Optimistically add to list immediately so the name appears right away
      setModerators((prev) => [
        ...prev,
        {
          course_id: courseId,
          user_id: teacher.id,
          users: { id: teacher.id, name: teacher.name, role: teacher.role },
        },
      ]);

      setTeacherQuery("");
      setTeacherResults([]);
      setShowSearch(false);

      // Reload in background to get real DB record ids
      loadModerators();
    }
  };

  // ─── Remove moderator ────────────────────────────────────────────────────────
  const handleRemove = async (userId, name) => {
    if (!confirm(`Remove ${name} as a moderator?`)) return;

    setRemovingId(userId);

    const { error } = await supabase
      .from("course_moderators")
      .delete()
      .eq("course_id", courseId)
      .eq("user_id", userId);

    setRemovingId(null);

    if (error) {
      console.error("Error removing moderator:", error);
      showToast("Failed to remove moderator.");
    } else {
      showToast(`${name} removed from moderators.`);
      loadModerators();
    }
  };

  return (
    <div style={{ minWidth: "360px" }}>
      {/* ─── Course header ─── */}
      {courseName && (
        <p style={{ color: "#666", marginBottom: "16px", fontSize: "0.9em" }}>
          Course: <strong>{courseName}</strong>
        </p>
      )}

      {/* ─── Current moderators ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <h4 style={{ margin: 0 }}>Moderators</h4>
        <button
          title="Add moderator"
          onClick={() => {
            setShowSearch((prev) => !prev);
            setTeacherQuery("");
            setTeacherResults([]);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            background: "var(--primary, #4f8ef7)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9em",
          }}
        >
          <MdPersonAdd size={16} />
          Add
        </button>
      </div>

      {loadingModerators ? (
        <p style={{ color: "#888" }}>Loading…</p>
      ) : moderators.length === 0 ? (
        <p style={{ color: "#999", fontSize: "0.9em" }}>
          No moderators assigned yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {moderators.map((m) => (
            <div
              key={m.user_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "#f7f8fa",
                borderRadius: "8px",
                border: "1px solid #e4e6eb",
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>
                  {m.users?.name ?? "Unknown"}
                </span>
                <span
                  style={{
                    marginLeft: "10px",
                    fontSize: "0.78em",
                    color: "#888",
                    background: "#e8f0fe",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {m.users?.role}
                </span>
              </div>
              <button
                title="Remove moderator"
                disabled={removingId === m.user_id}
                onClick={() => handleRemove(m.user_id, m.users?.name ?? "this user")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#e53e3e",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <MdDelete size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add-moderator search panel ─── */}
      {showSearch && (
        <div
          style={{
            marginTop: "20px",
            padding: "14px",
            background: "#f0f4ff",
            borderRadius: "8px",
            border: "1px solid #c5d5fa",
          }}
        >
          <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.9em" }}>
            Search Teachers
          </p>
          <div className="form-field autocomplete-container" style={{ marginBottom: 0 }}>
            <input
              className="form-input"
              placeholder="Type teacher name…"
              value={teacherQuery}
              onChange={(e) => setTeacherQuery(e.target.value)}
              autoFocus
            />
            {loadingTeachers && (
              <div className="autocomplete-loading">Searching…</div>
            )}
            {teacherResults.length > 0 && (
              <div className="autocomplete-list">
                {teacherResults.map((teacher) => {
                  const alreadyAdded = moderators.some(
                    (m) => m.user_id === teacher.id
                  );
                  return (
                    <div
                      key={teacher.id}
                      className="autocomplete-item"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        opacity: alreadyAdded ? 0.5 : 1,
                        cursor: alreadyAdded ? "not-allowed" : "pointer",
                      }}
                      onMouseDown={() => {
                        if (!alreadyAdded) handleAdd(teacher);
                      }}
                    >
                      <span>{teacher.name}</span>
                      {alreadyAdded ? (
                        <span
                          style={{
                            fontSize: "0.75em",
                            color: "#888",
                            marginLeft: "8px",
                          }}
                        >
                          Already added
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.75em",
                            color: "#4f8ef7",
                            marginLeft: "8px",
                          }}
                        >
                          {addingId === teacher.id ? "Adding…" : "+ Add"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!loadingTeachers &&
              teacherQuery.trim() !== "" &&
              teacherResults.length === 0 && (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "0.85em",
                    color: "#999",
                  }}
                >
                  No teachers found.
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
