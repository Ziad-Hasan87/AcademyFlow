import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import EditModerators from "../components/EditModerators";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchPrograms,
  fetchOperations,
  fetchCoursesByOperation,
} from "../utils/fetch";

export default function ModeratorsPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;

  // ─── Program ─────────────────────────────────────────────────────────────────
  const [programQuery, setProgramQuery] = useState("");
  const [programResults, setProgramResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // ─── Operation ───────────────────────────────────────────────────────────────
  const [operationQuery, setOperationQuery] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [loadingOperations, setLoadingOperations] = useState(false);

  // ─── Courses ─────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // ─── Modal ───────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // ─── Fetch programs (autocomplete) ───────────────────────────────────────────
  useEffect(() => {
    if (!programQuery.trim()) {
      setProgramResults([]);
      return;
    }
    fetchPrograms(
      currentInstituteId,
      programQuery,
      setProgramResults,
      setLoadingPrograms
    );
  }, [programQuery, currentInstituteId]);

  // ─── Fetch operations (autocomplete, depends on selected program) ─────────────
  useEffect(() => {
    if (!operationQuery.trim() || !selectedProgram) {
      setOperationResults([]);
      return;
    }
    fetchOperations(
      selectedProgram.id,
      operationQuery,
      setOperationResults,
      setLoadingOperations
    );
  }, [operationQuery, selectedProgram]);

  // ─── Fetch courses when operation is selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedOperation?.id) {
      setCourses([]);
      return;
    }
    fetchCoursesByOperation(selectedOperation.id, setCourses, setLoadingCourses);
  }, [selectedOperation]);

  return (
    <div className="page-content">
      {/* ─── Modal ─── */}
      <Modal
        isOpen={isModalOpen}
        title={`Moderators — ${selectedCourse?.name ?? ""}`}
        onClose={() => setIsModalOpen(false)}
      >
        <EditModerators
          courseId={selectedCourse?.id}
          courseName={selectedCourse?.name}
        />
      </Modal>

      {/* ─── Header ─── */}
      <div className="page-sidebar-title">
        <h2>Moderators</h2>
      </div>

      {/* ─── Program search ─── */}
      <div className="form-field autocomplete-container">
        <label>Program</label>
        <input
          className="form-input"
          placeholder="Search program…"
          value={programQuery}
          onChange={(e) => {
            setProgramQuery(e.target.value);
            setSelectedProgram(null);
            setSelectedOperation(null);
            setOperationQuery("");
            setCourses([]);
          }}
          onBlur={() => setTimeout(() => setProgramResults([]), 200)}
        />
        {loadingPrograms && (
          <div className="autocomplete-loading">Searching…</div>
        )}
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
                  setSelectedOperation(null);
                  setOperationQuery("");
                  setCourses([]);
                }}
              >
                {prog.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Operation search ─── */}
      {selectedProgram && (
        <div className="form-field autocomplete-container">
          <label>Operation</label>
          <input
            className="form-input"
            placeholder="Search operation…"
            value={operationQuery}
            onChange={(e) => {
              setOperationQuery(e.target.value);
              setSelectedOperation(null);
              setCourses([]);
            }}
            onBlur={() => setTimeout(() => setOperationResults([]), 200)}
          />
          {loadingOperations && (
            <div className="autocomplete-loading">Searching…</div>
          )}
          {operationResults.length > 0 && (
            <div className="autocomplete-list">
              {operationResults.map((op) => (
                <div
                  key={op.id}
                  className="autocomplete-item"
                  onMouseDown={() => {
                    setSelectedOperation(op);
                    setOperationQuery(op.name);
                    setOperationResults([]);
                  }}
                >
                  {op.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Courses list ─── */}
      {loadingCourses && <p>Loading courses…</p>}

      {selectedOperation && !loadingCourses && (
        <div className="lists-container">
          {courses.length === 0 ? (
            <p style={{ color: "#777" }}>No courses found for this operation.</p>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="list-item"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedCourse(course);
                  setIsModalOpen(true);
                }}
              >
                <h3>{course.name}</h3>
                <p style={{ fontSize: "0.85em", color: "#666" }}>
                  {selectedOperation.name}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
