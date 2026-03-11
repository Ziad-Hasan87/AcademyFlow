import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AddButton from "../components/AddButton";
import CreateSlots from "../components/CreateSlots";
import EditSlots from "../components/EditSlots";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms, fetchOperations, fetchSlots } from "../utils/fetch";

export default function SlotInfoPage() {
  const { userData } = useAuth();
  const currentInstituteId = userData?.institute_id;
  // Slot state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  /* ======================= FETCH SLOTS ======================= */
  useEffect(() => {
    fetchSlots(userData.institute_id, setSlots);
  }, []);

  return (
    <div className="page-content">
      {/* ================= MODALS ================= */}
      <Modal
        isOpen={isCreateOpen}
        title="Create Slot"
        onClose={() => {
          setIsCreateOpen(false);
          fetchSlots(userData.institute_id, setSlots);
        }}
      >
        <CreateSlots
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchSlots(userData.institute_id, setSlots);
          }}
        />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        title="Edit Slot"
        onClose={() => {
          setIsEditOpen(false);
          fetchSlots(userData.institute_id, setSlots);
        }}
      >
        <EditSlots
          slotId={selectedSlotId}
          onCancel={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false);
            fetchSlots(userData.institute_id, setSlots);
          }}
        />
      </Modal>

      {/* ================= HEADER ================= */}
      <div className="page-sidebar-title">
        <h2>Slot Info</h2>
          <AddButton
            onClick={() => setIsCreateOpen(true)}
            ariaLabel="Create Slot"
          />
      </div>

      {/* ================= SLOT LIST ================= */}
      {loadingSlots && <p>Loading…</p>}

      <div className="lists-container">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="list-item"
            onClick={() => {
              setSelectedSlotId(slot.id);
              setIsEditOpen(true);
            }}
          >
            <strong>{slot.serial_no} | </strong> {slot.name}
            <div style={{ fontSize: "0.9em", color: "#666" }}>
              {slot.start} – {slot.end}
            </div>
          </div>
        ))}

        {!loadingSlots && slots.length === 0 && (
          <p style={{ color: "#777" }}>No slots created yet.</p>
        )}
      </div>
    </div>
  );
}