import { useState } from "react";
import RoutineModal from "./RoutineModal";
import AddButton from "./AddButton";

export default function MainContent() {
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);

  return (
    <div className="main-content">
      <h1>Main Content goes here</h1>

      <div style={{ marginTop: "20px" }}>
        {/* Routine table or content can go here */}
      </div>
    </div>
  );
}
