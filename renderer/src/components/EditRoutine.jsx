import { useEffect, useState } from "react";
import { fetchSlots, fetchGroups, fetchSubgroups } from "../utils/fetch";
import Modal from "./Modal";
import CreateRoutineEvent from "./CreateRoutineEvent";
import supabase from "../utils/supabase";

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
      let rpcName = "";
      let params = {};

      if (selectedGroup && !selectedSubgroup) {
        // Only group selected
        rpcName = "getgrouproutine";
        params = { p_group_id: selectedGroup };
      } else if (selectedSubgroup) {
        // Subgroup selected
        rpcName = "getsubgrouproutine";
        params = { p_subgroup_id: selectedSubgroup };
      } else {
        // Neither group nor subgroup selected, fallback to all routine events
        const { data, error } = await supabase
          .from("recurring_events")
          .select("*")
          .eq("routine_id", routine.id);

        if (error) {
          console.error("Error fetching routine events:", error);
          setEvents([]);
        } else {
          setEvents(data || []);
        }
        return;
      }

      // Call the RPC function
      const { data, error } = await supabase.rpc(rpcName, params);

      if (error) {
        console.error(`Error fetching events from ${rpcName}:`, error);
        setEvents([]);
      } else {
        // Optional: filter only events for the current routine
        const filtered = data.filter((e) => e.routine_id === routine.id);
        setEvents(filtered || []);
      }
    };

    fetchRoutineEvents();
  }, [routine, selectedGroup, selectedSubgroup]);

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

      {/* Timetable Grid */}
      <div
        className="timetable-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `7vw repeat(${slots.length}, 8vw)`,
          gridTemplateRows: `5vh repeat(${days.length}, 8vh)`
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

        {/* Days + Cells */}
        {days.map((day, dayIndex) => (
          <>
            {/* Day label */}
            <div
              key={`day-${day}`}
              className="grid-cell header-cell"
              style={{ gridRow: dayIndex + 2, gridColumn: 1 }}
            >
              {day}
            </div>

            {/* Slots */}
            {slots.map((slot, slotIndex) => {
              const cellEvents = getCellEvents(slot.id, day);

              return (
                <div
                  key={`${day}-${slot.id}`}
                  className="grid-cell"
                  style={{
                    gridRow: dayIndex + 2,
                    gridColumn: slotIndex + 2,
                    position: "relative"
                  }}
                  onClick={() => openEventModal(slot.id, day)}
                >
                  <div className="routine-events">
                    {cellEvents.map((ev) => (
                      <div key={ev.id} className="routine-event">
                        {ev.title}
                      </div>
                    ))}
                  </div>

                  <button
                    className="routine-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEventModal(slot.id, day);
                    }}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </>
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
              supabase
                .from("recurring_events")
                .select("*")
                .eq("routine_id", routine.id)
                .then(({ data }) => setEvents(data || []));

              setIsEventModalOpen(false);
            }}
          />
        </Modal>

      </div>
    </div>
  );
}