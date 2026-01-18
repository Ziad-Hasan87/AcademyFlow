import Modal from "../components/Modal";
import CreateOperations from "../components/CreateOperations";
import { useState } from "react";

export default function OperationsPage() {

  const [isOpen, setIsOpen] = useState(false);
  
  async function onCreateClick() {
    // Logic to handle creation of a new operation
    console.log("Create Operation button clicked");
  }
  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setIsOpen(true)}
        aria-label="Create Operation"
      >
        +
      </button>
      <Modal isOpen={isOpen} title="Create Operation" onClose={()=> setIsOpen(false)}>  
        <CreateOperations />
      </Modal>
      <h2>Operations Management</h2>
      <p>This is Operations page</p>
      <div className="operations-list">
      </div>
    </div>
  );
}