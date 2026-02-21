import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import Modal from "../components/Modal";
import AddButton from "../components/AddButton";
import CreateVacations from "../components/CreateVacations";
import EditVacations from "../components/EditVacations";
import { useAuth } from "../contexts/AuthContext";
import { fetchOperations, fetchPrograms, fetchDepartments } from "../utils/fetch";

export default function VacationsPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedVacationId, setSelectedVacationId] = useState(null);

  const [forFilter, setForFilter] = useState("all");
  const [idQuery, setIdQuery] = useState("");
  const [idResults, setIdResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);

  /** FETCH VACATIONS **/
  const fetchVacations = async () => {
    setLoading(true);
    let query = supabase.from("vacations").select("*");

    if (forFilter === "all") {
      query = query.eq("from_table", "all").eq("institute_id", currentInstituteId);
    } else if (forFilter === "programs" || forFilter === "departments") {
      if (!selectedId) return setVacations([]);
      query = query.eq("for_users", selectedId).eq("from_table", forFilter);
    } else if (forFilter === "operations") {
      if (!selectedOperation) return setVacations([]);
      query = query.eq("for_users", selectedOperation.id).eq("from_table", "operations");
    }

    const { data, error } = await query.order("start_day", { ascending: true });
    if (error) console.error(error);

    // Map UUIDs to human-readable names
    const mapped = await Promise.all(
      (data || []).map(async (vac) => {
        if (vac.from_table === "all") {
          return { ...vac, displayFor: "ALL" };
        }

        if (vac.from_table === "programs") {
          const { data: prog } = await supabase
            .from("programs")
            .select("name")
            .eq("id", vac.for_users)
            .single();

          return {
            ...vac,
            displayFor: prog?.name || "Program",
          };
        }

        if (vac.from_table === "departments") {
          const { data: dept } = await supabase
            .from("departments")
            .select("name")
            .eq("id", vac.for_users)
            .single();

          return {
            ...vac,
            displayFor: dept?.name || "Department",
          };
        }

        if (vac.from_table === "operations") {
          const { data: op } = await supabase
            .from("operations")
            .select("name, program_id")
            .eq("id", vac.for_users)
            .single();

          let programName = "";

          if (op?.program_id) {
            const { data: prog } = await supabase
              .from("programs")
              .select("name")
              .eq("id", op.program_id)
              .single();

            programName = prog?.name || "";
          }

          return {
            ...vac,
            displayFor: `${programName} ${op?.name || ""}`,
          };
        }

        return vac;
      })
    );

    setVacations(mapped);
    setLoading(false);
  };

  /** SEARCH PROGRAMS **/
  useEffect(() => {
    if (forFilter === "operations" && programQuery.trim() !== "") {
      fetchPrograms(
        currentInstituteId,
        programQuery,
        setProgramResults,
        () => {}
      );
    } else setProgramResults([]);
  }, [programQuery, forFilter, currentInstituteId]);

  /** SEARCH OPERATIONS FOR SELECTED PROGRAM **/
  useEffect(() => {
    if (selectedProgram && operationQuery.trim() !== "" && forFilter === "operations") {
      fetchOperations(
        selectedProgram.id,
        operationQuery,
        setOperationResults,
        () => {}
      );
    } else setOperationResults([]);
  }, [operationQuery, selectedProgram, forFilter]);

  // SEARCH DEPARTMENTS / PROGRAMS FOR ID FIELD
  useEffect(() => {
    if (forFilter === "programs" && idQuery.trim() !== "") {
      fetchPrograms(
        currentInstituteId,
        idQuery,
        setIdResults,
        () => {}
      );
    }
    else if (forFilter === "departments" && idQuery.trim() !== "") {
      fetchDepartments(
        currentInstituteId,
        idQuery,
        setIdResults,
        () => {}
      );
    }
    else {
      setIdResults([]);
    }
  }, [idQuery, forFilter, currentInstituteId]);


  /** FETCH VACATIONS ON FILTER CHANGE **/
  useEffect(() => {
    fetchVacations();
  }, [forFilter, selectedId, selectedOperation]);

  return (
    <div className="page-content">
      <Modal
        isOpen={isCreateOpen}
        title="Create Vacation"
        onClose={() => {
          setIsCreateOpen(false);
          fetchVacations();
        }}
      >
        <CreateVacations onSuccess={fetchVacations} />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Vacation"
        onClose={() => {
          setIsEditOpen(false);
          fetchVacations();
        }}
      >
        <EditVacations
          vacationId={selectedVacationId}
          onSuccess={fetchVacations}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      <div className="page-sidebar-title">
        <h2>Vacations</h2>
        <AddButton onClick={() => setIsCreateOpen(true)} />
      </div>

      {/* FILTERS */}
      <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
        <label>For:</label>
        <select
          className="form-select"
          value={forFilter}
          onChange={(e) => {
            setForFilter(e.target.value);
            setSelectedId(null);
            setIdQuery("");
            setSelectedProgram(null);
            setProgramQuery("");
            setSelectedOperation(null);
            setOperationQuery("");
          }}
        >
          <option value="all">All</option>
          <option value="programs">Programs</option>
          <option value="departments">Departments</option>
          <option value="operations">Operations</option>
        </select>
      </div>

      {/* PROGRAM/DEPARTMENT SEARCH */}
      {(forFilter === "programs" || forFilter === "departments") && (
        <div className="form-field autocomplete-container" style={{ maxWidth: "300px", marginBottom: "16px" }}>
          <label>Id:</label>
          <input
            className="form-input"
            placeholder={`Search ${forFilter}...`}
            value={idQuery}
            onChange={(e) => {
              setIdQuery(e.target.value);
              setSelectedId(null);
            }}
            onBlur={() => setTimeout(() => setIdResults([]), 200)}
          />
          {idResults.length > 0 && (
            <div className="autocomplete-list">
              {idResults.map((item) => (
                <div
                  key={item.id}
                  className="autocomplete-item"
                  onMouseDown={() => {
                    setIdQuery(item.name);
                    setSelectedId(item.id);
                    setIdResults([]);
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OPERATIONS SEARCH (choose program first) */}
      {forFilter === "operations" && (
        <>
          <div className="form-field autocomplete-container" style={{ maxWidth: "300px", marginBottom: "16px" }}>
            <label>Program:</label>
            <input
              className="form-input"
              placeholder="Search program..."
              value={programQuery}
              onChange={(e) => {
                setProgramQuery(e.target.value);
                setSelectedProgram(null);
                setSelectedOperation(null);
                setOperationQuery("");
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
                      setProgramQuery(prog.name);
                      setSelectedProgram(prog);
                      setProgramResults([]);
                      setSelectedOperation(null);
                      setOperationQuery("");
                    }}
                  >
                    {prog.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-field autocomplete-container" style={{ maxWidth: "300px", marginBottom: "16px" }}>
            <label>Operation:</label>
            <input
              className="form-input"
              placeholder="Search operation..."
              value={operationQuery}
              onChange={(e) => {
                setOperationQuery(e.target.value);
                setSelectedOperation(null);
              }}
              onBlur={() => setTimeout(() => setOperationResults([]), 200)}
              disabled={!selectedProgram}
            />
            {operationResults.length > 0 && (
              <div className="autocomplete-list">
                {operationResults.map((op) => (
                  <div
                    key={op.id}
                    className="autocomplete-item"
                    onMouseDown={() => {
                      setOperationQuery(op.name);
                      setSelectedOperation(op);
                      setOperationResults([]);
                    }}
                  >
                    {op.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {loading && <p>Loading…</p>}

      {/* VACATIONS LIST */}
      <div className="lists-container">
        {vacations.map((vac) => {
          const isInactive = vac.end_day && new Date(vac.end_day) < new Date(); // Check if ended
          return (
            <div
              key={vac.id}
              className={isInactive ? "list-item-inactive" : "list-item"}
              onClick={() => {
                setSelectedVacationId(vac.id);
                setIsEditOpen(true);
              }}
            >
              <h3>
                {vac.from_table === "all"
                  ? "All"
                  : vac.from_table === "departments"
                    ? vac.department_name
                    : vac.from_table === "programs"
                      ? vac.program_name
                      : vac.from_table === "operations"
                        ? `${vac.program_name} - ${vac.operation_name}`
                        : ""}
              </h3>
              <p>
                {new Date(vac.start_day).toLocaleDateString("en-GB")} –{" "}
                {new Date(vac.end_day).toLocaleDateString("en-GB")}
              </p>
              {vac.description && <p>{vac.description}</p>}
            </div>
          );
        })}
      </div>

    </div>
  );
}
