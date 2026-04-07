import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

import {
    fetchOperations,
    fetchPrograms,
    fetchSlots,
    fetchGroups,
    fetchSubgroups,
    fetchProgramChatId,
    fetchBotId,
    resolveProgramIdFromEventTarget,
    resolveSlotTimesFromIds,
    resolveEventTargetLabel,
    fetchProgramName
} from "../utils/fetch";
import { sendTelegramNotification } from "../utils/telegramNotifications";
import { generateEventNotificationFromJson } from "../utils/chatbot";

export default function CreateEvent({ routineId, onSave }) {

    const { userData } = useAuth();

    const instituteId = userData?.institute_id;
    const userId = userData?.id;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [date, setDate] = useState("");

    const [type, setType] = useState("slot");

    const [startSlot, setStartSlot] = useState("");
    const [endSlot, setEndSlot] = useState("");

    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const [isReschedulable, setIsReschedulable] = useState(true);

    const [slots, setSlots] = useState([]);

    const [fromTable, setFromTable] = useState("programs");

    const [programs, setPrograms] = useState([]);
    const [operations, setOperations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [subgroups, setSubgroups] = useState([]);

    const [selectedProgram, setSelectedProgram] = useState("");
    const [selectedOperation, setSelectedOperation] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [selectedSubgroup, setSelectedSubgroup] = useState("");

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const toTelegramHtml = (value) => {
        const escaped = escapeHtml(value);
        return escaped.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    };

    const toNotificationAttributes = async (attributes) => {
        const next = { ...attributes };

        if (next.type === "slot") {
            const { start_time, end_time } = await resolveSlotTimesFromIds(next.start_slot, next.end_slot);
            next.start_time = start_time;
            next.end_time = end_time;
        } else {
            next.start_time = next.start_at || null;
            next.end_time = next.end_at || null;
        }

        delete next.start_slot;
        delete next.end_slot;
        delete next.start_at;
        delete next.end_at;

        return next;
    };

    const notifyTelegramForCreatedEvent = async (targetFromTable, targetForUsers, newAttributes) => {
        try {
            const programId = await resolveProgramIdFromEventTarget(targetFromTable, targetForUsers);
            if (!programId) return;

            const [botId, chatId] = await Promise.all([
                fetchBotId(instituteId),
                fetchProgramChatId(programId)
            ]);

            if (!botId || !chatId) return;

            const [targetLabel, programName] = await Promise.all([
                resolveEventTargetLabel(targetFromTable, targetForUsers),
                fetchProgramName(programId)
            ]);

            const notificationAttributes = await toNotificationAttributes({
                ...newAttributes,
                from_table: targetFromTable,
                for_users: targetLabel || targetForUsers,
                program: programName || null
            });

            const aiSummary = await generateEventNotificationFromJson({
                action: "created",
                newAttributes: {
                    ...notificationAttributes
                }
            });

            const message = `<b>AcademyFlow Notification</b>\n${toTelegramHtml(aiSummary)}`;

            const notifyResult = await sendTelegramNotification(message, { botId, chatId });
            if (!notifyResult?.ok) {
                console.warn("Telegram notification failed:", notifyResult?.error || "Unknown error");
            }
        } catch (notifyError) {
            console.error("Error sending create-event Telegram notification:", notifyError);
        }
    };

    /* ---------------- FETCH PROGRAMS ---------------- */

    useEffect(() => {

        if (!instituteId) return;

        fetchPrograms(
            instituteId,
            "",
            setPrograms,
            () => {}
        );

    }, [instituteId]);

    /* ---------------- FETCH SLOTS ---------------- */

    useEffect(() => {

        if (!instituteId) return;

        fetchSlots(instituteId, setSlots);

    }, [instituteId]);

    /* ---------------- OPERATIONS ---------------- */

    useEffect(() => {

        if (!selectedProgram) {
            setOperations([]);
            return;
        }

        fetchOperations(
            selectedProgram,
            "",
            setOperations,
            () => {}
        );

    }, [selectedProgram]);

    /* ---------------- GROUPS ---------------- */

    useEffect(() => {

        if (!selectedOperation) {
            setGroups([]);
            return;
        }

        fetchGroups(
            selectedOperation,
            "",
            setGroups,
            () => {}
        );

    }, [selectedOperation]);

    /* ---------------- SUBGROUPS ---------------- */

    useEffect(() => {

        if (!selectedGroup) {
            setSubgroups([]);
            return;
        }

        fetchSubgroups(
            selectedGroup,
            "",
            setSubgroups,
            () => {}
        );

    }, [selectedGroup]);

    /* ---------------- CREATE EVENT ---------------- */

    const handleCreate = async (e) => {

        e.preventDefault();

        if (!title) {
            alert("Title required");
            return;
        }

        if (!date) {
            alert("Date required");
            return;
        }

        if (type === "slot") {

            if (!startSlot || !endSlot) {
                alert("Start and end slot required");
                return;
            }

        }

        if (type === "time") {

            if (!startTime || !endTime) {
                alert("Start and end time required");
                return;
            }

        }

        let forUsers = null;

        if (fromTable === "programs") {
            forUsers = selectedProgram;
        }

        if (fromTable === "operations") {
            forUsers = selectedOperation;
        }

        if (fromTable === "groups") {
            forUsers = selectedGroup;
        }

        if (fromTable === "subgroups") {
            forUsers = selectedSubgroup;
        }

        const insertData = {

            title,
            description,
            type,
            date,

            start_slot: type === "slot" ? startSlot : null,
            end_slot: type === "slot" ? endSlot : null,

            start_at: type === "time" ? startTime : null,
            end_at: type === "time" ? endTime : null,

            from_table: fromTable,
            for_users: forUsers,

            created_by: userId,
            institute_id: instituteId,

            routine_id: routineId || null,

            is_reschedulable: isReschedulable

        };

        const { error } = await supabase
            .from("events")
            .insert(insertData);

        if (error) {

            console.error(error);
            alert("Failed to create event");

        } else {

            await notifyTelegramForCreatedEvent(fromTable, forUsers, insertData);

            alert("Event created");
            onSave?.();

        }

    };

    return (

        <form className="form" onSubmit={handleCreate}>

            <h3>Create Event</h3>

            {/* TITLE */}

            <div className="form-field">

                <label>Title</label>

                <input
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

            </div>

            {/* DATE */}

            <div className="form-field">

                <label>Date</label>

                <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />

            </div>

            {/* TYPE */}

            <div className="form-field">

                <label>Event Type</label>

                <select
                    className="form-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                >
                    <option value="slot">Slot</option>
                    <option value="time">Time</option>
                </select>

            </div>

            {/* SLOT EVENTS */}

            {type === "slot" && (

                <>
                    <div className="form-field">

                        <label>Start Slot</label>

                        <select
                            className="form-select"
                            value={startSlot}
                            onChange={(e) => setStartSlot(e.target.value)}
                        >

                            <option value="">Select Slot</option>

                            {slots.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}

                        </select>

                    </div>

                    <div className="form-field">

                        <label>End Slot</label>

                        <select
                            className="form-select"
                            value={endSlot}
                            onChange={(e) => setEndSlot(e.target.value)}
                        >

                            <option value="">Select Slot</option>

                            {slots.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}

                        </select>

                    </div>
                </>

            )}

            {/* TIME EVENTS */}

            {type === "time" && (

                <>
                    <div className="form-field">

                        <label>Start Time</label>

                        <input
                            type="time"
                            className="form-input"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />

                    </div>

                    <div className="form-field">

                        <label>End Time</label>

                        <input
                            type="time"
                            className="form-input"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />

                    </div>
                </>

            )}

            {/* FROM TABLE */}

            <div className="form-field">

                <label>From</label>

                <select
                    className="form-select"
                    value={fromTable}
                    onChange={(e) => setFromTable(e.target.value)}
                >
                    <option value="programs">Programs</option>
                    <option value="operations">Operations</option>
                    <option value="groups">Groups</option>
                    <option value="subgroups">Subgroups</option>
                </select>

            </div>

            {/* PROGRAM */}

            <div className="form-field">

                <label>Program</label>

                <select
                    className="form-select"
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                >

                    <option value="">Select Program</option>

                    {programs.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}

                </select>

            </div>

            {/* OPERATION */}

            {["operations","groups","subgroups"].includes(fromTable) && (

                <div className="form-field">

                    <label>Operation</label>

                    <select
                        className="form-select"
                        value={selectedOperation}
                        onChange={(e) => setSelectedOperation(e.target.value)}
                    >

                        <option value="">Select Operation</option>

                        {operations.map(op => (
                            <option key={op.id} value={op.id}>
                                {op.name}
                            </option>
                        ))}

                    </select>

                </div>

            )}

            {/* GROUP */}

            {["groups","subgroups"].includes(fromTable) && (

                <div className="form-field">

                    <label>Group</label>

                    <select
                        className="form-select"
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                    >

                        <option value="">Select Group</option>

                        {groups.map(g => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}

                    </select>

                </div>

            )}

            {/* SUBGROUP */}

            {fromTable === "subgroups" && (

                <div className="form-field">

                    <label>Subgroup</label>

                    <select
                        className="form-select"
                        value={selectedSubgroup}
                        onChange={(e) => setSelectedSubgroup(e.target.value)}
                    >

                        <option value="">Select Subgroup</option>

                        {subgroups.map(sg => (
                            <option key={sg.id} value={sg.id}>
                                {sg.name}
                            </option>
                        ))}

                    </select>

                </div>

            )}

            {/* DESCRIPTION */}

            <div className="form-field">

                <label>Description</label>

                <textarea
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

            </div>

            {/* RESCHEDULABLE */}

            <div className="form-field">

                <label>

                    <input
                        type="checkbox"
                        checked={isReschedulable}
                        onChange={(e) => setIsReschedulable(e.target.checked)}
                    />

                    Reschedulable

                </label>

            </div>

            {/* BUTTONS */}

            <div className="form-buttons">

                <button type="submit" className="form-submit">
                    Create Event
                </button>

                <button
                    type="button"
                    className="form-cancel"
                    onClick={onSave}
                >
                    Cancel
                </button>

            </div>

        </form>
    );
}