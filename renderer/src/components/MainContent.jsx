import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchSlots } from "../utils/fetch";
import Modal from "./Modal";
import CreateEvent from "./CreateEvent";
import EditEvent from "./EditEvent";

export default function MainContent({ events, startOfWeek, endOfWeek, onCreateEvent, onRefreshEvents }) {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editableEvent, setEditableEvent] = useState(null);
  const [selectedCreateDate, setSelectedCreateDate] = useState("");

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  useEffect(() => {
    if (userData?.institute_id) {
      fetchSlots(userData.institute_id, setSlots);
    }
  }, [userData]);

  const formatTimeToAMPM = (time24) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return "";

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return dateValue;

    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const days = useMemo(() => {
    if (!startOfWeek || !endOfWeek) return [];

    const items = [];
    const current = new Date(startOfWeek);
    const finalDate = new Date(endOfWeek);

    current.setHours(0, 0, 0, 0);
    finalDate.setHours(0, 0, 0, 0);

    while (current <= finalDate) {
      items.push({
        date: formatDateKey(current),
        day: weekdayNames[current.getDay()],
      });
      current.setDate(current.getDate() + 1);
    }

    return items;
  }, [startOfWeek, endOfWeek]);

  // slot index lookup (fast)
  const slotIndexMap = useMemo(() => {
    const map = {};
    slots.forEach((slot, i) => {
      map[slot.id] = i;
    });
    return map;
  }, [slots]);

  // derive weekday from event.date
  const eventsWithDay = useMemo(() => {
    return events.map((ev) => {
      if (!ev.date) return { ...ev, _day: null, _date: null };

      const eventDate = String(ev.date).slice(0, 10);

      const day = new Date(ev.date).toLocaleDateString("en-US", {
        weekday: "long",
      });

      return { ...ev, _day: day, _date: eventDate };
    });
  }, [events]);

  function computeEventLanes(events, slots, days) {
    const lanesByDay = {};
    const positionedEvents = [];

    days.forEach((day) => {
      const dayEvents = events
        .filter((e) => e.start_slot && e._date === day.date)
        .sort(
          (a, b) =>
            slotIndexMap[a.start_slot] - slotIndexMap[b.start_slot]
        );

      const lanes = [];

      dayEvents.forEach((ev) => {
        const start = slotIndexMap[ev.start_slot];
        const end = slotIndexMap[ev.end_slot];

        let laneIndex = -1;

        for (let i = 0; i < lanes.length; i++) {
          const lane = lanes[i];

          const overlap = lane.some((existing) => {
            const es = slotIndexMap[existing.start_slot];
            const ee = slotIndexMap[existing.end_slot];
            return !(end < es || start > ee);
          });

          if (!overlap) {
            lane.push(ev);
            laneIndex = i;
            break;
          }
        }

        if (laneIndex === -1) {
          lanes.push([ev]);
          laneIndex = lanes.length - 1;
        }

        positionedEvents.push({
          ...ev,
          _lane: laneIndex,
        });
      });

      lanesByDay[day.date] = lanes.length || 1;
    });

    return { lanesByDay, positionedEvents };
  }

  const { lanesByDay, positionedEvents } = computeEventLanes(
    eventsWithDay,
    slots,
    days
  );

  const gridRows = [
    "5vh",
    ...days.map((day) => `${lanesByDay[day.date] * 8}vh`),
  ].join(" ");

  return (
    <div
      className="main-content"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          marginBottom: "8px"
        }}
      >
        <h1 style={{ textAlign: "center", margin: 0 }}>Main Content</h1>

        <button
          type="button"
          className="form-submit"
          title="Refresh events"
          onClick={() => onRefreshEvents?.()}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "34px",
            maxWidth: "34px",
            minWidth: "34px",
            height: "34px",
            flex: "0 0 34px",
            padding: 0,
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M20 12A8 8 0 1 1 17.66 6.34"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M20 4V10H14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        className="timetable-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${slots.length + 1}, 1fr)`,
          gridTemplateRows: gridRows,
          position: "relative",
          width: "100%"
        }}
      >
        {/* top-left */}
        <div className="grid-cell header-cell"></div>

        {/* slot headers */}
        {slots.map((slot) => (
          <div key={slot.id} className="grid-cell header-cell" style={{ backgroundColor: "#9fc69f" }}>
            <div>{slot.name}</div>
            <div style={{ fontSize: "0.75em", color: "#555" }}>
              {formatTimeToAMPM(slot.start)} - {formatTimeToAMPM(slot.end)}
            </div>
          </div>
        ))}

        {/* grid cells */}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day.date}>
            <div
              className="grid-cell header-cell-row"
              style={{
                gridRow: dayIndex + 2,
                gridColumn: 1,
                backgroundColor: dayIndex % 2 === 1 ? "#ffffff" : "#edffe8fb"
              }}
            >
              <div>{day.day}</div>
              <div style={{ fontSize: "0.75em", color: "#555" }}>
                {formatDateLabel(day.date)}
              </div>
            </div>

            {slots.map((slot, slotIndex) => (
              <div
                key={`${day.date}-${slot.id}`}
                className="grid-cell"
                style={{
                  gridRow: dayIndex + 2,
                  gridColumn: slotIndex + 2,
                  pointerEvents: "none",
                  backgroundColor: dayIndex % 2 === 1 ? "#ffffff" : "#edffe8fb"
                }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* EVENTS */}
        {positionedEvents.map((ev) => {
          const dayIndex = days.findIndex((day) => day.date === ev._date);
          const startIndex = slotIndexMap[ev.start_slot];
          const endIndex = slotIndexMap[ev.end_slot];

          if (dayIndex === -1 || startIndex === undefined) return null;

          const span = Math.max(1, endIndex - startIndex + 1);
          const laneHeight = 8;
          const topOffset = ev._lane * laneHeight;

          return (
            <div
              key={ev.id}
              className="routine-event"
              style={{
                gridRow: dayIndex + 2,
                gridColumn: `${startIndex + 2} / span ${span}`,
                alignSelf: "start",
                marginTop: `${topOffset}vh`,
                height: `${laneHeight}vh`,
                position: "relative",
                zIndex: 5,
                backgroundColor: ev.filterColor || "deepskyblue",
                borderRadius: "4px",
                padding: "4px",
                fontSize: "0.8em",
                overflow: "hidden",
                cursor: "pointer",
              }}
                onClick={() => {
                  setEditableEvent({ ...ev });
                  setIsEditOpen(true);
                }}
            >
              {ev.title}
            </div>
          );
        })}

        {/* + BUTTON LAYER */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${slots.length + 1}, 1fr)`,
            gridTemplateRows: gridRows,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {days.map((day, dayIndex) =>
            slots.map((slot) => (
              <button
                key={`${day.date}-${slot.id}-btn`}
                style={{
                  gridRow: dayIndex + 2,
                  gridColumn: slotIndexMap[slot.id] + 2,
                  width: "20px",
                  height: "20px",
                  marginTop: "2px",
                  marginLeft: "2px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#00e5ff",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  zIndex: 20,
                }}
                onClick={() => {
                  setSelectedCreateDate(day.date);
                  setIsCreateOpen(true);
                }}
              >
                +
              </button>
            ))
          )}
        </div>
      </div>
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <CreateEvent
          routineId={null}
          defaultDate={selectedCreateDate}
          onSave={() => {
            setIsCreateOpen(false);
            setSelectedCreateDate("");
            onCreateEvent?.();
          }}
        />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditableEvent(null);
        }}
      >
        {editableEvent && (
          <EditEvent
            event={editableEvent}
            onSave={() => {
              setIsEditOpen(false);
              setEditableEvent(null);
              onRefreshEvents?.();
            }}
          />
        )}
      </Modal>
    </div>
  );
}