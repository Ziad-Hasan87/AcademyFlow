import Modal from "../components/Modal";
import CreateCourses from "../components/CreateCourses";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import EditCourses from "../components/EditCourses";

export default function CoursesPage() {
  const [isCreateOpen, setisCreateOpen] = useState(false);
  const [isEditOpen, setisEditOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        name,
        created_at,
        operation_id,
        operations (
          name,
          program_id,
          programs (
            name,
            institution_id
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
    } else {
      const currentInstituteId = localStorage.getItem("institute_id");
      // Filter by institute through operations -> programs
      const filtered = data.filter(
        (course) => course.operations?.programs?.institution_id === currentInstituteId
      );
      setCourses(filtered);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setisCreateOpen(true)}
        aria-label="Create Course"
      >
        + Add
      </button>
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
      <div>
        <h2>Courses</h2>
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
