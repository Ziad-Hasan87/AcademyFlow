import { useState } from "react";
import supabase from "../utils/supabase";

export default function GenerateRoutineEvents({ routineId, onSuccess }) {

    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    function combineDateAndTime(date, time) {
        if (!date || !time) return null;

        const [hours, minutes, seconds] = time.split(":");
        const newDate = new Date(date);

        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        newDate.setSeconds(seconds || 0);

        return newDate.toISOString();
    }

    const handleGenerate = async () => {

        try {

            setIsGenerating(true);
            setProgress(0);

            const { data: recurringEvents, error: recurringError } =
                await supabase
                    .from("recurring_events")
                    .select("*")
                    .eq("routine_id", routineId);

            if (recurringError) throw recurringError;

            const { data: routine } =
                await supabase
                    .from("routine")
                    .select("operation_id")
                    .eq("id", routineId)
                    .single();

            const operationId = routine.operation_id;

            const { data: operation } =
                await supabase
                    .from("operations")
                    .select("program_id")
                    .eq("id", operationId)
                    .single();

            const programId = operation.program_id;

            const { data: program } =
                await supabase
                    .from("programs")
                    .select("department_id")
                    .eq("id", programId)
                    .single();

            const departmentId = program.department_id;

            const { data: vacations } =
                await supabase
                    .from("vacations")
                    .select("*");

            const courseIds = [
                ...new Set(
                    recurringEvents
                        .map((e) => e.course_id)
                        .filter(Boolean)
                ),
            ];

            let moderatorMap = {};

            if (courseIds.length > 0) {

                const { data: courseModerators } =
                    await supabase
                        .from("course_moderators")
                        .select("course_id, user_id")
                        .in("course_id", courseIds);

                courseModerators.forEach((m) => {

                    if (!moderatorMap[m.course_id]) {
                        moderatorMap[m.course_id] = [];
                    }

                    moderatorMap[m.course_id].push(m.user_id);
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            const totalDays =
                Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

            let processedDays = 0;
            let current = new Date(start);

            const eventsToInsert = [];

            while (current <= end) {

                const dayOfWeek =
                    current
                        .toLocaleDateString("en-US", { weekday: "long" })
                        .toLowerCase();

                const dateString =
                    current.toISOString().split("T")[0];

                const weekNumber =
                    Math.floor(
                        (current - start) / (1000 * 60 * 60 * 24 * 7)
                    ) + 1;

                const eventsForDay =
                    recurringEvents.filter(
                        (e) =>
                            e.day_of_week.toLowerCase() === dayOfWeek
                    );

                for (const recurring of eventsForDay) {

                    const weekNumber =
                        Math.floor(
                            (current - start) / (1000 * 60 * 60 * 24 * 7)
                        ) + 1;

                    const n = recurring.repeat_every || 1;
                    const m = recurring.start_week || 1;

                    if (weekNumber < m) continue;

                    if ((weekNumber - m) % n !== 0) continue;

                    const isVacation = vacations.some((vac) => {

                        const vacStart = new Date(vac.start_day);
                        const vacEnd = new Date(vac.end_day);

                        const inRange =
                            current >= vacStart &&
                            current <= vacEnd;

                        if (!inRange) return false;

                        if (vac.from_table === "all")
                            return true;

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

                        const startAt =
                            combineDateAndTime(
                                dateString,
                                recurring.start_at
                            );

                        const endAt =
                            combineDateAndTime(
                                dateString,
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
                            course_id: recurring.course_id,
                            institute_id: recurring.institute_id,
                            created_by: recurring.created_by,
                            date: dateString
                        });

                    }
                }

                processedDays++;

                setProgress(
                    Math.round(
                        (processedDays / totalDays) * 100
                    )
                );

                current.setDate(current.getDate() + 1);
            }

            const { data: insertedEvents, error } =
                await supabase
                    .from("events")
                    .insert(eventsToInsert)
                    .select("id, course_id");

            if (error) throw error;

            const eventModeratorRows = [];

            insertedEvents.forEach((event) => {

                if (!event.course_id) return;

                const moderators =
                    moderatorMap[event.course_id];

                if (!moderators) return;

                moderators.forEach((userId) => {

                    eventModeratorRows.push({
                        user_id: userId,
                        event_id: event.id
                    });

                });
            });

            if (eventModeratorRows.length > 0) {

                const { error: modError } =
                    await supabase
                        .from("event_moderators")
                        .insert(eventModeratorRows);

                if (modError) throw modError;
            }

            setProgress(100);

            setTimeout(() => {

                setIsGenerating(false);

                onSuccess?.();

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
                    onChange={(e) =>
                        setEndDate(e.target.value)
                    }
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
                            style={{
                                width: `${progress}%`
                            }}
                        />

                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                        {progress}% complete
                    </p>

                </div>
            )}

            <button
                className="form-submit"
                disabled={isGenerating}
                style={{ marginTop: "15px" }}
                onClick={handleGenerate}
            >

                {isGenerating
                    ? "Generating..."
                    : "Generate Events"}

            </button>

        </div>
    );
}