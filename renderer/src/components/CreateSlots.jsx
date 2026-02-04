import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";

export default function CreateSlots({ operationId, onSuccess }) {
  const { userData } = useAuth();

  const [form, setForm] = useState({
    serial_no: "",
    name: "",
    start: "",
    end: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("slotinfo").insert([
      {
        operation_id: operationId,
        serial_no: form.serial_no,
        name: form.name,
        start: form.start,
        end: form.end,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    showToast("Slot created successfully");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2 className="form-title">Create Slot</h2>

      <div className="form-field">
        <label>Serial No</label>
        <input
          className="form-input"
          type="number"
          required
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
          required
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />
      </div>

      <div className="form-field">
        <label>Start Time</label>
        <input
          type="time"
          className="form-input"
          required
          value={form.start}
          onChange={(e) =>
            setForm({ ...form, start: e.target.value })
          }
        />
      </div>

      <div className="form-field">
        <label>End Time</label>
        <input
          type="time"
          className="form-input"
          required
          value={form.end}
          onChange={(e) =>
            setForm({ ...form, end: e.target.value })
          }
        />
      </div>

      <button className="form-submit">Create Slot</button>
    </form>
  );
}
