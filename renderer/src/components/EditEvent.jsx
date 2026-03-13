import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

import {
    fetchOperations,
    fetchPrograms,
    fetchSlots,
    fetchGroups,
    fetchSubgroups
} from "../utils/fetch";

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

    }, [event]);

    useEffect(() => {

        if (!instituteId) return;

        fetchSlots(instituteId, setSlots);

    }, [instituteId]);

    useEffect(() => {

        if (!event?.routine_id) return;

        fetchGroups(selectedProgram, "", setGroups, () => { });

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

            alert("Event updated");
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