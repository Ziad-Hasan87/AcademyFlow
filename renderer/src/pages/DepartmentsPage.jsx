import Modal from "../components/Modal";
import CreateDepartments from "../components/CreateDepartments";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import AddButton from "../components/AddButton";
import { fetchDepartments } from "../utils/fetch";

export default function DepartmentsPage() {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use the new fetchDepartments util
  const loadDepartments = async () => {
    if (!userData?.institute_id) return;
    setLoading(true);

    await fetchDepartments(
      userData.institute_id, // currentInstituteId
      "",                    // initial query
      setDepartments,        // setDeptResults
      setLoading             // setLoadingDepts
    );

    setLoading(false);
  };

  useEffect(() => {
    loadDepartments();
  }, [userData?.institute_id]);

  return (
    <div className="page-content">
      <div className="page-sidebar-title">
        <h2>Departments</h2>
        <AddButton
          onClick={() => setIsOpen(true)}
          ariaLabel="Create Department"
        />
      </div>

      <Modal
        isOpen={isOpen}
        title="Create Department"
        onClose={() => setIsOpen(false)}
      >
        <CreateDepartments
          onCreated={() => {
            setIsOpen(false);
            loadDepartments();
          }}
        />
      </Modal>

      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {departments.map((dept) => (
          <div key={dept.id || dept.code} className="list-item">
            <h3>{dept.code}</h3>
            <p>{dept.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}