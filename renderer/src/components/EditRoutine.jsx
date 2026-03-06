import { useEffect, useState } from "react";
import { fetchSlots, fetchGroups, fetchSubgroups } from "../utils/fetch";
import Modal from "./Modal";
import CreateRoutineEvent from "./CreateRoutineEvent";
import supabase from "../utils/supabase";
import React from "react";
import EditRoutineEvent from "./EditRoutineEvent";
import GenerateRoutineEvents from "./GenerateRoutineEvents";
import DeleteRoutineEvents from "./DeleteRoutineEvents";

export default function EditRoutine({ selectedOperation, routine, onClose }) {
  const [slots, setSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [subgroups, setSubgroups] = useState([]);
  const [selectedSubgroup, setSelectedSubgroup] = useState("");
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const totalCols = slots.length+1;
  const totalRows = days.length+1;

  // Fetch slots for the selected operation
  useEffect(() => {
    if (!selectedOperation) return;
    fetchSlots(selectedOperation.id, setSlots);
  }, [selectedOperation]);

  // Fetch program ID from the operation
  useEffect(() => {
    if (!selectedOperation) return;

    const fetchProgram = async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("program_id")
        .eq("id", selectedOperation.id)
        .single();

      if (error) {
        console.error("Error fetching program_id:", error);
        return;
      }
      setSelectedProgram(data?.program_id || null);
    };

    fetchProgram();
  }, [selectedOperation]);

  useEffect(() => {
    if (!selectedGroup) {
      setSubgroups([]);
      setSelectedSubgroup("");
      return;
    }

    const fetchAllSubgroups = async () => {
      await fetchSubgroups(selectedGroup, "", setSubgroups, setLoadingSubgroups);
    };

    fetchAllSubgroups();
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedProgram) return;

    fetchGroups(selectedProgram, "", setGroups, setLoadingGroups);
  }, [selectedProgram]);

  useEffect(() => {
    if (!selectedGroup && groups.length > 0) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
    if (!routine?.id) return;

    const fetchRoutineEvents = async () => {
      const { data, error } = await supabase
        .from("recurring_events")
        .select(`
          *,
          courses (
            id,
            name
          )
        `)
        .eq("routine_id", routine.id);

      if (error) {
        console.error("Error fetching routine events:", error);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
    };

    fetchRoutineEvents();
  }, [routine]);

  // Format 24h to AM/PM
  const formatTimeToAMPM = (time24) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const getCellEvents = (slotId, day) =>
    events.filter((e) => e.start_slot === slotId && e.day_of_week === day);

  const openEventModal = (slotId, day) => {
    setSelectedSlotId(slotId);
    setSelectedDay(day);
    setIsEventModalOpen(true);
  };
  const getSerial = (slotId) => slots.find((s) => s.id === slotId)?.serial_no;

  const getMaxEndSlotId = (startSlotId, day, editingEventId = null) => {
    const startSerial = getSerial(startSlotId);
      if (!startSerial) return startSlotId;

      const relevantEvents = occupyingEvents
        .filter(
          (e) =>
            e.day_of_week === day &&
            e.start_slot !== startSlotId &&
            e.id !== editingEventId
        )
        .map((e) => ({
          start: getSerial(e.start_slot),
        }))
        .filter((e) => e.start > startSerial)
        .sort((a, b) => a.start - b.start);

      if (relevantEvents.length === 0) {
        return slots[slots.length - 1]?.id;
      }

      const nextStartSerial = relevantEvents[0].start;
      const maxSerial = nextStartSerial - 1;

      const maxSlot = slots.find((s) => s.serial_no === maxSerial);
      return maxSlot?.id || startSlotId;
    };

  const getColIndex = (serial) => slots.findIndex((s) => s.serial_no === serial) + 2;

  const shouldShowDescription = (event) => {
    if (!selectedGroup) return true; 

    if (selectedSubgroup) {
      return event.from_table === "subgroups" && event.for_users === selectedSubgroup;
    } else {
      return event.from_table === "groups" && event.for_users === selectedGroup;
    }
  };
  
  const isCovered = (slot, day) => {
    return occupyingEvents.some((event) => {
      if (event.day_of_week !== day) return false;

      const start = getSerial(event.start_slot);
      const end = getSerial(event.end_slot);

      return slot.serial_no >= start && slot.serial_no <= end;
    });
  };

  // Events that occupy slots
  const occupyingEvents = events.filter((event) => {
    if (!selectedGroup) return false; // nothing selected
    if (selectedSubgroup) {
      // Subgroup chosen: only parent group + selected subgroup
      return (
        (event.from_table === "groups" && event.for_users === selectedGroup) ||
        (event.from_table === "subgroups" && event.for_users === selectedSubgroup)
      );
    } else {
      // Only group chosen: group + all its subgroups
      const subgroupIds = subgroups.map(sg => sg.id);
      return (
        (event.from_table === "groups" && event.for_users === selectedGroup) ||
        (event.from_table === "subgroups" && subgroupIds.includes(event.for_users))
      );
    }
  });

  // Events that show description
  const descriptionEvents = events.filter((event) => {
    if (selectedSubgroup) {
      return event.from_table === "subgroups" && event.for_users === selectedSubgroup;
    } else if (selectedGroup) {
      return event.from_table === "groups" && event.for_users === selectedGroup;
    }
    return false;
  });
  const getOccupyingSlotBlocks = () => {
    const blocks = [];
    const cellEventMap = {}; // Track multiple events per cell

    occupyingEvents.forEach((event) => {
      const startSerial = getSerial(event.start_slot);
      const endSerial = getSerial(event.end_slot);

      if (!startSerial || !endSerial) return;

      const showText = descriptionEvents.includes(event);

      // If the event is active (show description), keep as one block
      if (showText) {
        const colStart = getColIndex(startSerial);
        const colSpan = endSerial - startSerial + 1;
        const rowStart = days.indexOf(event.day_of_week) + 2;
        const cellKey = `${rowStart}-${colStart}`;

        // Group events by cell
        if (!cellEventMap[cellKey]) {
          cellEventMap[cellKey] = [];
        }
        cellEventMap[cellKey].push({
          event,
          gridRow: rowStart,
          gridColumn: `${colStart} / span ${colSpan}`,
        });
      } else {
        // Inactive: create one block per slot
        for (let serial = startSerial; serial <= endSerial; serial++) {
          const colIndex = getColIndex(serial);
          const rowIndex = days.indexOf(event.day_of_week) + 2;

          blocks.push({
            id: event.id + "-" + serial,
            eventRef:event,
            gridRow: rowIndex,
            gridColumn: colIndex,
            showText: true,
            content: (
              <div style={{ fontSize: "0.85em", textAlign: "center" }}>
                {event.from_table === "groups"
                  ? groups.find((g) => g.id === event.for_users)?.name
                  : subgroups.find((sg) => sg.id === event.for_users)?.name}
              </div>
            ),
            inactive: true,
          });
        }
      }
    });

    // Convert cell event map to blocks with multiple events stacked
    Object.entries(cellEventMap).forEach(([cellKey, eventList]) => {
      blocks.push({
        id: cellKey,
        eventRef: eventList[0].event, // For click handling, use first event
        gridRow: eventList[0].gridRow,
        gridColumn: eventList[0].gridColumn,
        showText: true,
        multipleEvents: eventList,
        content: (
          <div style={{ display: "flex", flexDirection: "column", gap: "0px", width: "100%", height: "100%", justifyContent: "center" }}>
            {eventList.map((item, idx) => {
              // Parse metadata from description
              let course1Name = "";
              let course1Subgroup = "";
              let course1Teachers = "";
              let course2Name = "";
              let course2Subgroup = "";
              let course2Teachers = "";
              
              try {
                const descData = JSON.parse(item.event.description || "{}");
                
                // New format with separate course data
                if (descData.course1) {
                  course1Subgroup = descData.course1.subgroup || "";
                  course1Teachers = descData.course1.teacherCodenames || "";
                } else {
                  // Old format for backward compatibility
                  course1Subgroup = descData.subgroup || "";
                  course1Teachers = descData.teacherCodenames || "";
                }
                
                if (descData.course2 && descData.courseId2) {
                  course2Subgroup = descData.course2.subgroup || "";
                  course2Teachers = descData.course2.teacherCodenames || "";
                  
                  // Parse both course names from title
                  const titleParts = item.event.title?.split(" | ");
                  if (titleParts && titleParts.length > 0) {
                    course1Name = titleParts[0].split("(")[0].trim();
                    if (titleParts.length > 1) {
                      course2Name = titleParts[1].split("(")[0].trim();
                    }
                  }
                }
              } catch {
                // Fallback: parse from title
                const titleMatch = item.event.title?.match(/^(.+?)(?:\\s*\\(([^)]+)\\))?(?:\\s*\\(([^)]+)\\))?$/);
                if (titleMatch) {
                  course1Name = titleMatch[1];
                  course1Subgroup = titleMatch[2] || "";
                  course1Teachers = titleMatch[3] || "";
                }
              }
              
              // Get course name from relation or title if not already set
              if (!course1Name) {
                course1Name = item.event.courses?.name || item.event.title?.split("(")[0]?.trim() || "Unnamed";
              }

              return (
                <div 
                  key={item.event.id}
                  style={{ 
                    fontSize: "0.85em", 
                    textAlign: "center", 
                    lineHeight: "1.3",
                    padding: "4px 2px",
                    borderBottom: idx < eventList.length - 1 ? "1px solid rgba(0,0,0,0.3)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    flex: 1
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(item.event);
                    setIsEditModalOpen(true);
                  }}
                >
                  {/* Course 1 */}
                  <div style={{ fontWeight: "bold" }}>
                    {course1Name}{course1Subgroup ? ` (${course1Subgroup})` : ""}
                  </div>
                  {course1Teachers && (
                    <div style={{ fontSize: "0.95em", marginTop: "1px" }}>
                      ({course1Teachers})
                    </div>
                  )}
                  
                  {/* Course 2 (if exists) */}
                  {course2Name && (
                    <>
                      <div style={{ fontWeight: "bold", marginTop: "2px" }}>
                        {course2Name}{course2Subgroup ? ` (${course2Subgroup})` : ""}
                      </div>
                      {course2Teachers && (
                        <div style={{ fontSize: "0.95em", marginTop: "1px" }}>
                          ({course2Teachers})
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ),
      });
    });

    return blocks;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", width: "100%", maxWidth: "600px"}}>
        {selectedProgram && (
          <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
            <label>Group</label>
            <select
              className="form-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">All Groups</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {selectedGroup && (
          <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
            <label>Subgroup</label>
            <select
              className="form-select"
              value={selectedSubgroup}
              onChange={(e) => setSelectedSubgroup(e.target.value)}
              disabled={loadingSubgroups || subgroups.length === 0}
            >
              <option value="">All Subgroups</option>
              {subgroups.map((sg) => (
                <option key={sg.id} value={sg.id}>
                  {sg.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
        <button
          className="form-submit"
          onClick={() => setIsGenerateModalOpen(true)}
        >
          Generate
        </button>

        <button
          className="form-cancel"
          style={{ backgroundColor: "#d9534f", color: "white" }}
          onClick={() => setIsDeleteModalOpen(true)}
        >
          Delete
        </button>
      </div>
      <div className="timetable-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `7vw repeat(${slots.length}, 8vw)`,
          gridTemplateRows: `5vh repeat(${days.length}, 8vh)`
        }}
          >
        {/* Empty top-left corner */}
        <div className="grid-cell header-cell"></div>

        {/* Slot headers */}
        {slots.map((slot) => (
          <div key={slot.id} className="grid-cell header-cell">
            {slot.name}
            {slot.start && slot.end && (
              <div style={{ fontSize: "0.75em", color: "#555" }}>
                {formatTimeToAMPM(slot.start)} - {formatTimeToAMPM(slot.end)}
              </div>
            )}
          </div>
        ))}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            
            {/* Day label column */}
            <div
              className="grid-cell slot-label"
              style={{ gridRow: dayIndex + 2, gridColumn: 1 }}
            >
              {day}
            </div>

            {/* Slot cells — explicitly placed so event overlaps can't displace them */}
            {slots.map((slot, slotIndex) => (
              <div
                key={day + slot.id}
                className="grid-cell"
                style={{ gridRow: dayIndex + 2, gridColumn: slotIndex + 2, cursor: "pointer" }}
                onClick={() => openEventModal(slot.id, day)}
              >
                <button onClick={(e) => { e.stopPropagation(); openEventModal(slot.id, day); }}>
                  +
                </button>
              </div>
            ))}
          </React.Fragment>
        ))}
        {getOccupyingSlotBlocks().map((block) => (
          <div
            key={block.id}
            className={`${block.inactive ? "routine-event-inactive" : "routine-event"}`}
            style={{
              gridRow: block.gridRow,
              gridColumn: block.gridColumn,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              cursor: block.inactive ? "default" : "pointer",
            }}
            onClick={() => {
              // Only handle click if not multiple events (multiple events handle clicks individually)
              if (!block.inactive && !block.multipleEvents) {
                setSelectedEvent(block.eventRef);
                setIsEditModalOpen(true);
              }
            }}
          >
            {block.content}
          </div>
        ))}
      </div>

      {/* Modals placed outside grid */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Create Routine Event"
      >
        <CreateRoutineEvent
          slots={slots}
            routineId={routine.id}
            slotId={selectedSlotId}
            dayOfWeek={selectedDay}
            fromTable={selectedSubgroup ? "subgroups" : "groups"}
            forUsers={selectedSubgroup || selectedGroup}
            operationId={selectedOperation.id}
            maxEndSlotId={getMaxEndSlotId(selectedSlotId, selectedDay)}
            onSuccess={() => {
            // Close modal first, then refresh events
            setIsEventModalOpen(false);
            setTimeout(() => {
              supabase
                .from("recurring_events")
                .select(`
                  *,
                  courses (
                    id,
                    name
                  )
                `)
                .eq("routine_id", routine.id)
                .then(({ data }) => setEvents(data || []));
            }, 100);
          }}
        />
      </Modal>
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Routine Event"
      >
        <EditRoutineEvent
          event={selectedEvent}
          slots={slots}
          operationId={selectedOperation.id}
          maxEndSlotId={
            selectedEvent
              ? getMaxEndSlotId(
                  selectedEvent.start_slot,
                  selectedEvent.day_of_week,
                  selectedEvent.id
                )
              : null
          }
          onSuccess={() => {
            setIsEditModalOpen(false);

            // Refresh events
            setTimeout(() => {
              supabase
                .from("recurring_events")
                .select(`
                  *,
                  courses (
                    id,
                    name
                  )
                `)
                .eq("routine_id", routine.id)
                .then(({ data }) => setEvents(data || []));
            }, 100);
          }}
        />
      </Modal>
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Routine Events"
      >
        <GenerateRoutineEvents
          routineId={routine.id}
          onSuccess={() => setIsGenerateModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Generated Events"
      >
        <DeleteRoutineEvents
          routineId={routine.id}
          onSuccess={() => setIsDeleteModalOpen(false)}
        />
      </Modal>
    </div>
  );
}