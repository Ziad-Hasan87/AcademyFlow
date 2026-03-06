import { useState } from "react";
import RoutineModal from "./RoutineModal";
import AddButton from "./AddButton";

export default function MainContent({ events }) {
  return (
    <div className="main-content">
      <h1>Main Content</h1>

      <div style={{ marginTop: "20px" }}>
        {events.length === 0 ? (
          <p>No events loaded</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id}>
              {JSON.stringify(ev)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
