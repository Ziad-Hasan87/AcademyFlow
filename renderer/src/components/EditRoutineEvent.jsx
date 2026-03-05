import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { notifyRoutineEventChange } from "../utils/telegramNotifications";

export default function EditRoutineEvent({
  event,
  slots,
  maxEndSlotId,
  onSuccess,
}) {
  const { userData } = useAuth();
  const currentUserId = userData?.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [startWeek, setStartWeek] = useState(1);
  const [isReschedulable, setIsReschedulable] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [endSlotId, setEndSlotId] = useState("");
  const [forUsersLabel, setForUsersLabel] = useState("");
  const [startSlotLabel, setStartSlotLabel] = useState("");

  // Pre-fill form with existing event data
  useEffect(() => {
    if (!event) return;

    setTitle(event.title || "");
    setDescription(event.description || "");
    setRepeatEvery(event.repeat_every || 1);
    setStartWeek(event.start_week || 1);
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
    if (!event?.operation_id) return;

    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name")
        .eq("operation_id", event.operation_id);

      setCourses(data || []);
    };

    fetchCourses();
  }, [event]);

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

    const { error } = await supabase
      .from("recurring_events")
      .update({
        title,
        description,
        repeat_every: repeatEvery,
        start_week: startWeek,
        course_id: selectedCourseId || null,
        end_slot: endSlotId,
        is_reschedulable: isReschedulable,
        updated_by: currentUserId,
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
          description
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

      {/* Title */}
      <div className="form-field">
        <label>Title</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
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

      {/* Repeat Every */}
      <div className="form-field">
        <label>Repeat Every</label>
        <select
          className="form-select"
          value={repeatEvery}
          onChange={(e) => setRepeatEvery(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Start Week */}
      <div className="form-field">
        <label>Start Week</label>
        <select
          className="form-select"
          value={startWeek}
          onChange={(e) => setStartWeek(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Course */}
      <div className="form-field">
        <label>Course</label>
        <select
          className="form-select"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        >
          <option value="">None</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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