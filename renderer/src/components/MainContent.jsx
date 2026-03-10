import React from "react";

export default function MainContent({ events }) {
  const slots = [
    // You can dynamically pass slots too, for now a default sample
    { id: "1", name: "Slot 1", start: "08:00", end: "09:00" },
    { id: "2", name: "Slot 2", start: "09:00", end: "10:00" },
    { id: "3", name: "Slot 3", start: "10:00", end: "11:00" },
    { id: "4", name: "Slot 4", start: "11:00", end: "12:00" },
  ];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const formatTimeToAMPM = (time24) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  // Compute lanes to avoid overlap
  function computeEventLanes(events, slots, days) {
    const lanesByDay = {};

    days.forEach((day) => {
      const dayEvents = events
        .filter((e) => e.start_slot && e.start_slot !== "" && e.day === day)
        .sort((a, b) => slots.findIndex(s => s.id === a.start_slot) - slots.findIndex(s => s.id === b.start_slot));

      const lanes = [];

      dayEvents.forEach((ev) => {
        const start = slots.findIndex((s) => s.id === ev.start_slot);
        const end = slots.findIndex((s) => s.id === ev.end_slot);

        let placed = false;

        for (let lane of lanes) {
          const overlap = lane.some((existing) => {
            const es = slots.findIndex((s) => s.id === existing.start_slot);
            const ee = slots.findIndex((s) => s.id === existing.end_slot);
            return !(end < es || start > ee);
          });

          if (!overlap) {
            lane.push(ev);
            ev._lane = lanes.indexOf(lane);
            placed = true;
            break;
          }
        }

        if (!placed) {
          lanes.push([ev]);
          ev._lane = lanes.length - 1;
        }
      });

      lanesByDay[day] = lanes.length || 1;
    });

    return lanesByDay;
  }

  const lanesByDay = computeEventLanes(events, slots, days);

  const gridRows = ["5vh", ...days.map(day => `${lanesByDay[day] * 8}vh`)].join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <h1>Main Content</h1>

      {events.length === 0 && <p>No events loaded</p>}

      <div
        className="timetable-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `7vw repeat(${slots.length}, 8vw)`,
          gridTemplateRows: gridRows,
          position: "relative",
          width: "100%",
        }}
      >
        {/* Top-left empty cell */}
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

        {/* Day labels and empty cells */}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            {/* Day label */}
            <div className="grid-cell header-cell" style={{ gridRow: dayIndex + 2, gridColumn: 1 }}>
              {day}
            </div>

            {/* Empty cells */}
            {slots.map((slot, slotIndex) => (
              <div
                key={`${day}-${slot.id}`}
                className="grid-cell"
                style={{
                  gridRow: dayIndex + 2,
                  gridColumn: slotIndex + 2,
                  position: "relative",
                }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Events */}
        {events.map((ev) => {
          const dayIndex = days.indexOf(ev.day);
          const startIndex = slots.findIndex((s) => s.id === ev.start_slot);
          const endIndex = slots.findIndex((s) => s.id === ev.end_slot);

          if (dayIndex === -1 || startIndex === -1) return null;

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
                padding: "2px",
                fontSize: "0.8em",
                overflow: "hidden",
              }}
            >
              {ev.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}