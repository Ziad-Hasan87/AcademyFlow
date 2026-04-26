import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission } from "../utils/types";
import supabase from "../utils/supabase";
import { resolveEventTargetLabel } from "../utils/fetch";
import Modal from "./Modal";
import EditEvent from "./EditEvent";
import ProfilePage from "../pages/ProfilePage";

function formatDateLabel(value) {
  if (!value) return "N/A";

  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTimeLabel(value) {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeLabel(value) {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventTypeLabel(event) {
  const normalizedType = String(event?.type ?? event?.event_type ?? "")
    .trim()
    .toLowerCase();

  if (normalizedType === "time") return "Time event";
  if (normalizedType === "slot") return "Slot event";
  return normalizedType ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1) : "Event";
}

function getEventScheduleLabel(event, slotMap) {
  if (!event) return "N/A";

  if (event.type === "time" || event.start_at || event.end_at) {
    const start = formatTimeLabel(event.start_at || event.start_time);
    const end = formatTimeLabel(event.end_at || event.end_time);

    if (start !== "N/A" && end !== "N/A") return `${start} - ${end}`;
    if (start !== "N/A") return start;
    if (end !== "N/A") return end;
  }

  const startSlot = event.start_slot ? slotMap.get(event.start_slot) : null;
  const endSlot = event.end_slot ? slotMap.get(event.end_slot) : null;

  if (startSlot || endSlot) {
    const startLabel = startSlot?.name || event.start_slot || "N/A";
    const endLabel = endSlot?.name || event.end_slot || "N/A";
    const startTime = startSlot ? `${formatTimeLabel(startSlot.start)} - ${formatTimeLabel(startSlot.end)}` : "";
    const endTime = endSlot ? `${formatTimeLabel(endSlot.start)} - ${formatTimeLabel(endSlot.end)}` : "";

    if (startLabel === endLabel) {
      return startTime ? `${startLabel} (${startTime})` : startLabel;
    }

    return [
      `${startLabel}${startTime ? ` (${startTime})` : ""}`,
      `${endLabel}${endTime ? ` (${endTime})` : ""}`,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  return "N/A";
}

function getAvatarLabel(profile) {
  const label = String(profile?.name || profile?.codename || "?").trim();
  return label.charAt(0).toUpperCase() || "?";
}

export default function ViewEvent({ event, onClose, onUpdated }) {
  const { userData } = useAuth();
  const [currentEvent, setCurrentEvent] = useState(event || null);
  const [moderators, setModerators] = useState([]);
  const [isLoadingModerators, setIsLoadingModerators] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [studentSubmission, setStudentSubmission] = useState(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
  const [isUploadingSubmission, setIsUploadingSubmission] = useState(false);
  const [audienceLabel, setAudienceLabel] = useState("N/A");
  const [slotDetails, setSlotDetails] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedModeratorId, setSelectedModeratorId] = useState(null);
  const [isModeratorProfileOpen, setIsModeratorProfileOpen] = useState(false);
  const submissionInputRef = useRef(null);

  const slotMap = useMemo(() => new Map(slotDetails.map((slot) => [slot.id, slot])), [slotDetails]);
  const isObsolete = Boolean(currentEvent?.isobsolete);
  const canEditEvent = Boolean(
    hasPermission(userData?.role, "Moderator") ||
      moderators.some((moderator) => String(moderator.id) === String(userData?.id))
  );

  useEffect(() => {
    setCurrentEvent(event || null);
  }, [event]);

  const refreshCurrentEvent = async () => {
    const eventId = currentEvent?.id || event?.id;
    if (!eventId) return;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("Error refreshing event details:", error);
      return;
    }

    setCurrentEvent(data || null);
  };

  const fetchUserProfile = async (userId) => {
    if (!userId) return null;

    const { data, error } = await supabase.rpc("get_user_profile", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching moderator profile:", error);
      return null;
    }

    const profile = Array.isArray(data) ? data[0] : data;
    return profile ? { ...profile, id: userId } : null;
  };

  useEffect(() => {
    let isActive = true;

    const loadViewData = async () => {
      if (!currentEvent?.id) {
        setModerators([]);
        setAttachments([]);
        setStudentSubmission(null);
        setAudienceLabel("N/A");
        setSlotDetails([]);
        return;
      }

      setIsLoadingModerators(true);
      setIsLoadingAttachments(true);
      setIsLoadingSubmission(true);

      try {
        const targetLabel = await resolveEventTargetLabel(currentEvent.from_table, currentEvent.for_users);

        const slotIds = [currentEvent.start_slot, currentEvent.end_slot].filter(Boolean);
        let nextSlotDetails = [];

        if (slotIds.length > 0) {
          const { data: slotRows, error: slotError } = await supabase
            .from("slotinfo")
            .select("id, name, start, end")
            .in("id", slotIds);

          if (slotError) {
            console.error("Error fetching event slot details:", slotError);
          } else {
            nextSlotDetails = Array.isArray(slotRows) ? slotRows : [];
          }
        }

        const { data: moderatorRows, error: moderatorRowsError } = await supabase
          .from("event_moderators")
          .select("user_id")
          .eq("event_id", currentEvent.id);

        if (moderatorRowsError) {
          console.error("Error fetching event moderators:", moderatorRowsError);
          if (isActive) {
            setModerators([]);
            setAudienceLabel(targetLabel || "N/A");
            setSlotDetails(nextSlotDetails);
          }
          return;
        }

        const moderatorIds = Array.from(
          new Set((moderatorRows || []).map((row) => row.user_id).filter(Boolean))
        );

        const loadedModerators = await Promise.all(moderatorIds.map((userId) => fetchUserProfile(userId)));

        const { data: attachmentRows, error: attachmentError } = await supabase
          .from("attachments")
          .select("id, file_name, file_path")
          .eq("event_id", currentEvent.id);

        if (attachmentError) {
          console.error("Error fetching event attachments:", attachmentError);
        }

        let submissionRow = null;
        const canLoadSubmission =
          userData?.role === "Student" &&
          Boolean(userData?.id) &&
          Boolean(currentEvent.has_submissions);

        if (canLoadSubmission) {
          const { data: submissionData, error: submissionError } = await supabase
            .from("submissions")
            .select("id, file_name, file_path, submitted_at, deadline, status")
            .eq("event_id", currentEvent.id)
            .eq("user_id", userData.id)
            .maybeSingle();

          if (submissionError) {
            console.error("Error fetching student submission:", submissionError);
          } else {
            submissionRow = submissionData || null;
          }
        }

        if (!isActive) return;

        setModerators(loadedModerators.filter(Boolean));
        setAttachments(Array.isArray(attachmentRows) ? attachmentRows : []);
        setStudentSubmission(submissionRow);
        setAudienceLabel(targetLabel || "N/A");
        setSlotDetails(nextSlotDetails);
      } catch (error) {
        console.error("Error loading event details:", error);
        if (isActive) {
          setModerators([]);
          setAttachments([]);
          setStudentSubmission(null);
          setAudienceLabel("N/A");
          setSlotDetails([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingModerators(false);
          setIsLoadingAttachments(false);
          setIsLoadingSubmission(false);
        }
      }
    };

    loadViewData();

    return () => {
      isActive = false;
    };
  }, [currentEvent?.id, currentEvent?.from_table, currentEvent?.for_users, currentEvent?.start_slot, currentEvent?.end_slot, currentEvent?.has_submissions, userData?.id, userData?.role]);

  if (!currentEvent) return null;

  const scheduleLabel = getEventScheduleLabel(currentEvent, slotMap);
  const eventTypeLabel = getEventTypeLabel(currentEvent);
  const isStudent = userData?.role === "Student";
  const submissionDeadlineValue = currentEvent.expire_at || studentSubmission?.deadline || null;
  const parsedSubmissionDeadline = submissionDeadlineValue ? new Date(submissionDeadlineValue) : null;
  const hasValidSubmissionDeadline =
    parsedSubmissionDeadline && !Number.isNaN(parsedSubmissionDeadline.getTime());
  const isPastSubmissionDeadline = hasValidSubmissionDeadline
    ? Date.now() > parsedSubmissionDeadline.getTime()
    : false;
  const lateAllowed = Boolean(currentEvent.late_allowed);
  const canUseSubmission = isStudent && Boolean(currentEvent.has_submissions);
  const canUploadSubmission =
    canUseSubmission && (!isPastSubmissionDeadline || lateAllowed);
  const submissionDeadlineLabel = hasValidSubmissionDeadline
    ? formatDateTimeLabel(parsedSubmissionDeadline.toISOString())
    : "N/A";

  const submissionStateLabel = (() => {
    if (!canUseSubmission) return "Submissions disabled";

    if (studentSubmission) {
      return studentSubmission.status || (isPastSubmissionDeadline ? "Late" : "Timely");
    }

    if (!hasValidSubmissionDeadline) return "Due";
    if (isPastSubmissionDeadline) {
      return lateAllowed ? "Late" : "Late Submissions Not Allowed";
    }

    return "Due";
  })();

  const openModeratorProfile = (moderatorId) => {
    if (!moderatorId) return;
    setSelectedModeratorId(moderatorId);
    setIsModeratorProfileOpen(true);
  };

  const closeModeratorProfile = () => {
    setIsModeratorProfileOpen(false);
    setSelectedModeratorId(null);
  };

  const getAttachmentLabel = (attachment) =>
    attachment?.file_name || attachment?.file_path?.split("/").pop() || "Attachment";

  const getSubmissionLabel = (submission) =>
    submission?.file_name || submission?.file_path?.split("/").pop() || "Submission";

  const sanitizeFileName = (name) =>
    String(name || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]/g, "_");

  const getStorageBlob = async (bucket, filePath) => {
    const { data, error } = await supabase.storage.from(bucket).download(filePath);

    if (error) {
      console.error("Error fetching file:", error);
      alert("Failed to open file.");
      return null;
    }

    return data;
  };

  const getAttachmentBlob = async (filePath) => getStorageBlob("attachments", filePath);
  const getSubmissionBlob = async (filePath) => getStorageBlob("submissions", filePath);

  const viewAttachment = async (attachment) => {
    if (!attachment?.file_path) return;

    const blob = await getAttachmentBlob(attachment.file_path);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank", "noopener,noreferrer");

    if (!popup) {
      const fallback = document.createElement("a");
      fallback.href = url;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.click();
    }

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadAttachment = async (attachment) => {
    if (!attachment?.file_path) return;

    const blob = await getAttachmentBlob(attachment.file_path);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const fileLabel = getAttachmentLabel(attachment);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileLabel;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const viewSubmission = async () => {
    if (!studentSubmission?.file_path) return;

    const blob = await getSubmissionBlob(studentSubmission.file_path);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank", "noopener,noreferrer");

    if (!popup) {
      const fallback = document.createElement("a");
      fallback.href = url;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.click();
    }

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadSubmission = async () => {
    if (!studentSubmission?.file_path) return;

    const blob = await getSubmissionBlob(studentSubmission.file_path);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const fileLabel = getSubmissionLabel(studentSubmission);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileLabel;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const uploadSubmission = async (file) => {
    if (!canUseSubmission || !userData?.id || !currentEvent?.id) return;

    if (!canUploadSubmission) {
      alert("Late submissions are not allowed for this event.");
      return;
    }

    try {
      setIsUploadingSubmission(true);

      const safeName = sanitizeFileName(file.name);
      const storagePath = `event/${currentEvent.id}/${userData.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase
        .storage
        .from("submissions")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message || "Submission upload failed.");
      }

      if (studentSubmission?.file_path) {
        await supabase.storage.from("submissions").remove([studentSubmission.file_path]);
      }

      const nowIso = new Date().toISOString();
      const deadlineIso = hasValidSubmissionDeadline ? parsedSubmissionDeadline.toISOString() : null;
      const status = deadlineIso && new Date(nowIso).getTime() > new Date(deadlineIso).getTime()
        ? "Late"
        : "Timely";

      const { data: upsertedSubmission, error: upsertError } = await supabase
        .from("submissions")
        .upsert(
          {
            event_id: currentEvent.id,
            user_id: userData.id,
            institute_id: currentEvent.institute_id || userData?.institute_id || null,
            file_path: storagePath,
            file_name: file.name,
            deadline: deadlineIso,
            status,
            submitted_at: nowIso,
          },
          { onConflict: "event_id,user_id" }
        )
        .select("id, file_name, file_path, submitted_at, deadline, status")
        .single();

      if (upsertError) {
        await supabase.storage.from("submissions").remove([storagePath]);
        throw new Error(upsertError.message || "Failed to save submission record.");
      }

      setStudentSubmission(upsertedSubmission || null);
      alert("Submission uploaded successfully.");
    } catch (error) {
      console.error("Error uploading submission:", error);
      alert(error?.message || "Submission upload failed.");
    } finally {
      setIsUploadingSubmission(false);
    }
  };

  const handleSubmissionFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;
    await uploadSubmission(file);
  };

  return (
    <div
      className="explorer-theme-modal-shell"
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      <div
        style={{
          borderRadius: "16px",
          padding: "18px",
          background: isObsolete
            ? "linear-gradient(135deg, rgba(148, 163, 184, 0.94) 0%, rgba(100, 116, 139, 0.95) 100%)"
            : "linear-gradient(135deg, #052e2b 0%, #0f766e 52%, #0b4a6f 100%)",
          color: "#f8fafc",
          boxShadow: "0 16px 28px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.85 }}>
              Event Details
            </div>
            <h3 style={{ margin: "8px 0 4px", fontSize: "1.55rem", lineHeight: 1.15 }}>
              {currentEvent.title || "Untitled Event"}
            </h3>
            <div style={{ fontSize: "0.92rem", opacity: 0.92 }}>
              {formatDateLabel(currentEvent.date)}
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "rgba(248, 250, 252, 0.14)",
                border: "1px solid rgba(248, 250, 252, 0.24)",
                fontSize: "0.82rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {isObsolete ? "Obsolete" : eventTypeLabel}
            </div>

            {canEditEvent && (
              <button
                type="button"
                className="form-submit"
                onClick={() => setIsEditOpen(true)}
                style={{
                  minWidth: "110px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  background: "rgba(248, 250, 252, 0.18)",
                  border: "1px solid rgba(248, 250, 252, 0.28)",
                  color: "#f8fafc",
                  boxShadow: "none",
                }}
              >
                Edit Event
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ padding: "7px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "0.82rem" }}>
            {scheduleLabel}
          </span>
          <span style={{ padding: "7px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "0.82rem" }}>
            Audience: {audienceLabel}
          </span>
          {currentEvent.has_attachments ? (
            <span style={{ padding: "7px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "0.82rem" }}>
              Attachments enabled
            </span>
          ) : null}
          <span style={{ padding: "7px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "0.82rem" }}>
            {currentEvent.is_reschedulable ? "Reschedulable" : "Locked"}
          </span>
        </div>
      </div>

      {currentEvent.image_path ? (
        <div
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background: "#e2e8f0",
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
          }}
        >
          <img
            src={currentEvent.image_path}
            alt={currentEvent.title || "Event"}
            style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }}
          />
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
        }}
      >
        <section
          style={{
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            background: "rgba(255, 255, 255, 0.85)",
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h4 style={{ margin: "0 0 12px", fontSize: "1rem", color: "#0f172a" }}>Event Info</h4>

          <div style={{ display: "grid", gap: "10px" }}>
            <InfoRow label="Date" value={formatDateLabel(currentEvent.date)} />
            <InfoRow label="Time / Slot" value={scheduleLabel} />
            <InfoRow label="Type" value={eventTypeLabel} />
            <InfoRow label="From" value={String(currentEvent.from_table || "N/A").toUpperCase()} />
            <InfoRow label="Audience" value={audienceLabel} />
            <InfoRow label="Submissions" value={currentEvent.has_submissions ? "Enabled" : "Disabled"} />
            <InfoRow label="Submission deadline" value={submissionDeadlineLabel} />
            <InfoRow label="Late submission" value={currentEvent.has_submissions ? (lateAllowed ? "Allowed" : "Not allowed") : "N/A"} />
            <InfoRow label="Created" value={formatDateTimeLabel(currentEvent.created_at)} />
            <InfoRow label="Updated" value={formatDateTimeLabel(currentEvent.updated_at)} />
          </div>

          <div style={{ marginTop: "14px" }}>
            <h5 style={{ margin: "0 0 8px", fontSize: "0.92rem", color: "#0f172a" }}>Description</h5>
            <div
              style={{
                borderRadius: "12px",
                padding: "12px 14px",
                background: "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.98) 100%)",
                border: "1px solid rgba(148, 163, 184, 0.24)",
                color: "#334155",
                minHeight: "72px",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
              }}
            >
              {currentEvent.description || "No description provided."}
            </div>
          </div>
        </section>

        <section
          style={{
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            background: "rgba(255, 255, 255, 0.85)",
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h4 style={{ margin: "0 0 6px", fontSize: "1rem", color: "#0f172a" }}>Event Moderators</h4>
          <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "0.88rem" }}>
            People responsible for the event are listed below.
          </p>

          {isLoadingModerators ? (
            <div style={{ color: "#64748b", fontSize: "0.92rem" }}>Loading moderator details...</div>
          ) : moderators.length === 0 ? (
            <div
              style={{
                borderRadius: "12px",
                border: "1px dashed rgba(148, 163, 184, 0.45)",
                padding: "14px",
                color: "#64748b",
                background: "rgba(248, 250, 252, 0.86)",
              }}
            >
              No event moderators found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {moderators.map((moderator) => (
                <button
                  type="button"
                  key={moderator.id}
                  onClick={() => openModeratorProfile(moderator.id)}
                  aria-label={`View profile of ${moderator.name || "moderator"}`}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    borderRadius: "14px",
                    padding: "12px",
                    border: "1px solid rgba(148, 163, 184, 0.24)",
                    background: "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "14px",
                      flexShrink: 0,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #0f766e 0%, #0b4a6f 100%)",
                      color: "#f8fafc",
                      fontWeight: 800,
                      fontSize: "1rem",
                      boxShadow: "0 8px 14px rgba(15, 23, 42, 0.14)",
                    }}
                  >
                    {moderator.image_path ? (
                      <img
                        src={moderator.image_path}
                        alt={moderator.name || "Moderator"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      getAvatarLabel(moderator)
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <h5 style={{ margin: 0, fontSize: "0.98rem", color: "#0f172a" }}>
                        {moderator.name || "Unknown moderator"}
                      </h5>
                      {moderator.codename ? (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "999px",
                            background: "rgba(15, 118, 110, 0.12)",
                            color: "#0f766e",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {moderator.codename}
                        </span>
                      ) : null}
                    </div>

                    <div style={{ marginTop: "6px", display: "grid", gap: "4px", color: "#475569", fontSize: "0.84rem" }}>
                      <div>{moderator.role || "Role not set"}</div>
                      <div>{moderator.department_name || "Department not set"}</div>
                      <div>{moderator.program_name || "Program not set"}</div>
                      <div>{moderator.group_name || "Group not set"}</div>
                      <div>{moderator.subgroup_name || "Subgroup not set"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section
        style={{
          borderRadius: "16px",
          padding: "16px",
          border: "1px solid rgba(148, 163, 184, 0.3)",
          background: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h4 style={{ margin: "0 0 6px", fontSize: "1rem", color: "#0f172a" }}>Attachments</h4>
        <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "0.88rem" }}>
          Attachments are read-only here. You can view or download files.
        </p>

        {isLoadingAttachments ? (
          <div style={{ color: "#64748b", fontSize: "0.92rem" }}>Loading attachments...</div>
        ) : attachments.length === 0 ? (
          <div
            style={{
              borderRadius: "12px",
              border: "1px dashed rgba(148, 163, 184, 0.45)",
              padding: "14px",
              color: "#64748b",
              background: "rgba(248, 250, 252, 0.86)",
            }}
          >
            {currentEvent.has_attachments ? "No files uploaded yet." : "Attachments are disabled for this event."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {attachments.map((attachment) => {
              const fileLabel = getAttachmentLabel(attachment);

              return (
                <div
                  key={attachment.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    border: "1px solid rgba(148, 163, 184, 0.24)",
                    background: "rgba(248, 250, 252, 0.92)",
                  }}
                >
                  <div
                    title={fileLabel}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#0f172a",
                      fontSize: "0.9rem",
                    }}
                  >
                    {fileLabel}
                  </div>

                  <button
                    type="button"
                    onClick={() => viewAttachment(attachment)}
                    style={{
                      border: "1px solid rgba(14, 116, 144, 0.3)",
                      background: "rgba(14, 116, 144, 0.1)",
                      color: "#0f4c5c",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                    }}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadAttachment(attachment)}
                    style={{
                      border: "1px solid rgba(30, 64, 175, 0.35)",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#1e3a8a",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                    }}
                  >
                    Download
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {canUseSubmission ? (
        <section
          style={{
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            background: "rgba(255, 255, 255, 0.85)",
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h4 style={{ margin: "0 0 6px", fontSize: "1rem", color: "#0f172a" }}>Submission</h4>
          <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "0.88rem" }}>
            {hasValidSubmissionDeadline
              ? `Deadline: ${formatDateTimeLabel(parsedSubmissionDeadline.toISOString())}`
              : "No deadline configured."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            <span
              style={{
                padding: "7px 10px",
                borderRadius: "999px",
                background: "rgba(14, 116, 144, 0.12)",
                color: "#0f4c5c",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              Status: {submissionStateLabel}
            </span>
          </div>

          {isLoadingSubmission ? (
            <div style={{ color: "#64748b", fontSize: "0.92rem" }}>Loading submission details...</div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {studentSubmission ? (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    border: "1px solid rgba(148, 163, 184, 0.24)",
                    background: "rgba(248, 250, 252, 0.92)",
                  }}
                >
                  <div
                    title={getSubmissionLabel(studentSubmission)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#0f172a",
                      fontSize: "0.9rem",
                    }}
                  >
                    {getSubmissionLabel(studentSubmission)}
                  </div>

                  <button
                    type="button"
                    onClick={viewSubmission}
                    style={{
                      border: "1px solid rgba(14, 116, 144, 0.3)",
                      background: "rgba(14, 116, 144, 0.1)",
                      color: "#0f4c5c",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                    }}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={downloadSubmission}
                    style={{
                      border: "1px solid rgba(30, 64, 175, 0.35)",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#1e3a8a",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                    }}
                  >
                    Download
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: "12px",
                    border: "1px dashed rgba(148, 163, 184, 0.45)",
                    padding: "14px",
                    color: "#64748b",
                    background: "rgba(248, 250, 252, 0.86)",
                  }}
                >
                  No submission uploaded yet.
                </div>
              )}

              {!canUploadSubmission ? (
                <div style={{ color: "#b45309", fontSize: "0.86rem", fontWeight: 600 }}>
                  Late submissions are not allowed for this event.
                </div>
              ) : null}

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-start" }}>
                <button
                  type="button"
                  onClick={() => submissionInputRef.current?.click()}
                  disabled={isUploadingSubmission || !canUploadSubmission}
                  style={{
                    border: "1px solid rgba(14, 116, 144, 0.35)",
                    background: "rgba(14, 116, 144, 0.12)",
                    color: "#0f4c5c",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    cursor: isUploadingSubmission || !canUploadSubmission ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    opacity: isUploadingSubmission || !canUploadSubmission ? 0.65 : 1,
                  }}
                >
                  {isUploadingSubmission
                    ? "Uploading..."
                    : studentSubmission
                      ? "Reupload Submission"
                      : "Upload Submission"}
                </button>
              </div>

              <input
                ref={submissionInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleSubmissionFileChange}
              />
            </div>
          )}
        </section>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
        <button
          type="button"
          className="form-cancel"
          onClick={onClose}
          style={{ minWidth: "110px" }}
        >
          Close
        </button>
      </div>

      <Modal
        isOpen={isEditOpen}
        title="Edit Event"
        onClose={() => setIsEditOpen(false)}
        contentClassName="explorer-theme-modal-content"
        bodyClassName="explorer-theme-modal-body"
      >
        <EditEvent
          event={currentEvent}
          onSave={async () => {
            setIsEditOpen(false);
            await refreshCurrentEvent();
            onUpdated?.();
          }}
        />
      </Modal>

      <Modal
        isOpen={isModeratorProfileOpen}
        onClose={closeModeratorProfile}
        title="Moderator Profile"
        contentClassName="profile-modal-content"
        bodyClassName="profile-modal-body"
      >
        {selectedModeratorId ? <ProfilePage userId={selectedModeratorId} /> : null}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(248, 250, 252, 0.9)",
      }}
    >
      <span style={{ color: "#64748b", fontSize: "0.84rem", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#0f172a", fontSize: "0.86rem", textAlign: "right", fontWeight: 600 }}>{value || "N/A"}</span>
    </div>
  );
}