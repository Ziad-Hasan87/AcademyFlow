import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function EditRoutineEvent({ event, slots = [], maxEndSlotId, onSuccess }) {
  const { userData } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [startWeek, setStartWeek] = useState(1);
  const [isReschedulable, setIsReschedulable] = useState(true);

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [endSlotId, setEndSlotId] = useState("");
  const [startSlotLabel, setStartSlotLabel] = useState("");
  const [endSlotOptions, setEndSlotOptions] = useState([]);

  const [fromTable, setFromTable] = useState("groups");

  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSubgroupId, setSelectedSubgroupId] = useState("");

  const formatTimeToAMPM = (time24) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const fetchEventDetails = async () => {
    if (!event) return;

    const { data: eventData, error } = await supabase
      .from("recurring_events")
      .select("*")
      .eq("id", event.id)
      .single();

    if (error) {
      console.error("Error fetching event:", error);
      return;
    }

    setTitle(eventData?.title || "");
    setDescription(eventData?.description || "");
    setRepeatEvery(eventData?.repeat_every || 1);
    setStartWeek(eventData?.start_week || 1);
    setIsReschedulable(eventData?.is_reschedulable ?? true);
    setSelectedCourseId(eventData?.course_id || "");
    setEndSlotId(eventData?.end_slot || "");
    setFromTable(eventData?.from_table || "groups");

    let routineProgramId = null;

    if (eventData?.routine_id) {
      const { data: routineData } = await supabase
        .from("routine")
        .select("operation_id")
        .eq("id", eventData.routine_id)
        .single();

      if (routineData?.operation_id) {

        const { data: opData } = await supabase
          .from("operations")
          .select("program_id")
          .eq("id", routineData.operation_id)
          .single();

        routineProgramId = opData?.program_id || null;

        const { data: coursesData } = await supabase
          .from("courses")
          .select("id,name")
          .eq("operation_id", routineData.operation_id);

        setCourses(coursesData || []);
      }
    }

    if (routineProgramId) {
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id,name")
        .eq("program_id", routineProgramId)
        .order("name");

      setGroups(groupsData || []);
    }

    if (eventData?.for_users && eventData?.from_table === "groups") {
      setSelectedGroupId(eventData.for_users);
      setSelectedSubgroupId("");
    }

    if (eventData?.for_users && eventData?.from_table === "subgroups") {

      const { data: subData } = await supabase
        .from("subgroups")
        .select("id,name,group_id")
        .eq("id", eventData.for_users)
        .single();

      if (subData?.group_id) {

        setSelectedGroupId(subData.group_id);
        setSelectedSubgroupId(subData.id);

        const { data: subgroupOptions } = await supabase
          .from("subgroups")
          .select("id,name")
          .eq("group_id", subData.group_id)
          .order("name");

        setSubgroups(subgroupOptions || []);
      }
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [event]);

  useEffect(() => {
    if (!slots.length || !event) return;

    const startSlot = slots.find((s) => s.id === event.start_slot);

    if (!startSlot) {
      console.warn("Start slot not found");
      return;
    }

    setStartSlotLabel(
      `${startSlot.name} ${formatTimeToAMPM(startSlot.start)} - ${formatTimeToAMPM(startSlot.end)}`
    );

    const maxSerial = maxEndSlotId
      ? slots.find((s) => s.id === maxEndSlotId)?.serial_no
      : null;

    const options = slots
      .filter(
        (s) =>
          s.serial_no >= startSlot.serial_no &&
          (!maxSerial || s.serial_no <= maxSerial)
      )
      .map((s) => ({
        id: s.id,
        label: `${s.name} ${formatTimeToAMPM(s.start)} - ${formatTimeToAMPM(s.end)}`
      }));

    setEndSlotOptions(options);

  }, [slots, event, maxEndSlotId]);

  useEffect(() => {

    const fetchSubgroups = async () => {

      if (fromTable !== "subgroups" || !selectedGroupId) {
        setSubgroups([]);
        setSelectedSubgroupId("");
        return;
      }

      const { data } = await supabase
        .from("subgroups")
        .select("id,name")
        .eq("group_id", selectedGroupId)
        .order("name");

      setSubgroups(data || []);
    };

    fetchSubgroups();

  }, [fromTable, selectedGroupId]);

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!title) return alert("Title is required");

    let selectedForUsers = null;

    if (fromTable === "groups") {

      if (!selectedGroupId) return alert("Select a group");

      selectedForUsers = selectedGroupId;
    }

    if (fromTable === "subgroups") {

      if (!selectedGroupId) return alert("Select group first");

      if (!selectedSubgroupId) return alert("Select subgroup");

      selectedForUsers = selectedSubgroupId;
    }

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
        from_table: fromTable,
        for_users: selectedForUsers
      })
      .eq("id", event.id);

    if (error) {

      console.error("Error updating event:", error);

      alert("Error updating event");

    } else {

      onSuccess?.();
    }
  };

  const handleDelete = async () => {

    if (!window.confirm("Delete this event?")) return;

    const { error } = await supabase
      .from("recurring_events")
      .delete()
      .eq("id", event.id);

    if (error) {

      console.error("Delete error:", error);

      alert("Error deleting event");

    } else {

      onSuccess?.();
    }
  };

  if (!event) return null;

  return (
    <form onSubmit={handleSubmit} className="form" style={{ width: "20vw" }}>

      <h2 className="form-title">Edit Routine Event</h2>

      <div className="form-field">
        <label>Title</label>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label>Start Slot</label>
        <input
          className="form-input"
          value={startSlotLabel}
          readOnly
          style={{ background: "#f0f0f0" }}
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
        <label>Day</label>
        <input
          className="form-input"
          value={event.day_of_week}
          readOnly
          style={{ background: "#f0f0f0" }}
        />
      </div>

      <div className="form-field">
        <label>Repeat Every</label>
        <select
          className="form-select"
          value={repeatEvery}
          onChange={(e) => setRepeatEvery(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map(v => (
            <option key={v} value={v}>{v}</option>
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
          {[1, 2, 3, 4, 5].map((week) => (
            <option key={week} value={week}>
              Week {week}
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
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>From Table</label>
        <select
          className="form-select"
          value={fromTable}
          onChange={(e) => setFromTable(e.target.value)}
        >
          <option value="groups">groups</option>
          <option value="subgroups">subgroups</option>
        </select>
      </div>

      <div className="form-field">
        <label>Group</label>
        <select
          className="form-select"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">Select Group</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {fromTable === "subgroups" && (
        <div className="form-field">
          <label>Subgroup</label>
          <select
            className="form-select"
            value={selectedSubgroupId}
            onChange={(e) => setSelectedSubgroupId(e.target.value)}
          >
            <option value="">Select Subgroup</option>
            {subgroups.map(sg => (
              <option key={sg.id} value={sg.id}>{sg.name}</option>
            ))}
          </select>
        </div>
      )}

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
          />
          Reschedulable
        </label>
      </div>

      <div className="form-buttons" style={{ gap: "10px" }}>
        <button className="form-submit" type="submit">
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
          style={{ background: "#d9534f", color: "white" }}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

    </form>
  );
}