import { useEffect, useState, useRef } from "react";
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
import { hasPermission } from "../utils/types";
import { sendTelegramNotification } from "../utils/telegramNotifications";
import { generateEventNotificationFromJson } from "../utils/chatbot";

export default function EditEvent({ event, onSave }) {

    const { userData } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [date, setDate] = useState("");

    const [type, setType] = useState("slot");

    const [startSlot, setStartSlot] = useState("");
    const [endSlot, setEndSlot] = useState("");

    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const [forUsers, setForUsers] = useState("");
    const [slots, setSlots] = useState([]);

    const [selectedGroupId, setSelectedGroupId] = useState("");

    const [isReschedulable, setIsReschedulable] = useState(true);

    const instituteId = userData?.institute_id;

    const [fromTable, setFromTable] = useState("programs");

    const [programs, setPrograms] = useState([]);
    const [operations, setOperations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [subgroups, setSubgroups] = useState([]);

    const [selectedProgram, setSelectedProgram] = useState("");
    const [selectedOperation, setSelectedOperation] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [selectedSubgroup, setSelectedSubgroup] = useState("");

    const [attachments, setAttachments] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [deletedAttachments, setDeletedAttachments] = useState([]);
    const [hasAttachments, setHasAttachments] = useState(false);

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

    const notifyTelegramForUpdatedEvent = async (
        targetFromTable,
        targetForUsers,
        oldAttributes,
        newAttributes
    ) => {
        try {
            const programId = await resolveProgramIdFromEventTarget(targetFromTable, targetForUsers);
            if (!programId) return;

            const [botId, chatId] = await Promise.all([
                fetchBotId(instituteId),
                fetchProgramChatId(programId)
            ]);

            if (!botId || !chatId) return;

            const [oldTargetLabel, newTargetLabel, programName] = await Promise.all([
                resolveEventTargetLabel(oldAttributes.from_table, oldAttributes.for_users),
                resolveEventTargetLabel(targetFromTable, targetForUsers),
                fetchProgramName(programId)
            ]);

            const normalizedOldAttributes = await toNotificationAttributes(oldAttributes);
            const normalizedNewAttributes = await toNotificationAttributes({
                ...newAttributes,
                from_table: targetFromTable,
                for_users: targetForUsers
            });

            const aiSummary = await generateEventNotificationFromJson({
                action: "updated",
                oldAttributes: {
                    ...normalizedOldAttributes,
                    from_table: oldAttributes.from_table,
                    for_users: oldTargetLabel || oldAttributes.for_users,
                    program: programName || null
                },
                newAttributes: {
                    ...normalizedNewAttributes,
                    from_table: targetFromTable,
                    for_users: newTargetLabel || targetForUsers,
                    program: programName || null
                }
            });

            const message = `<b>AcademyFlow Notification</b>\n${toTelegramHtml(aiSummary)}`;

            const notifyResult = await sendTelegramNotification(message, { botId, chatId });
            if (!notifyResult?.ok) {
                console.warn("Telegram notification failed:", notifyResult?.error || "Unknown error");
            }
        } catch (notifyError) {
            console.error("Error sending edit-event Telegram notification:", notifyError);
        }
    };

    const toDateInputValue = (value) => {
        if (!value) return "";
        return String(value).slice(0, 10);
    };

    const toTimeInputValue = (value) => {
        if (!value) return "";
        if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) return value;

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return String(value).slice(0, 5);
        }

        const hours = String(parsed.getHours()).padStart(2, "0");
        const minutes = String(parsed.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };


    useEffect(() => {

        if (!userData?.institute_id) return;

        fetchPrograms(
            userData.institute_id,
            "",
            setPrograms,
            () => { }
        );

    }, [userData]);

    useEffect(() => {

        if (!event) return;

        setTitle(event.title || "");
        setDescription(event.description || "");
        setDate(toDateInputValue(event.date));

        setType(event.type || "slot");

        setStartSlot(event.start_slot || "");
        setEndSlot(event.end_slot || "");

        setStartTime(toTimeInputValue(event.start_at));
        setEndTime(toTimeInputValue(event.end_at));

        setFromTable(event.from_table || "groups");
        setForUsers(event.for_users || "");
        setIsReschedulable(event.is_reschedulable ?? true);
        setHasAttachments(event.has_attachments ?? false);

    }, [event]);

    useEffect(() => {

        if (!instituteId) return;

        fetchSlots(instituteId, setSlots);

    }, [instituteId]);

    const enableAttachments = async () => {

        const { error } = await supabase
            .from("events")
            .update({ has_attachments: true })
            .eq("id", event.id);

        if (error) {
            alert("Failed to enable attachments");
            return;
        }

        setHasAttachments(true);
    };

    const fileInputRef = useRef(null);

    useEffect(() => {

        if (!event?.routine_id) return;

        fetchGroups(selectedProgram, "", setGroups, () => { });

    }, [event]);

    useEffect(() => {
        if (!event?.id) return;
        loadAttachments();
    }, [event]);

    const loadAttachments = async () => {

        const { data, error } = await supabase
            .from("attachments")
            .select("*")
            .eq("event_id", event.id);

        if (!error) setAttachments(data || []);
    };

    const handleFileSelect = (e) => {

        const files = Array.from(e.target.files);
        setNewFiles(prev => [...prev, ...files]);

        e.target.value = "";

    };

    const removeQueuedFile = (indexToRemove) => {

        setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));

    };

    const markAttachmentDelete = (id) => {

        setDeletedAttachments(prev => [...prev, id]);

    };

    const downloadAttachment = async (filePath, fileName) => {

        const { data, error } = await supabase
            .storage
            .from("attachments")
            .download(filePath);

        if (error) return;

        const url = URL.createObjectURL(data);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
    };
    useEffect(() => {

        if (!event?.for_users || !event?.from_table) return;

        const loadHierarchy = async () => {

            if (event.from_table === "programs") {

                setSelectedProgram(event.for_users);

            }

            if (event.from_table === "operations") {

                const { data: operation } = await supabase
                    .from("operations")
                    .select("id, program_id")
                    .eq("id", event.for_users)
                    .single();

                if (!operation) return;

                setSelectedProgram(operation.program_id);
                setSelectedOperation(operation.id);
            }

            if (event.from_table === "groups") {

                const { data: group } = await supabase
                    .from("groups")
                    .select("id, program_id")
                    .eq("id", event.for_users)
                    .single();

                if (!group) return;

                setSelectedProgram(group.program_id);
                setSelectedGroup(group.id);

                // fetch operation under that program if exists
                const { data: ops } = await supabase
                    .from("operations")
                    .select("id")
                    .eq("program_id", group.program_id);

                if (ops?.length) setSelectedOperation(ops[0].id);

            }

            if (event.from_table === "subgroups") {

                const { data: subgroup } = await supabase
                    .from("subgroups")
                    .select("id, group_id")
                    .eq("id", event.for_users)
                    .single();

                if (!subgroup) return;

                setSelectedSubgroup(subgroup.id);

                const { data: group } = await supabase
                    .from("groups")
                    .select("id, program_id")
                    .eq("id", subgroup.group_id)
                    .single();

                if (!group) return;

                setSelectedGroup(group.id);
                setSelectedProgram(group.program_id);

                const { data: ops } = await supabase
                    .from("operations")
                    .select("id")
                    .eq("program_id", group.program_id);

                if (ops?.length) setSelectedOperation(ops[0].id);

            }

        };

        loadHierarchy();

    }, [event]);

    useEffect(() => {

        if (!selectedProgram) {
            setOperations([]);
            return;
        }

        fetchOperations(
            selectedProgram,
            "",
            setOperations,
            () => { }
        );

    }, [selectedProgram]);

    useEffect(() => {

        if (!selectedOperation) {
            setGroups([]);
            return;
        }

        fetchGroups(
            selectedProgram,
            "",
            setGroups,
            () => { }
        );

    }, [selectedOperation]);

    useEffect(() => {

        if (!selectedGroup) {
            setSubgroups([]);
            return;
        }

        fetchSubgroups(
            selectedGroup,
            "",
            setSubgroups,
            () => { }
        );

    }, [selectedGroup]);

    useEffect(() => {

        if (fromTable !== "subgroups" || !selectedGroupId) return;

        fetchSubgroups(selectedGroupId, "", setSubgroups, () => { });

    }, [fromTable, selectedGroupId]);

    const handleUpdate = async (e) => {

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

        const updateData = {

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

            is_reschedulable: isReschedulable

        };

        const oldAttributes = {
            title: event.title,
            description: event.description,
            type: event.type,
            date: event.date,
            start_slot: event.start_slot,
            end_slot: event.end_slot,
            start_at: event.start_at,
            end_at: event.end_at,
            from_table: event.from_table,
            for_users: event.for_users,
            is_reschedulable: event.is_reschedulable
        };

        const { error } = await supabase
            .from("events")
            .update(updateData)
            .eq("id", event.id);

        if (error) {

            console.error(error);
            alert("Update failed");

        } else {

            // DELETE attachments marked for deletion
            for (const id of deletedAttachments) {

                const attachment = attachments.find(a => a.id === id);
                if (!attachment) continue;

                await supabase.storage
                    .from("attachments")
                    .remove([attachment.file_path]);

                await supabase
                    .from("attachments")
                    .delete()
                    .eq("id", id);
            }

            for (const file of newFiles) {
                if (!event?.id) {
                    console.error("Event ID is missing");
                    return;
                }

                const sanitize = (name) =>
                    name
                        .normalize("NFKD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^\w.-]/g, "_");

                const path = `event/${event.id}/${crypto.randomUUID()}-${sanitize(file.name)}`;

                console.log("Uploading file:", file.name, "to path:", path);

                const { error: uploadError } = await supabase
                    .storage
                    .from("attachments")
                    .upload(path, file, { upsert: false });

                if (uploadError) {
                    console.error("Upload error for file", file.name, uploadError);
                    continue; // skip this file, don't break the whole update
                }

                const { error: insertAttachmentError } = await supabase
                    .from("attachments")
                    .insert({
                        event_id: event.id,
                        course_id: event.course_id ?? null,
                        operation_id: event.operation_id ?? null,
                        institute_id: event.institute_id ?? userData?.institute_id ?? null,
                        uploaded_by: userData?.id ?? null,
                        file_path: path,
                        file_name: file.name
                    });

                if (insertAttachmentError) {
                    console.error("Attachment metadata insert failed:", {
                        message: insertAttachmentError.message,
                        details: insertAttachmentError.details,
                        hint: insertAttachmentError.hint,
                        code: insertAttachmentError.code
                    });

                    // Keep storage and DB in sync by removing the uploaded object on DB insert failure.
                    await supabase.storage
                        .from("attachments")
                        .remove([path]);

                    continue;
                }
            }

            await notifyTelegramForUpdatedEvent(
                fromTable,
                forUsers,
                oldAttributes,
                updateData
            );

            alert("Event updated");

            setDeletedAttachments([]);
            setNewFiles([]);

            onSave?.();
        }

    };

    const handleDelete = async () => {

        if (!window.confirm("Delete event?")) return;

        const deletePayload = {
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
            is_reschedulable: isReschedulable
        };

        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", event.id);

        if (error) {

            console.error(error);
            alert("Delete failed");

        } else {
            try {
                const programId = await resolveProgramIdFromEventTarget(fromTable, forUsers);

                if (programId) {
                    const [botId, chatId, targetLabel, programName] = await Promise.all([
                        fetchBotId(instituteId),
                        fetchProgramChatId(programId),
                        resolveEventTargetLabel(fromTable, forUsers),
                        fetchProgramName(programId)
                    ]);

                    if (botId && chatId) {
                        const normalizedDeletedAttributes = await toNotificationAttributes({
                            ...deletePayload,
                            for_users: targetLabel || forUsers,
                            program: programName || null
                        });

                        const aiSummary = await generateEventNotificationFromJson({
                            action: "deleted",
                            deletedAttributes: normalizedDeletedAttributes
                        });

                        const message = `<b>AcademyFlow Notification</b>\n${toTelegramHtml(aiSummary)}`;
                        const notifyResult = await sendTelegramNotification(message, { botId, chatId });
                        if (!notifyResult?.ok) {
                            console.warn("Telegram delete notification failed:", notifyResult?.error || "Unknown error");
                        }
                    }
                }
            } catch (notifyError) {
                console.error("Error preparing delete-event notification:", notifyError);
            }

            onSave?.();

        }

    };

    if (!event) return null;

    return (

        <form className="form" onSubmit={handleUpdate}>

            <h3>Edit Event</h3>

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

            <div className="form-field">
                <label>Program</label>

                <select
                    className="form-select"
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                >
                    <option value="">Select Program</option>

                    {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}

                </select>
            </div>

            {["operations", "groups", "subgroups"].includes(fromTable) && (

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
            {["groups", "subgroups"].includes(fromTable) && (

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

            {/* ATTACHMENTS */}
            {!hasAttachments && attachments.length === 0 && (

                <div className="form-field">

                    <label>Attachments</label>

                    <button
                        type="button"
                        className="form-submit"
                        onClick={enableAttachments}
                    >
                        Allow Attachments
                    </button>

                </div>

            )}

            {(hasAttachments || attachments.length > 0) && (

                <div className="form-field">

                    <label>Attachments</label>

                    {/* Upload input for moderators */}
                    {hasPermission(userData.role, "Teacher") && (

                        <div style={{ marginBottom: "10px" }}>

                            <button
                                type="button"
                                className="form-submit"
                                onClick={() => fileInputRef.current.click()}
                            >
                                Add Attachment
                            </button>

                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleFileSelect}
                            />

                        </div>

                    )}

                    <ul
                        style={{
                            marginTop: "10px",
                            listStyle: "none",
                            padding: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                        }}
                    >

                        {attachments.map(file => {

                            const isDeleted = deletedAttachments.includes(file.id);
                            const fileLabel = file.file_name || file.file_path?.split("/").pop() || "Attachment";

                            return (

                                <li
                                    key={file.id}
                                    style={{
                                        opacity: isDeleted ? 0.4 : 1,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        minWidth: 0,
                                        background: "#f7f9fc",
                                        border: "1px solid #d9e2ec",
                                        borderRadius: "8px",
                                        padding: "8px 10px"
                                    }}
                                >

                                    <span
                                        title={fileLabel}
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            fontSize: "13px"
                                        }}
                                    >
                                        {fileLabel}
                                    </span>

                                    <button
                                        type="button"
                                        aria-label={`Download ${fileLabel}`}
                                        title="Download"
                                        onClick={() =>
                                            downloadAttachment(
                                                file.file_path,
                                                fileLabel
                                            )
                                        }
                                        style={{
                                            width: "30px",
                                            height: "30px",
                                            flexShrink: 0,
                                            border: "1px solid #c5d0dc",
                                            borderRadius: "6px",
                                            background: "white",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M12 3V15M12 15L7 10M12 15L17 10M5 20H19"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>

                                    {hasPermission(userData?.role, "Teacher") && !isDeleted && (

                                        <button
                                            type="button"
                                            onClick={() => markAttachmentDelete(file.id)}
                                            style={{
                                                width: "30px",
                                                height: "30px",
                                                flexShrink: 0,
                                                border: "1px solid #c5d0dc",
                                                borderRadius: "6px",
                                                background: "#d9534f",
                                                color: "white",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ×
                                        </button>

                                    )}

                                </li>

                            );

                        })}

                    </ul>

                    {/* show newly added files */}

                    {newFiles.length > 0 && (

                        <div style={{ marginTop: "10px" }}>

                            <strong>New Files:</strong>

                            <ul style={{ listStyle: "none", padding: 0, marginTop: "8px" }}>

                                {newFiles.map((file, i) => (
                                    <li
                                        key={i}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 10px",
                                            border: "1px solid #d9e2ec",
                                            borderRadius: "8px",
                                            background: "#f7f9fc",
                                            marginBottom: "8px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {file.name}
                                        </span>

                                        <button
                                            type="button"
                                            title="Remove file"
                                            aria-label={`Remove ${file.name}`}
                                            onClick={() => removeQueuedFile(i)}
                                            style={{
                                                width: "30px",
                                                height: "30px",
                                                flexShrink: 0,
                                                border: "1px solid #c5d0dc",
                                                borderRadius: "6px",
                                                background: "#d9534f",
                                                color: "white",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}

                            </ul>

                        </div>

                    )}

                </div>

            )}

            {/* BUTTONS */}

            <div className="form-buttons">

                <button type="submit" className="form-submit">
                    Update Event
                </button>

                <button
                    type="button"
                    className="form-cancel"
                    onClick={onSave}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="form-cancel"
                    style={{ background: "#d9534f", color: "white" }}
                    onClick={handleDelete}
                >
                    Delete
                </button>

            </div>

        </form>
    );
}