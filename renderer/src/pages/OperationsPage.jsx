import Modal from "../components/Modal";
import CreateOperations from "../components/CreateOperations";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import EditOperations from "../components/EditOperations";
import { useAuth } from "../contexts/AuthContext";
import AddButton from "../components/AddButton";

export default function OperationsPage() {
  const { userData } = useAuth();
  const [isCreateOpen, setisCreateOpen] = useState(false);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedOperationId, setSelectedOperationId] = useState(null);

  const fetchPrograms = async () => {
    const currentInstituteId = userData?.institute_id;
    const { data, error } = await supabase
      .from("programs")
      .select("id, name")
      .eq("institution_id", currentInstituteId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching programs:", error);
    } else {
      setPrograms(data);
    }
  };

  const fetchOperations = async (programId = "") => {
    setLoading(true);

    const currentInstituteId = userData?.institute_id;

    let query = supabase
      .from("operations")
      .select(`
        id,
        name,
        status,
        created_at,
        program_id,
        programs!inner (
          name,
          institution_id
        )
      `)
      .eq("programs.institution_id", currentInstituteId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });


    if (programId) {
      query = query.eq("program_id", programId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching operations:", error);
    } else {
      setOperations(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOperations();
    fetchPrograms();
  }, [isEditOpen, isCreateOpen]);

  useEffect(() => {
    fetchOperations();
    fetchPrograms();
  }, []);

  return (
    <div className="page-content">
      <Modal
        isOpen={isCreateOpen}
        title="Create Operation"
        onClose={() => {
          setisCreateOpen(false);
          fetchOperations();
        }}
      >
        <CreateOperations />
      </Modal>
      <Modal
        isOpen={isEditOpen}
        title="Edit Operation"
        onClose={() => {
          setisEditOpen(false);
          fetchOperations();
        }}
      >
        <EditOperations
          operationId={selectedOperationId}
          onCancel={() => setisEditOpen(false)}
        />
      </Modal>
      <div>
        <div className="page-sidebar-title">
          <h2>Operations</h2>
          <AddButton
            onClick={() => setisCreateOpen(true)}
            ariaLabel="Create Operation"
          />
        </div>
        <div
          className="form-field"
          style={{ maxWidth: "300px", marginBottom: "16px" }}
        >
          <select
            className="form-select"
            value={selectedProgram}
            onChange={(e) => {
              const progId = e.target.value;
              setSelectedProgram(progId);
              fetchOperations(progId);
            }}
          >
            <option value="">All Programs</option>
            {programs.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {operations.map((operation) => (
          <div
            key={operation.id}
            className={
              operation.status === "active"
                ? "list-item"
                : "list-item-inactive"
            }
            onClick={() => {
              setSelectedOperationId(operation.id);
              setisEditOpen(true);
            }}
          >
            <h3>{operation.name}</h3>
            <p>{operation.programs?.name}</p>
            <p style={{ fontSize: "0.85em", color: "#666", textTransform: "capitalize" }}>
              Status: {operation.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}