import Modal from "../components/Modal";
import CreateUser from "../components/CreateUser";
import AddButton from "../components/AddButton";
import { useState } from "react";
export default function UsersPage() {
  const [isOpen, setIsOpen] = useState(false);

  async function onCreateClick() {
    // Logic to handle creation of a new user
    console.log("Create User button clicked");
  }

  return (
    <div className="page-content">
      <Modal isOpen={isOpen} title="Create User" onClose={()=> setIsOpen(false)}>
        <CreateUser />
      </Modal>
      <div className="page-sidebar-title">
        <h2>Users Management</h2>
        <AddButton
          onClick={() => setIsOpen(true)}
          ariaLabel="Create User"
        />
      </div>
      <p>This is Users page</p>
      <div className="users-list">
        
        
      </div>
    </div>
  );
}
