import Modal from "../components/Modal";
import CreatePrograms from "../components/CreatePrograms";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import EditPrograms from "../components/EditPrograms";

export default function ProgramsPage() {

  const [isCreateOpen, setisCreateOpen] = useState(false);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState(null);


  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("institute_id", currentInstituteId)
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
    } else {
      setDepartments(data);
    }
  };


  const currentInstituteId = localStorage.getItem("institute_id");

  const fetchPrograms = async (departmentId = "") => {
    setLoading(true);

    let query = supabase
      .from("programs")
      .select(`
        id,
        name,
        is_active,
        department_id,
        departments (
          name
        )
      `)
      .eq("institution_id", currentInstituteId)
      .order("is_active", { ascending: false });

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching programs:", error);
    } else {
      setPrograms(data);
    }

    setLoading(false);
  };


  useEffect(() => {
    fetchPrograms();
    fetchDepartments();
  }, []);


  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setisCreateOpen(true)}
        aria-label="Create Program"
      >
        + Add
      </button>
      <Modal isOpen={isCreateOpen} title="Create Program" onClose={()=> {setisCreateOpen(false); fetchPrograms();}}>
        <CreatePrograms />
      </Modal>
      <Modal isOpen={isEditOpen} title="Edit Program" onClose={()=> {setisEditOpen(false); fetchPrograms();}}>
        <EditPrograms programId={selectedProgramId} onCancel={()=>setisEditOpen(false)} />
      </Modal>
      <div>
      <h2>Programs</h2>
      <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
        <select
          className="form-select"
          value={selectedDept}
          onChange={(e) => {
            const deptId = e.target.value;
            setSelectedDept(deptId);
            fetchPrograms(deptId);
          }}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      </div>
      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {programs.map((program) => (
          <div key={program.id} className={program.is_active ? "list-item" : "list-item-inactive"} onClick={() => { setSelectedProgramId(program.id); setisEditOpen(true); }}>
            <h3>{program.name}</h3>
            <p>{program.departments?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
