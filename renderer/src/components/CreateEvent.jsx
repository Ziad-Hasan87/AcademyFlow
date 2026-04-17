import { useEffect, useRef, useState } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

import {
    fetchOperations,
    fetchPrograms,
    fetchSlots,
    fetchGroups,
    fetchSubgroups,
    fetchDepartments,
    fetchCoursesByOperation,
    fetchProgramChatId,
    fetchBotId,
    resolveProgramIdFromEventTarget,
    resolveSlotTimesFromIds,
    resolveEventTargetLabel,
    fetchProgramName
} from "../utils/fetch";
import { sendTelegramNotification } from "../utils/telegramNotifications";
import { generateEventNotificationFromJson } from "../utils/chatbot";

export default function CreateEvent({ routineId, onSave, defaultDate = "", defaultStartSlot = "" }) {

    const { userData } = useAuth();
    const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [departments, setDepartments] = useState([]);

    const [enableModerators] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [teachers, setTeachers] = useState([]);
    const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
    const [selectedTeacherToAdd, setSelectedTeacherToAdd] = useState("");
    const [selectedModerators, setSelectedModerators] = useState([]);
    const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

    const [selectedProgram, setSelectedProgram] = useState("");
    const [selectedOperation, setSelectedOperation] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [selectedSubgroup, setSelectedSubgroup] = useState("");
    const [eventImageUrl, setEventImageUrl] = useState("");
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isDeletingImage, setIsDeletingImage] = useState(false);
    const imageFileInputRef = useRef(null);

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

    const toTimestampWithTimeZone = (dateValue, timeValue) => {
        if (!dateValue || !timeValue) return null;

        const dateTime = new Date(`${dateValue}T${timeValue}`);
        if (Number.isNaN(dateTime.getTime())) return null;

        return dateTime.toISOString();
    };

    const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const raw = String(reader.result || "");
                const base64Data = raw.includes(",") ? raw.split(",")[1] : raw;
                resolve(base64Data);
            };
            reader.onerror = () => reject(new Error("Failed to read selected file."));
            reader.readAsDataURL(file);
        });

    const uploadImageFromWeb = async (file) => {
        if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
            throw new Error(
                "Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET in renderer/.env"
            );
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", cloudinaryUploadPreset);
        formData.append("folder", "academyflow/events");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        const result = await response.json();

        if (!response.ok || !result?.secure_url) {
            throw new Error(result?.error?.message || `Cloudinary upload failed (${response.status}).`);
        }

        return {
            ok: true,
            secureUrl: result.secure_url,
        };
    };

    const handleUploadImageClick = () => {
        if (isUploadingImage || isDeletingImage) return;
        imageFileInputRef.current?.click();
    };

    const handleDeleteImage = () => {
        if (!eventImageUrl || isUploadingImage || isDeletingImage) return;
        setIsDeletingImage(true);
        setEventImageUrl("");
        setIsDeletingImage(false);
    };

    const handleImageFileChange = async (e) => {
        const selectedFile = e.target.files?.[0];
        e.target.value = "";

        if (!selectedFile) return;

        if (!selectedFile.type?.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }

        try {
            setIsUploadingImage(true);

            let uploadResult;
            if (window?.electronAPI?.uploadProfileImage) {
                const base64Data = await fileToBase64(selectedFile);
                uploadResult = await window.electronAPI.uploadProfileImage({
                    base64Data,
                    mimeType: selectedFile.type,
                    fileName: selectedFile.name,
                    currentImageUrl: eventImageUrl || null,
                });
            } else {
                uploadResult = await uploadImageFromWeb(selectedFile);
            }

            if (!uploadResult?.ok || !uploadResult?.secureUrl) {
                throw new Error(uploadResult?.error || "Cloudinary upload failed.");
            }

            setEventImageUrl(uploadResult.secureUrl);
        } catch (error) {
            console.error("Error uploading event image:", error);
            alert(error?.message || "Image upload failed.");
        } finally {
            setIsUploadingImage(false);
        }
    };

    const getTeacherLabel = (teacher) => {
        const teacherName = teacher.users?.name || teacher.name || "Unknown";
        const codename = teacher.codename || "N/A";
        return `${teacherName} - ${codename}`;
    };

    const addSelectedModerator = () => {
        if (!selectedTeacherToAdd) return;

        const teacherToAdd = teachers.find((teacher) => teacher.id === selectedTeacherToAdd);
        if (!teacherToAdd) return;

        setSelectedModerators((prev) => {
            if (prev.some((moderator) => moderator.id === teacherToAdd.id)) return prev;
            return [
                ...prev,
                {
                    id: teacherToAdd.id,
                    label: getTeacherLabel(teacherToAdd),
                },
            ];
        });

        setSelectedTeacherToAdd("");
        setTeacherSearchQuery("");
        setShowTeacherDropdown(false);
    };

    const removeSelectedModerator = (userId) => {
        setSelectedModerators((prev) => prev.filter((moderator) => moderator.id !== userId));
    };

    const filteredTeachers = teachers.filter((teacher) => {
        const teacherName = String(teacher.users?.name || teacher.name || "").toLowerCase();
        const query = teacherSearchQuery.trim().toLowerCase();

        if (!query) return true;

        return teacherName.includes(query);
    });

    const handleTeacherSearchChange = (value) => {
        setTeacherSearchQuery(value);
        setSelectedTeacherToAdd("");
        setShowTeacherDropdown(Boolean(value.trim()));
    };

    const handleTeacherOptionPick = (teacher) => {
        setTeacherSearchQuery(getTeacherLabel(teacher));
        setSelectedTeacherToAdd(teacher.id);
        setShowTeacherDropdown(false);
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

    useEffect(() => {

        if (!instituteId) return;

        fetchDepartments(
            instituteId,
            "",
            setDepartments,
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
            setGroups([]);
            setSubgroups([]);
            setCourses([]);
            setSelectedOperation("");
            setSelectedGroup("");
            setSelectedSubgroup("");
            setSelectedCourse("");
            return;
        }

        fetchOperations(
            selectedProgram,
            "",
            setOperations,
            () => {}
        );

        fetchGroups(
            selectedProgram,
            "",
            setGroups,
            () => {}
        );

    }, [selectedProgram]);

    /* ---------------- GROUPS / COURSES ---------------- */

    useEffect(() => {

        if (!selectedOperation) {
            setCourses([]);
            setSelectedCourse("");
            return;
        }

        fetchCoursesByOperation(
            selectedOperation,
            setCourses,
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

    useEffect(() => {
        if (!selectedDepartment) {
            setTeachers([]);
            setSelectedTeacherToAdd("");
            setTeacherSearchQuery("");
            setShowTeacherDropdown(false);
            return;
        }

        supabase
            .from("staffs")
            .select("id, codename, users:users!staffs_id_fkey(name)")
            .eq("department_id", selectedDepartment)
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching teachers:", error);
                    return;
                }

                setTeachers(data || []);
            });
    }, [selectedDepartment]);

    useEffect(() => {
        if (defaultDate) {
            setDate(defaultDate);
        }
    }, [defaultDate]);

    useEffect(() => {
        setStartSlot(defaultStartSlot || "");
    }, [defaultStartSlot]);

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

        const startAtTimestamp =
            type === "time" ? toTimestampWithTimeZone(date, startTime) : null;
        const endAtTimestamp =
            type === "time" ? toTimestampWithTimeZone(date, endTime) : null;

        if (type === "time" && (!startAtTimestamp || !endAtTimestamp)) {
            alert("Invalid time format");
            return;
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

            start_at: startAtTimestamp,
            end_at: endAtTimestamp,

            from_table: fromTable,
            for_users: forUsers,

            created_by: userId,
            institute_id: instituteId,

            course_id: selectedCourse || null,

            routine_id: routineId || null,

            is_reschedulable: isReschedulable

        };

        const { data: insertedEvent, error } = await supabase
            .from("events")
            .insert(insertData)
            .select("id")
            .single();

        if (error) {

            console.error(error);
            alert("Failed to create event");

        } else {

            if (eventImageUrl && insertedEvent?.id) {
                const { error: imageError } = await supabase
                    .from("events")
                    .update({ image_path: eventImageUrl })
                    .eq("id", insertedEvent.id);

                if (imageError) {
                    console.error("Failed to save event image:", imageError);
                    alert("Event created, but image could not be saved.");
                }
            }

            if (enableModerators && selectedModerators.length > 0) {
                const moderatorRows = selectedModerators.map((moderator) => ({
                    user_id: moderator.id,
                    event_id: insertedEvent?.id,
                }));

                const { error: moderatorError } = await supabase
                    .from("event_moderators")
                    .insert(moderatorRows);

                if (moderatorError) {
                    console.error("Failed to save event moderators:", moderatorError);
                    alert("Event created, but moderators could not be saved");
                    onSave?.();
                    return;
                }
            }

            await notifyTelegramForCreatedEvent(fromTable, forUsers, insertData);

            alert("Event created");
            onSave?.();

        }

    };

    return (

        <form className="form" onSubmit={handleCreate}>

            <h2 className="form-title">Create Event</h2>

            {type === "time" && (
                <div className="form-group-box">
                    <h4 className="form-section-title">Event Image</h4>

                    {eventImageUrl ? (
                        <img
                            src={eventImageUrl}
                            alt="Event"
                            style={{
                                width: "100%",
                                maxHeight: "220px",
                                objectFit: "cover",
                                borderRadius: "10px",
                                border: "1px solid #d9e2ec",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                minHeight: "120px",
                                borderRadius: "10px",
                                border: "1px dashed #cbd5e1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#64748b",
                                fontSize: "13px",
                            }}
                        >
                            No image selected
                        </div>
                    )}

                    <div className="moderator-actions-row" style={{ justifyContent: "space-between" }}>
                        <button
                            type="button"
                            className="form-submit"
                            onClick={handleUploadImageClick}
                            disabled={isUploadingImage || isDeletingImage}
                        >
                            {eventImageUrl ? "Replace Image" : "Upload Image"}
                        </button>

                        <button
                            type="button"
                            className="form-cancel"
                            onClick={handleDeleteImage}
                            disabled={!eventImageUrl || isUploadingImage || isDeletingImage}
                        >
                            Delete Image
                        </button>
                    </div>

                    {(isUploadingImage || isDeletingImage) && (
                        <div className="autocomplete-loading">
                            {isUploadingImage ? "Uploading image..." : "Deleting image..."}
                        </div>
                    )}

                    <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleImageFileChange}
                    />
                </div>
            )}

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

            {/* COURSE */}

            <div className="form-field">

                <label>Course</label>

                <select
                    className="form-select"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    disabled={!selectedOperation}
                >

                    <option value="">Select Course</option>

                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.name}
                        </option>
                    ))}

                </select>

            </div>

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

            <div className="form-group-box">
                <h4 className="form-section-title">Add Event Moderators</h4>

                <div className="form-field">
                    <label>Department</label>
                    <select
                        className="form-select"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                        <option value="">Select Department</option>
                        {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                                {department.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-field autocomplete-container">
                    <label>Teacher</label>
                    <input
                        className="form-input"
                        placeholder="Type teacher name"
                        value={teacherSearchQuery}
                        onChange={(e) => handleTeacherSearchChange(e.target.value)}
                        onFocus={() => setShowTeacherDropdown(Boolean(teacherSearchQuery.trim()))}
                        disabled={!selectedDepartment}
                        autoComplete="off"
                    />

                    {showTeacherDropdown && selectedDepartment && teacherSearchQuery.trim() && (
                        <div className="autocomplete-list">
                            {filteredTeachers.length === 0 ? (
                                <div className="autocomplete-item moderator-empty-item">No teachers found</div>
                            ) : (
                                filteredTeachers.map((teacher) => (
                                    <div
                                        key={teacher.id}
                                        className="autocomplete-item"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleTeacherOptionPick(teacher);
                                        }}
                                    >
                                        {getTeacherLabel(teacher)}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="moderator-actions-row">
                    <button
                        type="button"
                        className="form-submit"
                        onClick={addSelectedModerator}
                        disabled={!selectedTeacherToAdd}
                    >
                        Add
                    </button>
                </div>

                {selectedModerators.length > 0 && (
                    <ul className="moderator-list">
                        {selectedModerators.map((moderator) => (
                            <li key={moderator.id} className="moderator-item">
                                <span className="moderator-name">{moderator.label}</span>
                                <button
                                    type="button"
                                    className="moderator-remove-btn"
                                    onClick={() => removeSelectedModerator(moderator.id)}
                                    title="Remove moderator"
                                    aria-label={`Remove ${moderator.label}`}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
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