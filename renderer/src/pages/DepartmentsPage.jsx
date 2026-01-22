import Modal from "../components/Modal";
import CreateDepartments from "../components/CreateDepartments";
import { useState, useEffect } from "react";
import supabase from "../utils/supabase";

export default function DepartmentsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentInstituteId = localStorage.getItem("institute_id");

  const fetchDepartments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("departments")
      .select("code, name")
      .eq("institute_id", currentInstituteId)
      .order("code");

    if (error) {
      console.error("Error fetching departments:", error);
    } else {
      setDepartments(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setIsOpen(true)}
        aria-label="Create Department"
      >
        + Add
      </button>

      <Modal
        isOpen={isOpen}
        title="Create Department"
        onClose={() => setIsOpen(false)}
      >
        <CreateDepartments
          onCreated={() => {
            setIsOpen(false);
            fetchDepartments();
          }}
        />
      </Modal>

      <h2>Departments</h2>

      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {departments.map((dept) => (
          <div key={dept.code} className="list-item">
            <h3>{dept.code}</h3>
            <p>{dept.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
