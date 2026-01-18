import Modal from "../components/Modal";
import CreateUser from "../components/CreateUser";
import { useState } from "react";
export default function UsersPage() {
  const [isOpen, setIsOpen] = useState(false);

  async function onCreateClick() {
    // Logic to handle creation of a new user
    console.log("Create User button clicked");
  }

  return (
    <div className="page-content">
      <button
        className="create-button"
        onClick={() => setIsOpen(true)}
        aria-label="Create Routine"
      >
        +
      </button>
      <Modal isOpen={isOpen} title="Create User" onClose={()=> setIsOpen(false)}>
        <CreateUser />
      </Modal>
      <h2>Users Management</h2>
      <p>This is Users page</p>
      <div className="users-list">
        
        
      </div>
    </div>
  );
}
