import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function EditRoutineEvent({
  eventId,
  routineId,
  onClose, // callback after update or delete
}) {
  const { userData } = useAuth();
  const currentUserId = userData?.id;
  const currentInstituteId = userData?.institute_id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [startWeek, setStartWeek] = useState(1);
  const [isReschedulable, setIsReschedulable] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [slots, setSlots] = useState([]);
  const [startSlotId, setStartSlotId] = useState("");
  const [endSlotId, setEndSlotId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [fromTable, setFromTable] = useState("");
  const [forUsers, setForUsers] = useState("");
  const [forUsersLabel, setForUsersLabel] = useState("");

  // Fetch existing event data
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("recurring_events")
        .select(`*, courses(id, name)`)
        .eq("id", eventId)
        .single();

      if (error) {
        console.error("Error fetching event:", error);
        return;
      }

      setTitle(data.title || "");
      setDescription(data.description || "");
      setRepeatEvery(data.repeat_every || 1);
      setStartWeek(data.start_week || 1);
      setIsReschedulable(data.is_reschedulable ?? true);
      setSelectedCourseId(data.course_id || "");
      setStartSlotId(data.start_slot);
      setEndSlotId(data.end_slot);
      setDayOfWeek(data.day_of_week);
      setFromTable(data.from_table);
      setForUsers(data.for_users);
    };

    fetchEvent();
  }, [eventId]);

  // Fetch slot info
  useEffect(() => {
    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from("slotinfo")
        .select("*")
        .order("serial_no", { ascending: true });
      if (error) console.error(error);
      else setSlots(data || []);
    };
    fetchSlots();
  }, []);

  // Fetch courses based on routine/operation
  useEffect(() => {
    const fetchCourses = async () => {
      if (!routineId) return;
      // Assuming routine contains operationId, otherwise fetch it
      const { data: routineData, error: routineError } = await supabase
        .from("operations")
        .select("program_id")
        .eq("id", routineId)
        .single();

      const operationId = routineData?.program_id;
      if (!operationId) return;

      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("operation_id", operationId);
      if (error) console.error(error);
      else setCourses(data || []);
    };
    fetchCourses();
  }, [routineId]);

  // Fetch the label for group/subgroup
  useEffect(() => {
    const fetchForUsersName = async () => {
      if (!forUsers || !fromTable) return;
      if (fromTable === "groups") {
        const { data, error } = await supabase
          .from("groups")
          .select("name")
          .eq("id", forUsers)
          .single();
        if (!error) setForUsersLabel(data?.name || "");
      } else if (fromTable === "subgroups") {
        const { data, error } = await supabase
          .from("subgroups")
          .select("name")
          .eq("id", forUsers)
          .single();
        if (!error) setForUsersLabel(data?.name || "");
      }
    };
    fetchForUsersName();
  }, [forUsers, fromTable]);

  const formatTimeToAMPM = (time24) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const startSlot = slots.find((s) => s.id === startSlotId);
  const startSlotLabel = startSlot
    ? `${startSlot.name} ${formatTimeToAMPM(startSlot.start)} - ${formatTimeToAMPM(startSlot.end)}`
    : "";

  const endSlotOptions = slots
    .filter((s) => s.serial_no >= (startSlot?.serial_no || 0))
    .map((s) => ({
      id: s.id,
      label: `${s.name} ${formatTimeToAMPM(s.start)} - ${formatTimeToAMPM(s.end)}`,
    }));

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!title) return alert("Title is required");

    const { error } = await supabase
      .from("recurring_events")
      .update({
        title,
        description,
        repeat_every: repeatEvery,
        start_week: startWeek,
        is_reschedulable: isReschedulable,
        start_slot: startSlotId,
        end_slot: endSlotId,
        day_of_week: dayOfWeek,
        course_id: selectedCourseId || null,
      })
      .eq("id", eventId);

    if (error) {
      console.error(error);
      alert("Error updating event");
    } else {
      onClose?.();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    const { error } = await supabase
      .from("recurring_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error(error);
      alert("Error deleting event");
    } else {
      onClose?.();
    }
  };

  return (
    <form onSubmit={handleUpdate} className="form" style={{ width: "20vw" }}>
      <h2 className="form-title">Edit Routine Event</h2>

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

      <div className="form-field">
        <label>Start Slot</label>
        <input
          type="text"
          className="form-input"
          value={startSlotLabel}
          readOnly
        />
      </div>

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

      <div className="form-field">
        <label>Day of Week</label>
        <input type="text" className="form-input" value={dayOfWeek} readOnly />
      </div>

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

      <div className="form-field">
        <label>From Table</label>
        <input type="text" className="form-input" value={fromTable} readOnly />
      </div>

      <div className="form-field">
        <label>For Users</label>
        <input type="text" className="form-input" value={forUsersLabel} readOnly />
      </div>

      <div className="form-field">
        <label>Description</label>
        <textarea
          className="form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

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

      <div className="form-buttons">
        <button type="submit" className="form-submit">
          Update Event
        </button>
        <button type="button" className="form-cancel" onClick={handleDelete}>
          Delete Event
        </button>
        <button type="button" className="form-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}