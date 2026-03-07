import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function EditRoutineEvent({ event, slots = [], maxEndSlotId, onSuccess }) {
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
  const [fromTable, setFromTable] = useState("groups");
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSubgroupId, setSelectedSubgroupId] = useState("");
  const [startSlotLabel, setStartSlotLabel] = useState("");
  const [endSlotOptions, setEndSlotOptions] = useState([]);

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

    // 1. Get the recurring event
    const { data: eventData, error: eventError } = await supabase
      .from("recurring_events")
      .select("*")
      .eq("id", event.id)
      .single();
    if (eventError) {
      console.error("Error fetching event:", eventError);
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

    // 2. Fetch routine → operation → courses
    let routineProgramId = null;
    if (eventData?.routine_id) {
      const { data: routineData, error: routineError } = await supabase
        .from("routine")
        .select("id, operation_id")
        .eq("id", eventData.routine_id)
        .single();

      if (routineError) console.error("Error fetching routine:", routineError);
      else if (routineData?.operation_id) {
        const { data: opData, error: opError } = await supabase
          .from("operations")
          .select("id, program_id")
          .eq("id", routineData.operation_id)
          .single();
        if (opError) {
          console.error("Error fetching operation:", opError);
        } else {
          routineProgramId = opData?.program_id || null;
        }

        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, name")
          .eq("operation_id", routineData.operation_id);
        if (!coursesError) setCourses(coursesData || []);
        else console.error("Error fetching courses:", coursesError);
      }
    }

    // 3. Fetch groups and resolve selected group/subgroup from existing for_users
    if (routineProgramId) {
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("program_id", routineProgramId)
        .order("name", { ascending: true });
      if (groupsError) {
        console.error("Error fetching groups:", groupsError);
      } else {
        setGroups(groupsData || []);
      }
    }

    if (eventData?.for_users && eventData?.from_table === "groups") {
      setSelectedGroupId(eventData.for_users);
      setSelectedSubgroupId("");
    }

    if (eventData?.for_users && eventData?.from_table === "subgroups") {
      const { data: subData, error: subError } = await supabase
        .from("subgroups")
        .select("id, name, group_id")
        .eq("id", eventData.for_users)
        .single();

      if (subError) {
        console.error("Error fetching selected subgroup:", subError);
      } else if (subData?.group_id) {
        setSelectedGroupId(subData.group_id);
        setSelectedSubgroupId(subData.id);

        const { data: subgroupOptions, error: subgroupOptionsError } = await supabase
          .from("subgroups")
          .select("id, name")
          .eq("group_id", subData.group_id)
          .order("name", { ascending: true });

        if (subgroupOptionsError) {
          console.error("Error fetching subgroups:", subgroupOptionsError);
        } else {
          setSubgroups(subgroupOptions || []);
        }
      }
    }

    // 4. Set start slot label and end slot options
    if (slots.length > 0) {
      console.log("Slots available:", slots);
      const startSlot = slots.find((s) => s.id === eventData.start_slot);
      if (startSlot) {
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
          .map((s) => ({ id: s.id, label: s.name }));

        setEndSlotOptions(options);

        // Pre-select endSlotId if not already set
        if (!endSlotId && options.length > 0) setEndSlotId(options[0].id);
      }
    }
    else {
      console.warn("No slots available to set start slot label and end slot options.");
    }
  };

  useEffect(() => {
    if (!event) return;
    fetchEventDetails();
  }, [event, slots]);

  useEffect(() => {
    const fetchSubgroupsForGroup = async () => {
      if (fromTable !== "subgroups" || !selectedGroupId) {
        setSubgroups([]);
        if (fromTable !== "subgroups") {
          setSelectedSubgroupId("");
        }
        return;
      }

      const { data, error } = await supabase
        .from("subgroups")
        .select("id, name")
        .eq("group_id", selectedGroupId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching subgroups:", error);
        setSubgroups([]);
      } else {
        setSubgroups(data || []);
      }
    };

    fetchSubgroupsForGroup();
  }, [fromTable, selectedGroupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert("Title is required");

    let selectedForUsers = null;
    if (fromTable === "groups") {
      if (!selectedGroupId) return alert("Please select a group");
      selectedForUsers = selectedGroupId;
    } else if (fromTable === "subgroups") {
      if (!selectedGroupId) return alert("Please select a group first");
      if (!selectedSubgroupId) return alert("Please select a subgroup");
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
        for_users: selectedForUsers,
        updated_by: currentUserId,
      })
      .eq("id", event.id);

    if (error) {
      console.error("Error updating routine event:", error);
      alert("Error updating event");
    } else onSuccess?.();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    const { error } = await supabase.from("recurring_events").delete().eq("id", event.id);
    if (error) {
      console.error("Error deleting routine event:", error);
      alert("Error deleting event");
    } else onSuccess?.();
  };

  if (!event) return null;

  return (
    <form onSubmit={handleSubmit} className="form" style={{ width: "20vw" }}>
      <h2 className="form-title">Edit Routine Event</h2>

      <div className="form-field">
        <label>Title</label>
        <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="form-field">
        <label>Type</label>
        <input type="text" className="form-input" value="slot" readOnly style={{ backgroundColor: "#f0f0f0", color: "#555" }} />
      </div>

      <div className="form-field">
        <label>Start Slot</label>
        <input type="text" className="form-input" value={startSlotLabel} readOnly style={{ backgroundColor: "#f0f0f0", color: "#555" }} />
      </div>

      <div className="form-field">
        <label>End Slot</label>
        <select className="form-select" value={endSlotId} onChange={(e) => setEndSlotId(e.target.value)}>
          {endSlotOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>Day of Week</label>
        <input type="text" className="form-input" value={event.day_of_week} readOnly style={{ backgroundColor: "#f0f0f0", color: "#555" }} />
      </div>

      <div className="form-field">
        <label>Repeat Every</label>
        <select className="form-select" value={repeatEvery} onChange={(e) => setRepeatEvery(Number(e.target.value))}>
          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>Start Week</label>
        <select className="form-select" value={startWeek} onChange={(e) => setStartWeek(Number(e.target.value))}>
          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>Course</label>
        <select className="form-select" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
          <option value="">None</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>From Table</label>
        <select
          className="form-select"
          value={fromTable}
          onChange={(e) => {
            const value = e.target.value;
            setFromTable(value);
            if (value === "groups") {
              setSelectedSubgroupId("");
            }
          }}
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
          onChange={(e) => {
            const nextGroupId = e.target.value;
            setSelectedGroupId(nextGroupId);
            if (fromTable === "subgroups") {
              setSelectedSubgroupId("");
            }
          }}
          required
        >
          <option value="">Select Group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
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
            required
            disabled={!selectedGroupId}
          >
            <option value="">Select Subgroup</option>
            {subgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-field">
        <label>Description</label>
        <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="form-field">
        <label>
          <input type="checkbox" checked={isReschedulable} onChange={(e) => setIsReschedulable(e.target.checked)} /> Reschedulable
        </label>
      </div>

      <div className="form-buttons" style={{ gap: "10px" }}>
        <button type="submit" className="form-submit">Update Event</button>
        <button type="button" className="form-cancel" onClick={() => onSuccess?.()}>Cancel</button>
        <button type="button" className="form-cancel" style={{ backgroundColor: "#d9534f", color: "white" }} onClick={handleDelete}>Delete</button>
      </div>
    </form>
  );
}