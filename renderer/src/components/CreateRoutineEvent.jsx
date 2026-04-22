import { useCallback, useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { notifyRoutineEventChange } from "../utils/telegramNotifications";

export default function CreateRoutineEvent({
  routineId,
  slotId,
  dayOfWeek,
  fromTable,
  forUsers,
  operationId,
  slots,
  maxEndSlotId,
  onSuccess,
}) {
  const { userData } = useAuth();
  const currentUserId = userData?.id;
  const currentInstituteId = userData?.institute_id;

  const [title, setTitle] = useState("");
  const [isTitleCustomized, setIsTitleCustomized] = useState(false);
  const [description, setDescription] = useState("");
  const [isReschedulable, setIsReschedulable] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(""); // First course
  const [selectedCourseId2, setSelectedCourseId2] = useState(""); // Second optional course

  // Course 1 fields
  const [subgroupLabel1, setSubgroupLabel1] = useState("");
  const [teachers1, setTeachers1] = useState([]);
  const [selectedTeacherIds1, setSelectedTeacherIds1] = useState([]);
  const [teacherCodenames1, setTeacherCodenames1] = useState("");

  // Course 2 fields
  const [subgroupLabel2, setSubgroupLabel2] = useState("");
  const [teachers2, setTeachers2] = useState([]);
  const [selectedTeacherIds2, setSelectedTeacherIds2] = useState([]);
  const [teacherCodenames2, setTeacherCodenames2] = useState("");

  const [actualDescription, setActualDescription] = useState("");
  const [endSlotId, setEndSlotId] = useState("");
  const [forUsersLabel, setForUsersLabel] = useState("");
  const [startWeek, setStartWeek] = useState(1);
  const [repeatEvery, setRepeatEvery] = useState(1);

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

  const maxSerial = slots.find((s) => s.id === maxEndSlotId)?.serial_no;

  const endSlotOptions = slots
    .filter((s) => {
      const startSerial = startSlot?.serial_no || 0;
      if (s.serial_no < startSerial) return false;
      if (maxSerial && s.serial_no > maxSerial) return false;
      return true;
    })
    .map((s) => ({
      id: s.id,
      label: `${s.name} ${formatTimeToAMPM(s.start)} - ${formatTimeToAMPM(s.end)}`,
    }));

  useEffect(() => {
    if (slotId) setEndSlotId(slotId);
  }, [slotId]);

  // Fetch teachers for Course 1
  useEffect(() => {
    if (!selectedCourseId) {
      setTeachers1([]);
      setSelectedTeacherIds1([]);
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
        setTeachers1([]);
        return;
      }
      const [{ data: usersData }, { data: staffsData }] = await Promise.all([
        supabase.from("users").select("id, name").in("id", userIds),
        supabase.from("staffs").select("id, codename").in("id", userIds),
      ]);
      setTeachers1(
        (usersData || []).map((u) => ({
          id: u.id,
          name: u.name,
          codename: staffsData?.find((s) => s.id === u.id)?.codename || "",
        }))
      );
      setSelectedTeacherIds1([]);
    };
    fetchTeachers();
  }, [selectedCourseId]);

  // Fetch teachers for Course 2
  useEffect(() => {
    if (!selectedCourseId2) {
      setTeachers2([]);
      setSelectedTeacherIds2([]);
      return;
    }
    const fetchTeachers = async () => {
      const { data: modsData, error: modsError } = await supabase
        .from("course_moderators")
        .select("user_id")
        .eq("course_id", selectedCourseId2);
      if (modsError) {
        console.error("Error fetching course moderators:", modsError);
        return;
      }
      const userIds = (modsData || []).map((m) => m.user_id);
      if (userIds.length === 0) {
        setTeachers2([]);
        return;
      }
      const [{ data: usersData }, { data: staffsData }] = await Promise.all([
        supabase.from("users").select("id, name").in("id", userIds),
        supabase.from("staffs").select("id, codename").in("id", userIds),
      ]);
      setTeachers2(
        (usersData || []).map((u) => ({
          id: u.id,
          name: u.name,
          codename: staffsData?.find((s) => s.id === u.id)?.codename || "",
        }))
      );
      setSelectedTeacherIds2([]);
    };
    fetchTeachers();
  }, [selectedCourseId2]);

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

  const buildAutoTitle = useCallback(() => {
    const titleParts = [];

    if (selectedCourseId) {
      const course1 = courses.find((c) => c.id === selectedCourseId);
      if (course1) {
        let line1 = course1.name;
        if (subgroupLabel1) line1 += ` (${subgroupLabel1})`;
        if (teacherCodenames1) line1 += ` (${teacherCodenames1})`;
        titleParts.push(line1);
      }
    }

    if (selectedCourseId2) {
      const course2 = courses.find((c) => c.id === selectedCourseId2);
      if (course2) {
        let line2 = course2.name;
        if (subgroupLabel2) line2 += ` (${subgroupLabel2})`;
        if (teacherCodenames2) line2 += ` (${teacherCodenames2})`;
        titleParts.push(line2);
      }
    }

    return titleParts.join(" | ");
  }, [
    selectedCourseId,
    selectedCourseId2,
    subgroupLabel1,
    subgroupLabel2,
    teacherCodenames1,
    teacherCodenames2,
    courses,
  ]);

  // Auto-update title when courses, subgroups, or teachers change
  useEffect(() => {
    if (!isTitleCustomized) {
      setTitle(buildAutoTitle());
    }
  }, [
    isTitleCustomized,
    buildAutoTitle,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return alert("Please select at least one course");

    const autoTitle = buildAutoTitle();
    const eventTitle = title.trim() || autoTitle;

    // Build description with metadata for both courses
    const descriptionData = {
      course1: {
        subgroup: subgroupLabel1,
        teachers: selectedTeacherIds1,
        teacherCodenames: teacherCodenames1
      },
      course2: selectedCourseId2 ? {
        subgroup: subgroupLabel2,
        teachers: selectedTeacherIds2,
        teacherCodenames: teacherCodenames2
      } : null,
      courseId2: selectedCourseId2 || "",
      description: actualDescription
    };
    const finalDescription = JSON.stringify(descriptionData);

    // Create ONE event with both courses
    const eventData = {
      title: eventTitle,
      type: "slot",
      start_at: null,
      end_at: null,
      expire_at: null,
      start_slot: slotId,
      end_slot: endSlotId,
      day_of_week: dayOfWeek,
      repeat_every: repeatEvery,
      start_week: startWeek,
      course_id: selectedCourseId, // Primary course
      institute_id: currentInstituteId,
      created_by: currentUserId,
      description: finalDescription,
      is_reschedulable: isReschedulable,
      from_table: fromTable,
      for_users: forUsers,
      routine_id: routineId,
    };

    const { data, error } = await supabase.from("recurring_events").insert(eventData);

    if (error) {
      console.error("Error creating routine events:", error);
      alert("Error creating events");
    } else {
      const endSlot = slots.find((s) => s.id === endSlotId);
      const course1Name = courses.find(c => c.id === selectedCourseId)?.name || "";
      const course2Name = selectedCourseId2 ? courses.find(c => c.id === selectedCourseId2)?.name || "" : "";
      const selectedCourseNames = [course1Name, course2Name].filter(Boolean).join(", ");
      const actorName = userData?.name || userData?.email || currentUserId || "Unknown user";

      notifyRoutineEventChange({
        action: "Created",
        actor: actorName,
        eventData: {
          title: eventTitle,
          courseName: selectedCourseNames,
          dayOfWeek,
          startSlot: startSlot?.name,
          endSlot: endSlot?.name,
          targetType: fromTable,
          targetName: forUsersLabel,
          description: actualDescription,
          teachers: [teacherCodenames1, teacherCodenames2].filter(Boolean).join(", ")
        }
      }).catch((notifyError) => {
        console.warn("Routine events created but Telegram notification failed:", notifyError);
      });

      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" style={{ width: "20vw" }}>
      <h2 className="form-title">Create Routine Event</h2>

      {/* Title (auto-generated from course + subgroup) */}
      <div className="form-field">
        <label>Title (Course Name)</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => {
            const nextValue = e.target.value;
            setTitle(nextValue);
            setIsTitleCustomized(nextValue.trim().length > 0);
          }}
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
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
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

      {/* Day of Week */}
      <div className="form-field">
        <label>Day of Week</label>
        <input
          type="text"
          className="form-input"
          value={dayOfWeek}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
        />
      </div>
      {/* Repeat Every */}
      <div className="form-field">
        <label>Repeat Every (Weeks)</label>
        <select
          className="form-select"
          value={repeatEvery}
          onChange={(e) => setRepeatEvery(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>
              {num} Week{num > 1 ? "s" : ""}
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
          {[1, 2, 3, 4, 5].map((week) => (
            <option key={week} value={week}>
              Week {week}
            </option>
          ))}
        </select>
      </div>

      {/* Course 1 */}
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

      {/* Subgroup for Course 1 */}
      {selectedCourseId && (
        <div className="form-field">
          <label>Subgroup for {courses.find(c => c.id === selectedCourseId)?.name || "Course 1"} (optional)</label>
          <input
            type="text"
            className="form-input"
            value={subgroupLabel1}
            onChange={(e) => setSubgroupLabel1(e.target.value)}
            placeholder="e.g., B1/B2"
          />
        </div>
      )}

      {/* Teachers for Course 1 */}
      {selectedCourseId && teachers1.length > 0 && (
        <div className="form-field">
          <label>Teachers for {courses.find(c => c.id === selectedCourseId)?.name || "Course 1"}</label>
          <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", borderRadius: "4px" }}>
            {teachers1.map((t) => (
              <label key={t.id} style={{ display: "block", marginBottom: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedTeacherIds1.includes(t.id)}
                  onChange={(e) => {
                    let newIds;
                    if (e.target.checked) {
                      newIds = [...selectedTeacherIds1, t.id];
                    } else {
                      newIds = selectedTeacherIds1.filter(id => id !== t.id);
                    }
                    setSelectedTeacherIds1(newIds);

                    // Update teacher codenames
                    const selectedTeachers = teachers1.filter(teacher => newIds.includes(teacher.id));
                    const codenames = selectedTeachers.map(teacher => teacher.codename).filter(Boolean);
                    setTeacherCodenames1(codenames.join(" + "));
                  }}
                />
                {" "}{t.name}{t.codename ? ` (${t.codename})` : ""}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Course 2 (Optional) */}
      <div className="form-field">
        <label>Course 2 (optional)</label>
        <select
          className="form-select"
          value={selectedCourseId2}
          onChange={(e) => setSelectedCourseId2(e.target.value)}
        >
          <option value="">None</option>
          {courses.filter(c => c.id !== selectedCourseId).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subgroup for Course 2 */}
      {selectedCourseId2 && (
        <div className="form-field">
          <label>Subgroup for {courses.find(c => c.id === selectedCourseId2)?.name || "Course 2"} (optional)</label>
          <input
            type="text"
            className="form-input"
            value={subgroupLabel2}
            onChange={(e) => setSubgroupLabel2(e.target.value)}
            placeholder="e.g., B2/B1"
          />
        </div>
      )}

      {/* Teachers for Course 2 */}
      {selectedCourseId2 && teachers2.length > 0 && (
        <div className="form-field">
          <label>Teachers for {courses.find(c => c.id === selectedCourseId2)?.name || "Course 2"}</label>
          <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", borderRadius: "4px" }}>
            {teachers2.map((t) => (
              <label key={t.id} style={{ display: "block", marginBottom: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedTeacherIds2.includes(t.id)}
                  onChange={(e) => {
                    let newIds;
                    if (e.target.checked) {
                      newIds = [...selectedTeacherIds2, t.id];
                    } else {
                      newIds = selectedTeacherIds2.filter(id => id !== t.id);
                    }
                    setSelectedTeacherIds2(newIds);

                    // Update teacher codenames
                    const selectedTeachers = teachers2.filter(teacher => newIds.includes(teacher.id));
                    const codenames = selectedTeachers.map(teacher => teacher.codename).filter(Boolean);
                    setTeacherCodenames2(codenames.join(" + "));
                  }}
                />
                {" "}{t.name}{t.codename ? ` (${t.codename})` : ""}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* From Table */}
      <div className="form-field">
        <label>From Table</label>
        <input
          type="text"
          className="form-input"
          value={fromTable}
          readOnly
          style={{ backgroundColor: "#f0f0f0", color: "#555" }}
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