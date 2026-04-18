import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchSlots } from "../utils/fetch";
import Modal from "./Modal";
import CreateEvent from "./CreateEvent";
import EditEvent from "./EditEvent";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function MainContent({ events, startOfWeek, endOfWeek, onCreateEvent, onRefreshEvents }) {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editableEvent, setEditableEvent] = useState(null);
  const [selectedCreateDate, setSelectedCreateDate] = useState("");
  const [selectedCreateStartSlotId, setSelectedCreateStartSlotId] = useState("");
  const [hoveredCellKey, setHoveredCellKey] = useState(null);

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

  const getEventTextColor = (backgroundColor) => {
    if (!backgroundColor || backgroundColor[0] !== "#" || backgroundColor.length !== 7) {
      return "#0f172a";
    }

    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.62 ? "#0f172a" : "#f8fafc";
  };

  const getRowBackground = (dayIndex) =>
    dayIndex % 2 === 0 ? "rgba(226, 245, 239, 0.58)" : "rgba(255, 255, 255, 0.78)";

  const getCellKey = (dayDate, slotId) => `${dayDate}-${slotId}`;

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
        day: WEEKDAY_NAMES[current.getDay()],
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

  const resolveSlotIdFromEventPointer = (pointerEvent, startIndex, span) => {
    if (!pointerEvent?.currentTarget || span <= 0) return null;

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    if (!rect.width) return slots[startIndex]?.id || null;

    const relativeX = pointerEvent.clientX - rect.left;
    const slotWidth = rect.width / span;
    const offset = Math.min(
      span - 1,
      Math.max(0, Math.floor(relativeX / slotWidth))
    );

    return slots[startIndex + offset]?.id || slots[startIndex]?.id || null;
  };

  return (
    <div
      className="main-content"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          marginBottom: "10px",
          padding: "10px 14px",
          borderRadius: "14px",
          background: "linear-gradient(120deg, #052e2b 0%, #0f766e 60%, #0b4a6f 100%)",
          boxShadow: "0 14px 24px rgba(15, 23, 42, 0.24)",
        }}
      >
        <h1 style={{ textAlign: "center", margin: 0, color: "#f8fafc", fontSize: "1.5rem", letterSpacing: "0.02em" }}>
          Weekly Schedule
        </h1>

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
            justifyContent: "center",
            background: "rgba(248, 250, 252, 0.2)",
            border: "1px solid rgba(248, 250, 252, 0.35)",
            color: "#f8fafc",
            boxShadow: "0 6px 14px rgba(2, 6, 23, 0.24)",
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
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        <div
          className="timetable-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${slots.length + 1}, 1fr)`,
            gridTemplateRows: gridRows,
            position: "relative",
            width: "100%",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            boxShadow: "0 18px 34px rgba(15, 23, 42, 0.16)",
            background: "rgba(255, 255, 255, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {/* top-left */}
          <div
            className="grid-cell header-cell"
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #0b4a6f 100%)",
              borderColor: "rgba(255, 255, 255, 0.25)",
            }}
          ></div>

          {/* slot headers */}
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="grid-cell header-cell"
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #0b4a6f 100%)",
                color: "#f8fafc",
                borderColor: "rgba(255, 255, 255, 0.24)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "2px",
                fontWeight: 700,
                letterSpacing: "0.01em",
              }}
            >
              <div>{slot.name}</div>
              <div style={{ fontSize: "0.75em", color: "rgba(248,250,252,0.88)" }}>
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
                  background: "linear-gradient(180deg, rgba(226, 232, 240, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  borderColor: "rgba(148, 163, 184, 0.28)",
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              >
                <div>{day.day}</div>
                <div style={{ fontSize: "0.75em", color: "#475569", fontWeight: 600 }}>
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
                    pointerEvents: "auto",
                    background: getRowBackground(dayIndex),
                    borderColor: "rgba(148, 163, 184, 0.2)",
                  }}
                  onMouseEnter={() => setHoveredCellKey(getCellKey(day.date, slot.id))}
                  onMouseLeave={() => setHoveredCellKey(null)}
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
                  color: getEventTextColor(ev.filterColor),
                  borderRadius: "8px",
                  border: "1px solid rgba(15, 23, 42, 0.16)",
                  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.2)",
                  padding: "6px 8px",
                  fontSize: "0.8em",
                  fontWeight: 700,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseMove={(event) => {
                  const slotId = resolveSlotIdFromEventPointer(event, startIndex, span);
                  if (slotId) {
                    setHoveredCellKey(getCellKey(ev._date, slotId));
                  }
                }}
                onMouseLeave={() => setHoveredCellKey(null)}
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
              zIndex: 30,
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
                  className="schedule-add-btn"
                  style={{
                    gridRow: dayIndex + 2,
                    gridColumn: slotIndexMap[slot.id] + 2,
                    width: "20px",
                    height: "20px",
                    marginTop: "2px",
                    marginLeft: "2px",
                    borderRadius: "6px",
                    border: "1px solid rgba(148, 163, 184, 0.45)",
                    background: "linear-gradient(120deg, #d1fae5 0%, #bfdbfe 100%)",
                    color: "#0f172a",
                    fontWeight: 700,
                    cursor: "pointer",
                    zIndex: 20,
                    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.12)",
                    opacity: hoveredCellKey === getCellKey(day.date, slot.id) ? 1 : 0,
                    pointerEvents: hoveredCellKey === getCellKey(day.date, slot.id) ? "auto" : "none",
                  }}
                  onMouseEnter={() => setHoveredCellKey(getCellKey(day.date, slot.id))}
                  onMouseLeave={() => setHoveredCellKey(null)}
                  onClick={() => {
                    setSelectedCreateDate(day.date);
                    setSelectedCreateStartSlotId(slot.id);
                    setIsCreateOpen(true);
                  }}
                >
                  +
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <Modal
        isOpen={isCreateOpen}
        title="Create Event"
        onClose={() => setIsCreateOpen(false)}
        contentClassName="explorer-theme-modal-content"
        bodyClassName="explorer-theme-modal-body"
      >
        <CreateEvent
          routineId={null}
          defaultDate={selectedCreateDate}
          defaultStartSlot={selectedCreateStartSlotId}
          onSave={() => {
            setIsCreateOpen(false);
            setSelectedCreateDate("");
            setSelectedCreateStartSlotId("");
            onCreateEvent?.();
          }}
        />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Event"
        onClose={() => {
          setIsEditOpen(false);
          setEditableEvent(null);
        }}
        contentClassName="explorer-theme-modal-content"
        bodyClassName="explorer-theme-modal-body"
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