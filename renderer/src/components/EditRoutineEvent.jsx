import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { notifyRoutineEventChange } from "../utils/telegramNotifications";

export default function EditRoutineEvent({
  event,
  slots,
  maxEndSlotId,
  operationId,
  onSuccess,
}) {
  const { userData } = useAuth();
  const currentUserId = userData?.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isReschedulable, setIsReschedulable] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  
  // Single course fields
  const [subgroupLabel, setSubgroupLabel] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [teacherCodenames, setTeacherCodenames] = useState("");
  
  const [actualDescription, setActualDescription] = useState("");
  const [endSlotId, setEndSlotId] = useState("");
  const [forUsersLabel, setForUsersLabel] = useState("");
  const [startSlotLabel, setStartSlotLabel] = useState("");

  // Pre-fill form with existing event data
  useEffect(() => {
    if (!event) return;

    setTitle(event.title || "");
    
    // Parse description for metadata
    try {
      const descData = JSON.parse(event.description || "{}");
      setSubgroupLabel(descData.subgroup || "");
      setSelectedTeacherIds(descData.teachers || []);
      setTeacherCodenames(descData.teacherCodenames || "");
      setActualDescription(descData.description || "");
    } catch {
      // Not JSON, use as plain description
      setActualDescription(event.description || "");
    }

    setIsReschedulable(event.is_reschedulable ?? true);
    setSelectedCourseId(event.course_id || "");
    setEndSlotId(event.end_slot);
  }, [event]);

  // Set slot labels
  useEffect(() => {
    if (!event || slots.length === 0) return;

    const formatTimeToAMPM = (time24) => {
      if (!time24) return "";
      const [hourStr, minute] = time24.split(":");
      let hour = parseInt(hourStr, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      return `${hour}:${minute} ${ampm}`;
    };

    const startSlot = slots.find((s) => s.id === event.start_slot);

    if (startSlot) {
      setStartSlotLabel(
        `${startSlot.name} ${formatTimeToAMPM(startSlot.start)} - ${formatTimeToAMPM(startSlot.end)}`
      );
    }

    // Fetch forUsers name
    const fetchForUsersName = async () => {
      if (event.from_table === "groups") {
        const { data } = await supabase
          .from("groups")
          .select("name")
          .eq("id", event.for_users)
          .single();
        setForUsersLabel(data?.name || "");
      } else if (event.from_table === "subgroups") {
        const { data } = await supabase
          .from("subgroups")
          .select("name")
          .eq("id", event.for_users)
          .single();
        setForUsersLabel(data?.name || "");
      }
    };

    fetchForUsersName();
  }, [event, slots]);

  // Fetch courses
  useEffect(() => {
    if (!operationId) return;

    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name")
        .eq("operation_id", operationId);

      setCourses(data || []);
    };

    fetchCourses();
  }, [operationId]);

  // Auto-update title when courses, subgroups, or teachers change
  useEffect(() => {
    if (selectedCourseId) {
      const course = courses.find(c => c.id === selectedCourseId);
      if (course) {
        let newTitle = course.name;
        if (subgroupLabel) newTitle += ` (${subgroupLabel})`;
        if (teacherCodenames) newTitle += ` (${teacherCodenames})`;
        setTitle(newTitle);
      }
    }
  }, [selectedCourseId, subgroupLabel, teacherCodenames, courses]);

  // Fetch teachers for the selected course
  useEffect(() => {
    if (!selectedCourseId) {
      setTeachers([]);
      return;
    }
    const fetchTeachers = async () => {
      const { data: modsData, error: modsError } = await supabase
        .from("course_moderators")
        .select("user_id")
        .eq("course_id", selectedCourseId);
      if (modsError) {
        console.error("Error fetching course moderators:", modsError);
        return;
      }
      const userIds = (modsData || []).map((m) => m.user_id);
      if (userIds.length === 0) {
        setTeachers([]);
        return;
      }
      const [{ data: usersData }, { data: staffsData }] = await Promise.all([
        supabase.from("users").select("id, name").in("id", userIds),
        supabase.from("staffs").select("id, codename").in("id", userIds),
      ]);
      setTeachers(
        (usersData || []).map((u) => ({
          id: u.id,
          name: u.name,
          codename: staffsData?.find((s) => s.id === u.id)?.codename || "",
        }))
      );
    };
    fetchTeachers();
  }, [selectedCourseId]);

  const startSlot = slots.find((s) => s.id === event.start_slot);
  const maxSerial = slots.find((s) => s.id === maxEndSlotId)?.serial_no;

  const endSlotOptions = slots
    .filter((s) => {
      if (!startSlot) return false;
      if (s.serial_no < startSlot.serial_no) return false;
      if (maxSerial && s.serial_no > maxSerial) return false;
      return true;
    })
    .map((s) => ({
      id: s.id,
      label: `${s.name}`,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert("Title is required");

    // Build title with single course
    const course = courses.find(c => c.id === selectedCourseId);
    let eventTitle = "";
    if (course) {
      eventTitle = course.name;
      if (subgroupLabel) eventTitle += ` (${subgroupLabel})`;
      if (teacherCodenames) eventTitle += ` (${teacherCodenames})`;
    }

    // Build description with single-course metadata
    const descriptionData = {
      subgroup: subgroupLabel,
      teachers: selectedTeacherIds,
      teacherCodenames: teacherCodenames,
      description: actualDescription
    };
    const finalDescription = JSON.stringify(descriptionData);

    const { error } = await supabase
      .from("recurring_events")
      .update({
        title: eventTitle,
        description: finalDescription,
        repeat_every: 1,
        start_week: 1,
        course_id: selectedCourseId || null,
        end_slot: endSlotId,
        is_reschedulable: isReschedulable,
      })
      .eq("id", event.id);

    if (error) {
      console.error("Error updating routine event:", error);
      alert("Error updating event");
    } else {
      const endSlot = slots.find((s) => s.id === endSlotId);
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const actorName = userData?.name || userData?.email || currentUserId || "Unknown user";

      notifyRoutineEventChange({
        action: "Updated",
        actor: actorName,
        eventData: {
          title,
          courseName: selectedCourse?.name,
          dayOfWeek: event.day_of_week,
          startSlot: slots.find((s) => s.id === event.start_slot)?.name,
          endSlot: endSlot?.name,
          targetType: event.from_table,
          targetName: forUsersLabel,
          description: actualDescription,
          teachers: teacherCodenames
        }
      }).catch((notifyError) => {
        console.warn("Routine event updated but Telegram notification failed:", notifyError);
      });

      onSuccess?.();
    }
  };
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("recurring_events")
      .delete()
      .eq("id", event.id);

    if (error) {
      console.error("Error deleting routine event:", error);
      alert("Error deleting event");
    } else {
      const actorName = userData?.name || userData?.email || currentUserId || "Unknown user";

      notifyRoutineEventChange({
        action: "Deleted",
        actor: actorName,
        eventData: {
          title: event.title,
          courseName: event.courses?.name,
          dayOfWeek: event.day_of_week,
          startSlot: slots.find((s) => s.id === event.start_slot)?.name,
          endSlot: slots.find((s) => s.id === event.end_slot)?.name,
          targetType: event.from_table,
          targetName: forUsersLabel,
          description: event.description
        }
      }).catch((notifyError) => {
        console.warn("Routine event deleted but Telegram notification failed:", notifyError);
      });

      onSuccess?.(); // refresh + close modal
    }
  };

  if (!event) return null;

  return (
    <form onSubmit={handleSubmit} className="form" style={{ width: "20vw" }}>
      <h2 className="form-title">Edit Routine Event</h2>

      {/* Title (auto-generated from course + subgroup) */}
      <div className="form-field">
        <label>Title (Course Name)</label>
        <input
          type="text"
          className="form-input"
          value={title}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>

      {/* Type (read only) */}
      <div className="form-field">
        <label>Type</label>
        <input
          type="text"
          className="form-input"
          value="slot"
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>

      {/* Start Slot (read only) */}
      <div className="form-field">
        <label>Start Slot</label>
        <input
          type="text"
          className="form-input"
          value={startSlotLabel}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>

      {/* End Slot */}
      <div className="form-field">
        <label>End Slot</label>
        <select
          className="form-select"
          value={endSlotId}
          onChange={(e) => setEndSlotId(e.target.value)}
        >
          {endSlotOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Day of Week (read only) */}
      <div className="form-field">
        <label>Day of Week</label>
        <input
          type="text"
          className="form-input"
          value={event.day_of_week}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>

      {/* Course */}
      <div className="form-field">
        <label>Course</label>
        <select
          className="form-select"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          required
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subgroup */}
      {selectedCourseId && (
        <div className="form-field">
          <label>Subgroup (optional)</label>
          <input
            type="text"
            className="form-input"
            value={subgroupLabel}
            onChange={(e) => setSubgroupLabel(e.target.value)}
            placeholder="e.g., B1/B2"
          />
        </div>
      )}

      {/* Teachers */}
      {selectedCourseId && teachers.length > 0 && (
        <div className="form-field">
          <label>Teachers</label>
          <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", borderRadius: "4px" }}>
            {teachers.map((t) => (
              <label key={t.id} style={{ display: "block", marginBottom: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedTeacherIds.includes(t.id)}
                  onChange={(e) => {
                    let newIds;
                    if (e.target.checked) {
                      newIds = [...selectedTeacherIds, t.id];
                    } else {
                      newIds = selectedTeacherIds.filter(id => id !== t.id);
                    }
                    setSelectedTeacherIds(newIds);
                    
                    // Update teacher codenames
                    const selectedTeachers = teachers.filter(teacher => newIds.includes(teacher.id));
                    const codenames = selectedTeachers.map(teacher => teacher.codename).filter(Boolean);
                    setTeacherCodenames(codenames.join(" + "));
                  }}
                />
                {" "}{t.name}{t.codename ? ` (${t.codename})` : ""}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* From Table (read only) */}
      <div className="form-field">
        <label>From Table</label>
        <input
          type="text"
          className="form-input"
          value={event.from_table}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>

      {/* For Users (read only) */}
      <div className="form-field">
        <label>For Users</label>
        <input
          type="text"
          className="form-input"
          value={forUsersLabel}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>

      {/* Description */}
      <div className="form-field">
        <label>Description</label>
        <textarea
          className="form-input"
          value={actualDescription}
          onChange={(e) => setActualDescription(e.target.value)}
        />
      </div>

      {/* Reschedulable */}
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={isReschedulable}
            onChange={(e) => setIsReschedulable(e.target.checked)}
          />{" "}
          Reschedulable
        </label>
      </div>

      {/* Buttons */}
      <div className="form-buttons" style={{ gap: "10px" }}>
        <button type="submit" className="form-submit">
          Update Event
        </button>

        <button
          type="button"
          className="form-cancel"
          onClick={() => onSuccess?.()}
        >
          Cancel
        </button>

        <button
          type="button"
          className="form-cancel"
          style={{ backgroundColor: "#d9534f", color: "white" }}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </form>
  );
}
