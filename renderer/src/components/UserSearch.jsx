import { useEffect, useMemo, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchGroups } from "../utils/fetch";
import { ROLES } from "../utils/types";

export default function UserSearch() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [selectedRole, setSelectedRole] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");

  const [subgroups, setSubgroups] = useState([]);
  const [selectedSubgroup, setSelectedSubgroup] = useState("");

  const [rollSearch, setRollSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");

  const [profilesByUserId, setProfilesByUserId] = useState({});
  const [profilesLoading, setProfilesLoading] = useState(false);

  useEffect(() => {
    if (!programQuery.trim() || !currentInstituteId) {
      setProgramResults([]);
      return;
    }

    fetchPrograms(currentInstituteId, programQuery, setProgramResults, () => {});
  }, [programQuery, currentInstituteId]);

  useEffect(() => {
    if (!selectedProgram) {
      setGroups([]);
      setSelectedGroup("");
      return;
    }

    fetchGroups(selectedProgram.id, "", setGroups, () => {});
  }, [selectedProgram]);

  useEffect(() => {
    if (!selectedGroup) {
      setSubgroups([]);
      setSelectedSubgroup("");
      return;
    }

    const loadSubgroups = async () => {
      const { data, error } = await supabase
        .from("subgroups")
        .select("id, name")
        .eq("group_id", selectedGroup);

      if (error) {
        console.error("Error fetching subgroups:", error);
        setSubgroups([]);
        return;
      }

      setSubgroups(data || []);
    };

    loadSubgroups();
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedRole !== "Student") return;
    if (!selectedSubgroup) {
      setUsers([]);
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);

      let query = supabase
        .from("students")
        .select(
          `
            id,
            roll_no,
            users!inner (
              id,
              name,
              role
            )
          `
        )
        .eq("subgroup_id", selectedSubgroup);

      if (rollSearch.trim()) {
        query = query.ilike("roll_no", `%${rollSearch.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching students:", error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    };

    fetchStudents();
  }, [selectedSubgroup, rollSearch, selectedRole]);

  useEffect(() => {
    if (!selectedRole || selectedRole === "Student") return;
    if (!currentInstituteId) return;

    const fetchNonStudentUsers = async () => {
      setLoading(true);

      let query = supabase
        .from("users")
        .select(
          `
            id,
            name,
            role,
            staffs (
              staff_id,
              codename
            )
          `
        )
        .eq("institute_id", currentInstituteId)
        .eq("role", selectedRole);

      if (nameSearch.trim()) {
        const search = nameSearch.trim();
        const searchLike = `%${search}%`;

        query = query.or(`name.ilike.${searchLike}`);

        if (!Number.isNaN(Number(search))) {
          query = query.or(`staff_id.eq.${search},codename.ilike.${searchLike}`, {
            foreignTable: "staffs",
          });
        } else {
          query = query.or(`codename.ilike.${searchLike}`, {
            foreignTable: "staffs",
          });
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    };

    fetchNonStudentUsers();
  }, [selectedRole, nameSearch, currentInstituteId]);

  const normalizedUsers = useMemo(() => {
    return users
      .map((user) => {
        if (selectedRole === "Student") {
          return {
            userId: user.users?.id,
            name: user.users?.name,
            role: user.users?.role,
            rollNo: user.roll_no,
          };
        }

        return {
          userId: user.id,
          name: user.name,
          role: user.role,
          staffId: user.staffs?.staff_id,
          codename: user.staffs?.codename,
        };
      })
      .filter((item) => item.userId);
  }, [users, selectedRole]);

  useEffect(() => {
    const loadProfiles = async () => {
      if (normalizedUsers.length === 0) {
        setProfilesByUserId({});
        return;
      }

      setProfilesLoading(true);

      const responses = await Promise.all(
        normalizedUsers.map(async (item) => {
          const { data, error } = await supabase.rpc("get_user_profile", {
            p_user_id: item.userId,
          });

          if (error) {
            console.error(`Error fetching profile for ${item.userId}:`, error);
            return [item.userId, null];
          }

          const profile = Array.isArray(data) ? data[0] : data;
          return [item.userId, profile || null];
        })
      );

      setProfilesByUserId(Object.fromEntries(responses));
      setProfilesLoading(false);
    };

    loadProfiles();
  }, [normalizedUsers]);

  const resetSearchState = (role) => {
    setUsers([]);
    setProfilesByUserId({});
    setProgramQuery("");
    setProgramResults([]);
    setSelectedProgram(null);
    setGroups([]);
    setSelectedGroup("");
    setSubgroups([]);
    setSelectedSubgroup("");
    setRollSearch("");
    setNameSearch("");

    if (role !== "Student") {
      setSelectedProgram(null);
      setSelectedGroup("");
      setSelectedSubgroup("");
    }
  };

  const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  };

  const roleColorMap = {
    Admin: "#b45309",
    Moderator: "#1d4ed8",
    Teacher: "#0f766e",
    Student: "#7c3aed",
    Observer: "#4b5563",
  };

  const ui = {
    container: {
      minHeight: "520px",
      maxHeight: "70vh",
      overflowY: "auto",
      padding: "18px",
      borderRadius: "18px",
      background:
        "linear-gradient(135deg, rgba(5,150,105,0.1) 0%, rgba(14,116,144,0.08) 45%, rgba(147,51,234,0.08) 100%)",
    },
    hero: {
      borderRadius: "14px",
      padding: "14px 16px",
      background: "linear-gradient(120deg, #052e2b 0%, #0f766e 60%, #0b4a6f 100%)",
      color: "#f8fafc",
      marginBottom: "14px",
      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.2)",
    },
    heroTitle: {
      margin: 0,
      fontSize: "1.05rem",
      letterSpacing: "0.02em",
      fontWeight: 700,
      fontFamily: "'Segoe UI Variable', 'Trebuchet MS', sans-serif",
    },
    heroSub: {
      margin: "4px 0 0 0",
      opacity: 0.9,
      fontSize: "0.85rem",
    },
    panel: {
      background: "rgba(255, 255, 255, 0.85)",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      borderRadius: "14px",
      padding: "14px",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      marginBottom: "14px",
    },
    searchGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "10px",
      alignItems: "end",
    },
    statLine: {
      marginTop: "10px",
      fontSize: "0.8rem",
      color: "#334155",
      fontWeight: 600,
    },
    cardsWrap: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: "12px",
      marginTop: "8px",
    },
    card: {
      borderRadius: "14px",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      boxShadow: "0 8px 16px rgba(15, 23, 42, 0.08)",
      padding: "12px",
      overflow: "hidden",
    },
    cardTop: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "8px",
    },
    avatar: {
      width: "38px",
      height: "38px",
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      color: "white",
      flexShrink: 0,
    },
    name: {
      margin: 0,
      fontSize: "0.95rem",
      color: "#0f172a",
      lineHeight: 1.2,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: "0.72rem",
      fontWeight: 700,
      borderRadius: "999px",
      padding: "3px 10px",
      color: "white",
      marginTop: "4px",
      letterSpacing: "0.02em",
    },
    fieldList: {
      display: "grid",
      gap: "4px",
      marginTop: "8px",
    },
    fieldRow: {
      fontSize: "0.82rem",
      color: "#334155",
      lineHeight: 1.35,
      whiteSpace: "normal",
      wordBreak: "break-word",
    },
    placeholder: {
      borderRadius: "12px",
      border: "1px dashed #94a3b8",
      background: "rgba(248, 250, 252, 0.85)",
      color: "#475569",
      padding: "20px 14px",
      textAlign: "center",
      fontSize: "0.9rem",
      fontWeight: 600,
    },
  };

  return (
    <div style={ui.container}>
      <div style={ui.hero}>
        <h3 style={ui.heroTitle}>User Explorer</h3>
        <p style={ui.heroSub}>Search people by role, academic hierarchy, name, ID, codename, or roll number.</p>
      </div>

      <div style={ui.panel}>
        <div style={ui.searchGrid}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 700, color: "#0f172a" }}>Role</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => {
                const nextRole = e.target.value;
                setSelectedRole(nextRole);
                resetSearchState(nextRole);
              }}
            >
              <option value="">Select Role</option>
              {ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </div>

          {selectedRole && selectedRole !== "Student" && (
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 700, color: "#0f172a" }}>Lookup</label>
              <input
                className="form-input"
                placeholder="Name, ID, or codename"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {selectedRole === "Student" && (
          <div
            style={{
              marginTop: "10px",
              display: "grid",
              gap: "10px",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div className="form-field autocomplete-container" style={{ marginBottom: 0, minWidth: 0 }}>
              <label style={{ fontWeight: 700, color: "#0f172a" }}>Program</label>
              <input
                className="form-input"
                placeholder="Search program..."
                value={programQuery}
                onChange={(e) => {
                  setProgramQuery(e.target.value);
                  setSelectedProgram(null);
                }}
                onBlur={() => setTimeout(() => setProgramResults([]), 200)}
              />
              {programResults.length > 0 && (
                <div className="autocomplete-list">
                  {programResults.map((program) => (
                    <div
                      key={program.id}
                      className="autocomplete-item"
                      onMouseDown={() => {
                        setSelectedProgram(program);
                        setProgramQuery(program.name);
                        setProgramResults([]);
                      }}
                    >
                      {program.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProgram && (
              <div className="form-field" style={{ marginBottom: 0, minWidth: 0 }}>
                <label style={{ fontWeight: 700, color: "#0f172a" }}>Group</label>
                <select
                  className="form-select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="">Select Group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedGroup && (
              <div className="form-field" style={{ marginBottom: 0, minWidth: 0 }}>
                <label style={{ fontWeight: 700, color: "#0f172a" }}>Subgroup</label>
                <select
                  className="form-select"
                  value={selectedSubgroup}
                  onChange={(e) => setSelectedSubgroup(e.target.value)}
                >
                  <option value="">Select Subgroup</option>
                  {subgroups.map((subgroup) => (
                    <option key={subgroup.id} value={subgroup.id}>
                      {subgroup.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedSubgroup && (
              <div className="form-field" style={{ marginBottom: 0, minWidth: 0 }}>
                <label style={{ fontWeight: 700, color: "#0f172a" }}>Roll No</label>
                <input
                  className="form-input"
                  placeholder="Search by roll number..."
                  value={rollSearch}
                  onChange={(e) => setRollSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div style={ui.statLine}>
          {selectedRole ? `${normalizedUsers.length} result${normalizedUsers.length === 1 ? "" : "s"}` : "Select a role to begin."}
        </div>
      </div>

      {(loading || profilesLoading) && (
        <div style={ui.placeholder}>Loading users and profiles...</div>
      )}

      {!loading && !profilesLoading && selectedRole && normalizedUsers.length === 0 && (
        <div style={ui.placeholder}>No matching users found.</div>
      )}

      {!loading && !profilesLoading && normalizedUsers.length > 0 && (
        <div style={ui.cardsWrap}>
          {normalizedUsers.map((item) => {
            const profile = profilesByUserId[item.userId];

            const displayName = hasValue(profile?.name)
              ? `${profile.name}${hasValue(profile?.codename) ? ` (${profile.codename})` : ""}`
              : item.name || "Unknown";

            const badgeColor = roleColorMap[profile?.role || item.role] || "#334155";
            const avatarLabel = String(displayName).trim().charAt(0).toUpperCase() || "?";

            return (
              <div key={item.userId} style={ui.card}>
                <div style={ui.cardTop}>
                  <div style={{ ...ui.avatar, background: badgeColor }}>{avatarLabel}</div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={ui.name}>{displayName}</h3>
                    <span style={{ ...ui.badge, background: badgeColor }}>
                      {profile?.role || item.role || "N/A"}
                    </span>
                  </div>
                </div>

                <div style={ui.fieldList}>
                  {hasValue(item.rollNo) && (
                    <p style={ui.fieldRow}><strong>Roll No:</strong> {item.rollNo}</p>
                  )}
                  {hasValue(profile?.department_name) && (
                    <p style={ui.fieldRow}><strong>Department:</strong> {profile.department_name}</p>
                  )}
                  {hasValue(profile?.program_name) && (
                    <p style={ui.fieldRow}><strong>Program:</strong> {profile.program_name}</p>
                  )}
                  {hasValue(profile?.group_name) && (
                    <p style={ui.fieldRow}><strong>Group:</strong> {profile.group_name}</p>
                  )}
                  {hasValue(profile?.subgroup_name) && (
                    <p style={ui.fieldRow}><strong>Subgroup:</strong> {profile.subgroup_name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
