import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function CreateRoutineEvent({
  routineId,
  slotId,
  dayOfWeek,
  fromTable,
  forUsers,
  operationId,
  onSuccess,
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
  const [endSlotId, setEndSlotId] = useState("");
  const [forUsersLabel, setForUsersLabel] = useState("");

  useEffect(() => {
    const fetchForUsersName = async () => {
      if (!forUsers || !fromTable) return;

      if (fromTable === "groups") {
        const { data, error } = await supabase
          .from("groups")
          .select("name")
          .eq("id", forUsers)
          .single();
        if (error) console.error("Error fetching group name:", error);
        else setForUsersLabel(data?.name || "");
      } else if (fromTable === "subgroups") {
        const { data, error } = await supabase
          .from("subgroups")
          .select("name")
          .eq("id", forUsers)
          .single();
        if (error) console.error("Error fetching subgroup name:", error);
        else setForUsersLabel(data?.name || "");
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

  const startSlot = slots.find((s) => s.id === slotId);
  const startSlotLabel = startSlot
    ? `${startSlot.name} ${formatTimeToAMPM(startSlot.start)} - ${formatTimeToAMPM(startSlot.end)}`
    : "";

  const endSlotOptions = slots
    .filter(
      (s) =>
        s.serial_no >= (startSlot?.serial_no || 0)
    )
    .map((s) => ({
      id: s.id,
      label: `${s.name} ${formatTimeToAMPM(s.start)} - ${formatTimeToAMPM(s.end)}`,
    }));

  useEffect(() => {
    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from("slotinfo")
        .select("*")
        .order("serial_no", { ascending: true });
      if (error) console.error("Error fetching slots:", error);
      else setSlots(data || []);
    };
    fetchSlots();
  }, []);

  useEffect(() => {
    if (slotId) setEndSlotId(slotId);
  }, [slotId]);

  useEffect(() => {
    if (!operationId) return;
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("operation_id", operationId)
        .ilike("name", "%");
      if (error) console.error("Error fetching courses:", error);
      else setCourses(data || []);
    };
    fetchCourses();
  }, [operationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert("Title is required");

    const { data, error } = await supabase.from("recurring_events").insert({
      title,
      type: "slot",
      start_at: null,
      end_at: null,
      expire_at: null,
      start_slot: slotId,
      end_slot: endSlotId,
      day_of_week: dayOfWeek,
      repeat_every: repeatEvery,
      start_week: startWeek,
      course_id: selectedCourseId || null,
      institute_id: currentInstituteId,
      created_by: currentUserId,
      description,
      is_reschedulable: isReschedulable,
      from_table: fromTable,
      for_users: forUsers,
      routine_id: routineId,
    });

    if (error) {
      console.error("Error creating routine event:", error);
      alert("Error creating event");
    } else {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" style={{ width: "20vw" }}>
      <h2 className="form-title">Create Routine Event</h2>

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

      {/* Type */}
      <div className="form-field">
        <label>Type</label>
        <input
          type="text"
          className="form-input"
          value="slot"
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555"}}
        />
      </div>

      {/* Start Slot */}
      <div className="form-field">
        <label>Start Slot</label>
        <input
          type="text"
          className="form-input"
          value={startSlotLabel}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555"}}
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

      {/* Day of Week */}
      <div className="form-field">
        <label>Day of Week</label>
        <input
          type="text"
          className="form-input"
          value={dayOfWeek}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555"}}
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
      <div className="form-field autocomplete-container">
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
      {/* From Table */}
      <div className="form-field">
        <label>From Table</label>
        <input
          type="text"
          className="form-input"
          value={fromTable}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555"}}
        />
      </div>
      {/* For Users */}
      <div className="form-field">
        <label>For Users</label>
        <input
          type="text"
          className="form-input"
          value={forUsersLabel}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555"}}
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

      {/* Submit and Cancel */}
      <div className="form-buttons">
        <button type="submit" className="form-submit">
          Create Event
        </button>
        <button
          type="button"
          className="form-cancel"
          onClick={() => onSuccess?.()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}