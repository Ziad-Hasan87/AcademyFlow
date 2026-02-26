import { useEffect, useState } from "react";
import { fetchSlots, fetchGroups, fetchSubgroups } from "../utils/fetch";
import Modal from "./Modal";
import CreateRoutineEvent from "./CreateRoutineEvent";
import supabase from "../utils/supabase";
import React from "react";

export default function EditRoutine({ selectedOperation, routine, onClose }) {
  const [slots, setSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

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

        blocks.push({
          id: event.id,
          gridRow: rowStart,
          gridColumn: `${colStart} / span ${colSpan}`,
          showText,
          content: (
            <>
              <strong>{event.courses?.name || "Unnamed Course"}</strong>
              <div>{event.title}</div>
            </>
          ),
        });
      } else {
        // Inactive: create one block per slot
        for (let serial = startSerial; serial <= endSerial; serial++) {
          const colIndex = getColIndex(serial);
          const rowIndex = days.indexOf(event.day_of_week) + 2;

          blocks.push({
            id: event.id + "-" + serial,
            gridRow: rowIndex,
            gridColumn: colIndex,
            showText: true, // we will display the group/subgroup name
            content: (
              <div style={{ fontSize: "0.7em", textAlign: "center" }}>
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
        {days.map((day) => (
          <React.Fragment key={day}>
            
            {/* Day label column */}
            <div className="grid-cell slot-label">
              {day}
            </div>

            {/* Slot cells */}
            {slots.map((slot) => (
              <div key={day + slot.id} className="grid-cell">
                {!isCovered(slot, day) && (
                  <button onClick={() => openEventModal(slot.id, day)}>
                    +
                  </button>
                )}
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
            }}
          >
            {block.content}
          </div>
        ))}
        <Modal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          title="Create Routine Event"
        >
          <CreateRoutineEvent
            routineId={routine.id}
            slotId={selectedSlotId}
            dayOfWeek={selectedDay}
            fromTable={selectedSubgroup ? "subgroups" : "groups"} // Step 2–3
            forUsers={selectedSubgroup || selectedGroup}  
            operationId={selectedOperation.id}
            onSuccess={() => {
              // Refresh events after creating
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
            }}
          />
        </Modal>
      </div>
    </div>
  );
}