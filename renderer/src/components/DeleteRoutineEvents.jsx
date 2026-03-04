import { useState } from "react";
import supabase from "../utils/supabase";

export default function DeleteRoutineEvents({ routineId, onSuccess }) {
    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [progress, setProgress] = useState(0);



    const handleDelete = async () => {
        try {
            if (!startDate || !endDate) {
                alert("Please select dates");
                return;
            }

            setIsDeleting(true);
            setProgress(0);

            const start = new Date(startDate);
            const end = new Date(endDate);

            const totalDays =
                Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

            let processedDays = 0;
            let current = new Date(start);

            while (current <= end) {
                const nextDay = new Date(current);
                nextDay.setDate(nextDay.getDate() + 1);

                const { error } = await supabase
                    .from("events")
                    .delete()
                    .eq("routine_id", routineId)
                    .gte("start_at", current.toISOString())
                    .lt("start_at", nextDay.toISOString());

                if (error) throw error;

                processedDays++;
                setProgress(
                    Math.round((processedDays / totalDays) * 100)
                );

                current.setDate(current.getDate() + 1);
            }

            setProgress(100);

            setTimeout(() => {
                setIsDeleting(false);
                onSuccess?.();
                onClose?.();
            }, 500);

        } catch (err) {
            console.error(err);
            alert("Error deleting events");
            setIsDeleting(false);
        }
    };

    return (
        <div className="form" style={{ width: "20vw" }}>
            <div className="form-field">
                <label>Start Date</label>
                <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isDeleting}
                />
            </div>

            <div className="form-field">
                <label>End Date</label>
                <input
                    type="date"
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isDeleting}
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

                    <p className="text-xs text-gray-500 mt-1">
                        {progress}% complete
                    </p>
                </div>
            )}

            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded text-white ${isDeleting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
            >
                {isDeleting ? "Deleting..." : "Delete Events"}
            </button>
        </div>
    );
}