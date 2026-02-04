import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";

export default function EditSlots({ slotId, onCancel, onSuccess }) {
  const [form, setForm] = useState({
    id: "",
    serial_no: "",
    name: "",
    start: "",
    end: "",
    created_at: "",
  });

  const fetchSlot = async () => {
    const { data, error } = await supabase
      .from("slotinfo")
      .select("*")
      .eq("id", slotId)
      .single();

    if (!error) setForm(data);
  };

  useEffect(() => {
    fetchSlot();
  }, [slotId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("slotinfo")
      .update({
        serial_no: form.serial_no,
        name: form.name,
        start: form.start,
        end: form.end,
      })
      .eq("id", form.id);

    if (error) {
      alert(error.message);
    } else {
      showToast("Slot updated");
      onSuccess();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this slot?")) return;

    const { error } = await supabase
      .from("slotinfo")
      .delete()
      .eq("id", form.id);

    if (!error) {
      showToast("Slot deleted");
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Edit Slot</h2>

      <div className="form-field">
        <label>Serial No</label>
        <input
          className="form-input"
          type="number"
          value={form.serial_no}
          onChange={(e) =>
            setForm({ ...form, serial_no: e.target.value })
          }
        />
      </div>

      <div className="form-field">
        <label>Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />
      </div>

      <div className="form-field">
        <label>Start</label>
        <input
          type="time"
          className="form-input"
          value={form.start}
          onChange={(e) =>
            setForm({ ...form, start: e.target.value })
          }
        />
      </div>

      <div className="form-field">
        <label>End</label>
        <input
          type="time"
          className="form-input"
          value={form.end}
          onChange={(e) =>
            setForm({ ...form, end: e.target.value })
          }
        />
      </div>

      <button className="form-submit">Save</button>
      <button
        type="button"
        className="form-cancel"
        onClick={onCancel}
      >
        Cancel
      </button>

      <button
        type="button"
        className="form-submit"
        style={{ backgroundColor: "#dc3545", marginTop: "10px" }}
        onClick={handleDelete}
      >
        Delete Slot
      </button>
    </form>
  );
}
