import { useState } from "react";
import supabase from "../utils/supabase";

export default function DeleteRoutineEvents({ routineId, onSuccess }) {
    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const [isDeleting, setIsDeleting] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDelete = async () => {
    try {
        const { error } = await supabase.rpc("delete_routine_events", {
        p_routine_id: routineId,
        p_start_date: startDate,
        p_end_date: endDate,
        });

        if (error) throw error;

        onSuccess?.();
    } catch (err) {
        console.error(err);
        alert("Error deleting events");
    }
    };

    return (
        <div className="form" style={{ width: "20vw" }}>
            <div className="form-field">
                <label>Start Date</label>
                <input
                    disabled={isDeleting}
                    type="date"
                    className="form-input"
                    min={today}
                    value={startDate}
                    onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate < e.target.value) {
                            setEndDate(e.target.value);
                        }
                    }}
                />
            </div>

            <div className="form-field">
                <label>End Date</label>
                <input
                    type="date"
                    className="form-input"
                    disabled={isDeleting}
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>

            {isDeleting && (
                <div className="mt-4">
                    <p className="text-sm font-medium mb-2">
                        Deleting Events...
                    </p>

                    <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                        <div
                            className="bg-red-600 h-3 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <button
                className="form-submit"
                disabled={isDeleting}
                style={{ marginTop: "15px" }}
                onClick={handleDelete}
            >
                {isDeleting ? "Deleting..." : "Delete Events"}
            </button>
        </div>
    );
}