import Modal from "../components/Modal";
import CreateCourses from "../components/CreateCourses";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import EditCourses from "../components/EditCourses";
import { useAuth } from "../contexts/AuthContext";
import AddButton from "../components/AddButton";

export default function CoursesPage() {
  const { userData } = useAuth();
  const [isCreateOpen, setisCreateOpen] = useState(false);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("institute_id", userData?.institute_id)
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
    } else {
      setDepartments(data || []);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);

    let query = supabase
      .from("courses")
      .select(`
        id,
        name,
        created_at,
        operations (
          name,
          programs!inner (
            name,
            institution_id,
            department_id
          )
        )
      `)
      .eq("operations.programs.institution_id", userData?.institute_id);

    if (selectedDepartmentId) {
      query = query.eq("operations.programs.department_id", selectedDepartmentId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });


    if (error) {
      console.error("Error fetching courses:", error);
    } else {
      setCourses(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [selectedDepartmentId]);

  return (
    <div className="page-content">
      <Modal
        isOpen={isCreateOpen}
        title="Create Course"
        onClose={() => {
          setisCreateOpen(false);
          fetchCourses();
        }}
      >
        <CreateCourses />
      </Modal>
      <Modal
        isOpen={isEditOpen}
        title="Edit Course"
        onClose={() => {
          setisEditOpen(false);
          fetchCourses();
        }}
      >
        <EditCourses
          courseId={selectedCourseId}
          onCancel={() => setisEditOpen(false)}
        />
      </Modal>
      <div className="page-sidebar-title">
        <h2>Courses</h2>
        <AddButton
          onClick={() => setisCreateOpen(true)}
          ariaLabel="Create Course"
        />
      </div>

      <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
        <select
          className="form-select"
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading…</p>}

      <div className="lists-container">
        {courses.map((course) => (
          <div
            key={course.id}
            className="list-item"
            onClick={() => {
              setSelectedCourseId(course.id);
              setisEditOpen(true);
            }}
          >
            <h3>{course.name || "Unnamed Course"}</h3>
            {course.operations?.programs?.name && (
              <p>{course.operations.programs.name}</p>
            )}
            {course.operations?.name && (
              <p style={{ fontSize: "0.9em", color: "#666" }}>
                Operation: {course.operations.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
