import Modal from "../components/Modal";
import CreatePrograms from "../components/CreatePrograms";
import { useState } from "react";

export default function ProgramsPage() {

  const [isOpen, setIsOpen] = useState(false);
  
  async function onCreateClick() {
    // Logic to handle creation of a new program
    console.log("Create Program button clicked");
  }

  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setIsOpen(true)}
        aria-label="Create Program"
      >
        +
      </button>
      <Modal isOpen={isOpen} title="Create Program" onClose={()=> setIsOpen(false)}>
        <CreatePrograms />
      </Modal>
      <h2>Programs Management</h2>
      <p>This is Programs page</p>
      <div className="programs-list">

    </div>
    </div>
  );
}
