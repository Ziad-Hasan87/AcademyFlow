import { useEffect, useState, useRef } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

import {
    fetchOperations,
    fetchPrograms,
    fetchSlots,
    fetchGroups,
    fetchSubgroups
} from "../utils/fetch";
import { hasPermission } from "../utils/types";

export default function EditEvent({ event, onSave }) {

    const { userData } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

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

        setType(event.type || "slot");

        setStartSlot(event.start_slot || "");
        setEndSlot(event.end_slot || "");

        setStartTime(event.start_at || "");
        setEndTime(event.end_at || "");

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
                const file = new File(["Hello"], "test.txt", { type: "text/plain" });
                const { data, error } = await supabase
                    .storage
                    .from("attachments")
                    .upload(`test/${crypto.randomUUID()}-test.txt`, file, { upsert: true });
                console.log(data, error);
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
                    .upload(path, file, { upsert: true });

                if (uploadError) {
                    console.error("Upload error for file", file.name, uploadError);
                    continue; // skip this file, don't break the whole update
                }

                await supabase.from("attachments").insert({
                    event_id: event.id,
                    course_id: event.course_id,
                    operation_id: event.operation_id,
                    institute_id: event.institute_id,
                    uploaded_by: userData.id,
                    file_path: path,
                    file_name: file.name
                });
            }

            alert("Event updated");

            setDeletedAttachments([]);
            setNewFiles([]);

            onSave?.();
        }

    };

    const handleDelete = async () => {

        if (!window.confirm("Delete event?")) return;

        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", event.id);

        if (error) {

            console.error(error);
            alert("Delete failed");

        } else {
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
            {!hasAttachments && (

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

            {hasAttachments && (

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

                    <ul style={{ marginTop: "10px" }}>

                        {attachments.map(file => {

                            const isDeleted = deletedAttachments.includes(file.id);

                            return (

                                <li
                                    key={file.id}
                                    style={{
                                        opacity: isDeleted ? 0.4 : 1,
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "center"
                                    }}
                                >

                                    <span>{file.file_name}</span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            downloadAttachment(file.file_path, file.file_name)
                                        }
                                    >
                                        Download
                                    </button>

                                    {userData?.role === "moderator" && !isDeleted && (

                                        <button
                                            type="button"
                                            onClick={() => markAttachmentDelete(file.id)}
                                            style={{ background: "#d9534f", color: "white" }}
                                        >
                                            X
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

                            <ul>

                                {newFiles.map((f, i) => (
                                    <li key={i}>{f.name}</li>
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