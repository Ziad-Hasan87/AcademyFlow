import Modal from "../components/Modal";
import CreateUser from "../components/CreateUser";
import EditUser from "../components/EditUser";
import AddButton from "../components/AddButton";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";
import { fetchPrograms, fetchGroups } from "../utils/fetch";
import { ROLES } from "../utils/types";


export default function UsersPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

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

  useEffect(() => {
    if (!programQuery.trim()) {
      setProgramResults([]);
      return;
    }

    fetchPrograms(
      currentInstituteId,
      programQuery,
      setProgramResults,
      () => {}
    );
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

    const fetchSubgroups = async () => {
      const { data } = await supabase
        .from("subgroups")
        .select("id, name")
        .eq("group_id", selectedGroup);

      setSubgroups(data || []);
    };

    fetchSubgroups();
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedRole !== "Student") return;
    if (!selectedSubgroup) return;

    const fetchStudents = async () => {
      setLoading(true);

      let query = supabase
        .from("students")
        .select(`
          id,
          roll_no,
          users!inner (
            id,
            name,
            role
          )
        `)
        .eq("subgroup_id", selectedSubgroup);

      if (rollSearch.trim()) {
        query = query.ilike("roll_no", `%${rollSearch}%`);
      }

      const { data } = await query;
      setUsers(data || []);
      setLoading(false);
    };

    fetchStudents();
  }, [selectedSubgroup, rollSearch, selectedRole]);

  useEffect(() => {
    if (!selectedRole || selectedRole === "Student") return;

    const fetchUsers = async () => {
      setLoading(true);

      let query = supabase
        .from("users")
        .select("id, name, role")
        .eq("institute_id", currentInstituteId)
        .eq("role", selectedRole);

      if (nameSearch.trim()) {
        query = query.ilike("name", `%${nameSearch}%`);
      }

      const { data } = await query;
      setUsers(data || []);
      setLoading(false);
    };

    fetchUsers();
  }, [selectedRole, nameSearch, currentInstituteId]);

  const refreshUsers = () => {
    if (selectedRole === "Student" && selectedSubgroup) {
      setRollSearch((prev) => prev);
    } else if (selectedRole && selectedRole !== "Student") {
      setNameSearch((prev) => prev);
    }
  };

  return (
    <div className="page-content">
      <Modal
        isOpen={isCreateOpen}
        title="Create User"
        onClose={() => setIsCreateOpen(false)}
      >
        <CreateUser />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit User"
        onClose={() => {
          setIsEditOpen(false);
          refreshUsers();
        }}
      >
        <EditUser
          userId={selectedUserId}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      <div className="page-sidebar-title">
        <h2>Users Management</h2>
        <AddButton
          onClick={() => setIsCreateOpen(true)}
          ariaLabel="Create User"
        />
      </div>

      <div className="form-field" style={{ maxWidth: "300px" }}>
        <select
          className="form-select"
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setUsers([]);
          }}
        >
          <option value="">Select Role</option>
          {ROLES.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </div>

      {selectedRole === "Student" && (
        <>
          <div className="form-field autocomplete-container">
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
                {programResults.map((prog) => (
                  <div
                    key={prog.id}
                    className="autocomplete-item"
                    onMouseDown={() => {
                      setSelectedProgram(prog);
                      setProgramQuery(prog.name);
                      setProgramResults([]);
                    }}
                  >
                    {prog.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedProgram && (
            <div className="form-field">
              <select
                className="form-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="">Select Group</option>
                {groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedGroup && (
            <div className="form-field">
              <select
                className="form-select"
                value={selectedSubgroup}
                onChange={(e) => setSelectedSubgroup(e.target.value)}
              >
                <option value="">Select Subgroup</option>
                {subgroups.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedSubgroup && (
            <div className="form-field">
              <input
                className="form-input"
                placeholder="Search by Roll No..."
                value={rollSearch}
                onChange={(e) => setRollSearch(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {selectedRole && selectedRole !== "Student" && (
        <div className="form-field">
          <input
            className="form-input"
            placeholder="Search by name..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
          />
        </div>
      )}

      {loading && <p>Loading...</p>}

      <div className="lists-container">
        {users.map((user) => (
          <div
            key={selectedRole === "Student" ? user.users?.id : user.id}
            className="list-item"
            onClick={() => {
              const id =
                selectedRole === "Student"
                  ? user.users?.id
                  : user.id;

              setSelectedUserId(id);
              setIsEditOpen(true);
            }}
          >
            {selectedRole === "Student" ? (
              <>
                <h3>{user.users?.name}</h3>
                <p>Roll No: {user.roll_no}</p>
              </>
            ) : (
              <>
                <h3>{user.name}</h3>
                <p>{user.role}</p>
              </>
            )}
          </div>
        ))}

        {!loading && users.length === 0 && selectedRole && (
          <p style={{ color: "#777" }}>No users found.</p>
        )}
      </div>
    </div>
  );
}