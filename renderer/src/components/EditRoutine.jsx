import { useEffect, useState } from "react";
import { fetchSlots, fetchGroups, fetchSubgroups } from "../utils/fetch";
import Modal from "./Modal";
import CreateRoutineEvent from "./CreateRoutineEvent";
import supabase from "../utils/supabase";
import EditRoutineEvent from "./EditRoutineEvent";
import React from "react";

export default function EditRoutine({ selectedOperation, routine, onClose }) {
  const [slots, setSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [subgroups, setSubgroups] = useState([]);
  const [selectedSubgroup, setSelectedSubgroup] = useState("");
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  const loadRoutineEvents = async () => {
    if (!routine?.id) return;

    try {
      let data = null;
      let error = null;

      if (selectedSubgroup) {
        ({ data, error } = await supabase.rpc("getsubgrouproutine", {
          p_subgroup_id: selectedSubgroup,
        }));
      }
      else if (selectedGroup) {
        ({ data, error } = await supabase.rpc("getgrouproutine", {
          p_group_id: selectedGroup,
        }));
      }
      else {
        ({ data, error } = await supabase
          .from("recurring_events")
          .select("*")
          .eq("routine_id", routine.id));
      }

      if (error) {
        console.error("Error fetching routine events:", error);
        setEvents([]);
        return;
      }

      // ensure routine filter always applies
      const filtered = (data || []).filter(e => e.routine_id === routine.id);

      setEvents(filtered);
    } catch (err) {
      console.error("Unexpected error loading routine events:", err);
      setEvents([]);
    }
  };

  useEffect(() => {
    if (!routine?.id) return;
    loadRoutineEvents();
  }, [routine?.id, selectedGroup, selectedSubgroup]);

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

  const getSpanningEvents = () => {
    return events.map((ev) => {
      const dayIndex = days.indexOf(ev.day_of_week);
      const startIndex = slots.findIndex((s) => s.id === ev.start_slot);
      const endIndex = slots.findIndex((s) => s.id === ev.end_slot);

      if (dayIndex === -1 || startIndex === -1) return null;

      const span = endIndex >= startIndex ? endIndex - startIndex + 1 : 1;

      return {
        id: ev.id,
        title: ev.title,
        gridRow: dayIndex + 2,
        gridColumn: `${startIndex + 2} / span ${span}`,
      };
    }).filter(Boolean);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

      {/* Group / Subgroup Selectors */}
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", width: "100%", maxWidth: "600px" }}>
        {selectedProgram && (
          <div className="form-field" style={{ maxWidth: "300px", marginBottom: "16px" }}>
            <label>Group</label>
            <select
              className="form-select"
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setSelectedSubgroup("");
              }}
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

      {/* Timetable Grid */}
      <div
        className="timetable-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `7vw repeat(${slots.length}, 8vw)`,
          gridTemplateRows: `5vh repeat(${days.length}, 8vh)`,
          position: "relative"
        }}
      >

        {/* Empty top-left */}
        <div className="grid-cell header-cell"></div>

        {/* Slot headers */}
        {slots.map((slot) => (
          <div key={slot.id} className="grid-cell header-cell">
            <div>{slot.name}</div>
            <div style={{ fontSize: "0.75em", color: "#555" }}>
              {formatTimeToAMPM(slot.start)} - {formatTimeToAMPM(slot.end)}
            </div>
          </div>
        ))}
        {/* EVENT LAYER */}
        {events.map((ev) => {
          const dayIndex = days.indexOf(ev.day_of_week);
          const startIndex = slots.findIndex((s) => s.id === ev.start_slot);
          const endIndex = slots.findIndex((s) => s.id === ev.end_slot);

          if (dayIndex === -1 || startIndex === -1) return null;

          const span = endIndex >= startIndex ? endIndex - startIndex + 1 : 1;

          return (
            <div
              key={ev.id}
              className="routine-event"
              style={{
                gridRow: dayIndex + 2,
                gridColumn: `${startIndex + 2} / span ${span}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
                cursor: "pointer"
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(ev);
                setEditModalOpen(true);
              }}
            >
              <div
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModalOpen(true);
                }}
              >
                {ev.title}
              </div>
            </div>
          );
        })}
        {/* Day labels + slot cells */}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            {/* Day label */}
            <div
              className="grid-cell header-cell"
              style={{ gridRow: dayIndex + 2, gridColumn: 1 }}
            >
              {day}
            </div>

            {/* Slot cells */}
            {slots.map((slot, slotIndex) => (
              <div
                key={`${day}-${slot.id}`}
                className="grid-cell"
                style={{
                  gridRow: dayIndex + 2,
                  gridColumn: slotIndex + 2,
                  position: "relative",
                  cursor: "pointer",
                  zIndex: 1
                }}
                onClick={() => openEventModal(slot.id, day)}
              >
                <button
                  className="routine-add-btn"
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    zIndex: 10
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEventModal(slot.id, day);
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </React.Fragment>
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
            fromTable={selectedSubgroup ? "subgroups" : "groups"}
            forUsers={selectedSubgroup || selectedGroup}
            operationId={selectedOperation.id}
            slots={slots}
            maxEndSlotId={slots[slots.length - 1]?.id}
            onSuccess={() => {
              loadRoutineEvents();
              setIsEventModalOpen(false);
            }}
          />
        </Modal>

        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Routine Event"
        >
          {selectedEvent && (
            <EditRoutineEvent
              event={selectedEvent}
              slots={slots}
              onClose={() => setEditModalOpen(false)}
              maxEndSlotId={slots[slots.length - 1]?.id}
              onSuccess={() => {
                loadRoutineEvents();
                setEditModalOpen(false);
              }}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}