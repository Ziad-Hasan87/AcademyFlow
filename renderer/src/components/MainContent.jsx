import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchSlots } from "../utils/fetch";

export default function MainContent({ events, onCreateEvent }) {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);

  const days = [
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
      if (!ev.date) return { ...ev, _day: null };

      const day = new Date(ev.date).toLocaleDateString("en-US", {
        weekday: "long",
      });

      return { ...ev, _day: day };
    });
  }, [events]);

  function computeEventLanes(events, slots, days) {
    const lanesByDay = {};
    const positionedEvents = [];

    days.forEach((day) => {
      const dayEvents = events
        .filter((e) => e.start_slot && e._day === day)
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

      lanesByDay[day] = lanes.length || 1;
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
    ...days.map((day) => `${lanesByDay[day] * 8}vh`),
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
      <h1>Main Content</h1>

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
          <div key={slot.id} className="grid-cell header-cell">
            <div>{slot.name}</div>
            <div style={{ fontSize: "0.75em", color: "#555" }}>
              {formatTimeToAMPM(slot.start)} - {formatTimeToAMPM(slot.end)}
            </div>
          </div>
        ))}

        {/* grid cells */}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div
              className="grid-cell header-cell"
              style={{ gridRow: dayIndex + 2, gridColumn: 1 }}
            >
              {day}
            </div>

            {slots.map((slot, slotIndex) => (
              <div
                key={`${day}-${slot.id}`}
                className="grid-cell"
                style={{
                  gridRow: dayIndex + 2,
                  gridColumn: slotIndex + 2,
                  pointerEvents: "none",
                }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* EVENTS */}
        {positionedEvents.map((ev) => {
          const dayIndex = days.indexOf(ev._day);
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
                backgroundColor: "#90cdf4",
                borderRadius: "4px",
                padding: "4px",
                fontSize: "0.8em",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() =>
                console.log(`Clicked event ${ev.title} on ${ev._day} at slot ${ev.start_slot}`)
              }
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
                key={`${day}-${slot.id}-btn`}
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
                onClick={() =>
                  console.log(`Create event for ${day} at slot ${slot.name}`)
                }
              >
                +
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}