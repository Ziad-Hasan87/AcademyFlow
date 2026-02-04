import { useState } from "react";
import RoutineModal from "./RoutineModal";
import CreateRoutinePage from "./CreateRoutinePage";
import AddButton from "./AddButton";

export default function MainContent() {
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);

  return (
    <div className="main-content">
      <div className="top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Weekly Routines</h1>
        <AddButton onClick={() => setIsRoutineModalOpen(true)} />
      </div>

      <RoutineModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        title="Create Routine"
      >
        <CreateRoutinePage />
      </RoutineModal>

      <div style={{ marginTop: "20px" }}>
        {/* Routine table or content can go here */}
      </div>
    </div>
  );
}
