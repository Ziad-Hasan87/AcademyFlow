import { useState } from "react";
import supabase from "../utils/supabase";

export default function GenerateRoutineEvents({ routineId, onSuccess }) {
    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleGenerate = async () => {
        try {
            setIsGenerating(true);
            setProgress(0);

            const start = new Date(startDate);
            const end = new Date(endDate);

            const totalDays =
                Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

            let processedDays = 0;

            const eventsToInsert = [];

            let current = new Date(start);

            while (current <= end) {
                const dayOfWeek = current
                    .toLocaleDateString("en-US", { weekday: "long" })
                    .toLowerCase();

                const eventsForDay = recurringEvents.filter(
                    (e) => e.day_of_week.toLowerCase() === dayOfWeek
                );

                for (const recurring of eventsForDay) {
                    const isVacation = vacations.some((vac) => {
                        const vacStart = new Date(vac.start_day);
                        const vacEnd = new Date(vac.end_day);

                        const inRange =
                            current >= vacStart && current <= vacEnd;

                        if (!inRange) return false;

                        if (vac.from_table === "all") return true;

                        if (
                            vac.from_table === "programs" &&
                            vac.for_users === programId
                        )
                            return true;

                        if (
                            vac.from_table === "operations" &&
                            vac.for_users === operationId
                        )
                            return true;

                        if (
                            vac.from_table === "departments" &&
                            vac.for_users === departmentId
                        )
                            return true;

                        return false;
                    });

                    if (!isVacation) {
                        const startAt = combineDateAndTime(
                            current,
                            recurring.start_at
                        );
                        const endAt = combineDateAndTime(
                            current,
                            recurring.end_at
                        );

                        eventsToInsert.push({
                            title: recurring.title,
                            type: recurring.type,
                            start_at: startAt,
                            end_at: endAt,
                            start_slot: recurring.start_slot,
                            end_slot: recurring.end_slot,
                            description: recurring.description,
                            routine_id: routineId,
                            is_reschedulable: recurring.is_reschedulable,
                            for_users: recurring.for_users,
                            from_table: recurring.from_table,
                            curse_id: recurring.course_id,
                            institute_id: recurring.institute_id,
                            created_by: recurring.created_by,
                        });
                    }
                }

                processedDays++;
                setProgress(
                    Math.round((processedDays / totalDays) * 100)
                );

                current.setDate(current.getDate() + 1);
            }

            if (eventsToInsert.length > 0) {
                const { error } = await supabase
                    .from("events")
                    .insert(eventsToInsert);

                if (error) throw error;
            }

            setProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                onSuccess?.();
                onClose();
            }, 500);
        } catch (err) {
            console.error(err);
            alert("Error generating events");
            setIsGenerating(false);
        }
    };

    return (
        <div className="form" style={{ width: "20vw" }}>
            <div className="form-field">
                <label>Start Date</label>
                <input
                    disabled={isGenerating}
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
                    disabled={isGenerating}
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
            {isGenerating && (
                <div className="mt-4">
                    <p className="text-sm font-medium mb-2">
                        Generating Events...
                    </p>

                    <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                        <div
                            className="bg-blue-600 h-3 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
            <button
                className="form-submit"
                disabled={isGenerating}
                style={{ marginTop: "15px" }}
                onClick={handleGenerate}
            >
                Generate Events
            </button>
        </div>
    );
}