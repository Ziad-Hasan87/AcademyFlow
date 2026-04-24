import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function EditRoutineEvent({ event, slots = [], maxEndSlotId, onSuccess }) {
  const { userData } = useAuth();
  const instituteId = userData?.institute_id;

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

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [selectedTeacherToAdd, setSelectedTeacherToAdd] = useState("");
  const [selectedModerators, setSelectedModerators] = useState([]);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  const formatTimeToAMPM = (time24) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const getTeacherLabel = (teacher) => {
    const teacherName = teacher.users?.name || teacher.name || "Unknown";
    const codename = teacher.codename || "N/A";
    return `${teacherName} - ${codename}`;
  };

  const loadModeratorsFromUserIds = async (userIds) => {
    const normalizedIds = Array.from(new Set((userIds || []).filter(Boolean)));

    if (normalizedIds.length === 0) {
      setSelectedModerators([]);
      return;
    }

    const { data: staffRows, error: staffRowsError } = await supabase
      .from("staffs")
      .select("id, codename, users:users!staffs_id_fkey(name)")
      .in("id", normalizedIds);

    if (staffRowsError) {
      console.error("Error loading routine moderator profiles:", staffRowsError);
      setSelectedModerators([]);
      return;
    }

    const staffById = new Map((staffRows || []).map((teacher) => [teacher.id, teacher]));
    const mergedModerators = normalizedIds.map((id) => {
      const teacher = staffById.get(id);
      return {
        id,
        label: teacher ? getTeacherLabel(teacher) : `Unknown - ${id}`,
      };
    });

    setSelectedModerators(mergedModerators);
  };

  const loadRoutineModerators = async (recurringEventId, fallbackCourseId = null) => {
    if (!recurringEventId) return;

    const { data: moderatorRows, error: moderatorRowsError } = await supabase
      .from("recurring_event_moderators")
      .select("user_id")
      .eq("recurring_event_id", recurringEventId);

    if (moderatorRowsError) {
      console.error("Error fetching routine event moderators:", moderatorRowsError);
      if (!fallbackCourseId) {
        setSelectedModerators([]);
        return;
      }

      const { data: courseModeratorRows, error: courseModeratorError } = await supabase
        .from("course_moderators")
        .select("user_id")
        .eq("course_id", fallbackCourseId);

      if (courseModeratorError) {
        console.error("Error fetching fallback course moderators:", courseModeratorError);
        setSelectedModerators([]);
        return;
      }

      await loadModeratorsFromUserIds((courseModeratorRows || []).map((row) => row.user_id));
      return;
    }

    const userIds = (moderatorRows || []).map((row) => row.user_id).filter(Boolean);

    if (userIds.length > 0) {
      await loadModeratorsFromUserIds(userIds);
      return;
    }

    if (!fallbackCourseId) {
      setSelectedModerators([]);
      return;
    }

    const { data: courseModeratorRows, error: courseModeratorError } = await supabase
      .from("course_moderators")
      .select("user_id")
      .eq("course_id", fallbackCourseId);

    if (courseModeratorError) {
      console.error("Error fetching fallback course moderators:", courseModeratorError);
      setSelectedModerators([]);
      return;
    }

    await loadModeratorsFromUserIds((courseModeratorRows || []).map((row) => row.user_id));
  };

  const addSelectedModerator = () => {
    if (!selectedTeacherToAdd) return;

    const teacherToAdd = teachers.find((teacher) => teacher.id === selectedTeacherToAdd);
    if (!teacherToAdd) return;

    setSelectedModerators((prev) => {
      if (prev.some((moderator) => moderator.id === teacherToAdd.id)) return prev;
      return [
        ...prev,
        {
          id: teacherToAdd.id,
          label: getTeacherLabel(teacherToAdd),
        },
      ];
    });

    setSelectedTeacherToAdd("");
    setTeacherSearchQuery("");
    setShowTeacherDropdown(false);
  };

  const removeSelectedModerator = (userId) => {
    setSelectedModerators((prev) => prev.filter((moderator) => moderator.id !== userId));
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const teacherName = String(teacher.users?.name || teacher.name || "").toLowerCase();
    const query = teacherSearchQuery.trim().toLowerCase();

    if (!query) return true;

    return teacherName.includes(query);
  });

  const handleTeacherSearchChange = (value) => {
    setTeacherSearchQuery(value);
    setSelectedTeacherToAdd("");
    setShowTeacherDropdown(Boolean(value.trim()));
  };

  const handleTeacherOptionPick = (teacher) => {
    setTeacherSearchQuery(getTeacherLabel(teacher));
    setSelectedTeacherToAdd(teacher.id);
    setShowTeacherDropdown(false);
  };

  const syncRoutineEventModerators = async (recurringEventId) => {
    if (!recurringEventId) return false;

    const { error: deleteError } = await supabase
      .from("recurring_event_moderators")
      .delete()
      .eq("recurring_event_id", recurringEventId);

    if (deleteError) {
      console.error("Error clearing routine event moderators:", deleteError);
      return false;
    }

    if (selectedModerators.length === 0) {
      return true;
    }

    const rows = selectedModerators.map((moderator) => ({
      user_id: moderator.id,
      recurring_event_id: recurringEventId,
    }));

    const { error: insertError } = await supabase
      .from("recurring_event_moderators")
      .insert(rows);

    if (insertError) {
      console.error("Error saving routine event moderators:", insertError);
      return false;
    }

    return true;
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

    await loadRoutineModerators(event.id, eventData?.course_id || null);
  };

  useEffect(() => {
    fetchEventDetails();
  }, [event]);

  useEffect(() => {
    if (!instituteId) return;

    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("institute_id", instituteId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching departments:", error);
        return;
      }

      setDepartments(data || []);
    };

    fetchDepartments();
  }, [instituteId]);

  useEffect(() => {
    if (!selectedDepartment) {
      setTeachers([]);
      setSelectedTeacherToAdd("");
      setTeacherSearchQuery("");
      setShowTeacherDropdown(false);
      return;
    }

    supabase
      .from("staffs")
      .select("id, codename, users:users!staffs_id_fkey(name)")
      .eq("department_id", selectedDepartment)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching teachers:", error);
          return;
        }

        setTeachers(data || []);
      });
  }, [selectedDepartment]);

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
      const moderatorsSynced = await syncRoutineEventModerators(event.id);

      if (!moderatorsSynced) {
        alert("Routine event updated, but moderators could not be saved.");
      }

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

      <div className="form-group-box">
        <h4 className="form-section-title">Add Event Moderators</h4>

        <div className="form-field">
          <label>Department</label>
          <select
            className="form-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field autocomplete-container">
          <label>Teacher</label>
          <input
            className="form-input"
            placeholder="Type teacher name"
            value={teacherSearchQuery}
            onChange={(e) => handleTeacherSearchChange(e.target.value)}
            onFocus={() => setShowTeacherDropdown(Boolean(teacherSearchQuery.trim()))}
            disabled={!selectedDepartment}
            autoComplete="off"
          />

          {showTeacherDropdown && selectedDepartment && teacherSearchQuery.trim() && (
            <div className="autocomplete-list">
              {filteredTeachers.length === 0 ? (
                <div className="autocomplete-item moderator-empty-item">No teachers found</div>
              ) : (
                filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="autocomplete-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTeacherOptionPick(teacher);
                    }}
                  >
                    {getTeacherLabel(teacher)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="moderator-actions-row">
          <button
            type="button"
            className="form-submit"
            onClick={addSelectedModerator}
            disabled={!selectedTeacherToAdd}
          >
            Add
          </button>
        </div>

        {selectedModerators.length > 0 && (
          <ul className="moderator-list">
            {selectedModerators.map((moderator) => (
              <li key={moderator.id} className="moderator-item">
                <span className="moderator-name">{moderator.label}</span>
                <button
                  type="button"
                  className="moderator-remove-btn"
                  onClick={() => removeSelectedModerator(moderator.id)}
                  title="Remove moderator"
                  aria-label={`Remove ${moderator.label}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
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