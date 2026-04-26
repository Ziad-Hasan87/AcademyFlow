import { useEffect, useMemo, useRef, useState } from "react";
import { FiPaperclip, FiSend, FiX } from "react-icons/fi";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";

function formatMessageTime(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sanitizeFileName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "_");
}

export default function MesageConversation({
  conversationId = null,
  targetUserId = null,
  onConversationReady,
  onMessageSent,
}) {
  const { userData } = useAuth();
  const [resolvedConversationId, setResolvedConversationId] = useState(conversationId || null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [participantNameMap, setParticipantNameMap] = useState(new Map());
  const fileInputRef = useRef(null);

  const currentUserId = userData?.id || null;

  useEffect(() => {
    setResolvedConversationId(conversationId || null);
  }, [conversationId]);

  const loadMessages = async () => {
    if (!resolvedConversationId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setErrorMessage("");

    try {
      const { data: messageRows, error: messageError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          message_type,
          attachment_id,
          attachments:attachments!messages_attachment_id_fkey(
            id,
            file_name,
            file_path
          )
        `)
        .eq("conversation_id", resolvedConversationId)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      const senderIds = Array.from(new Set((messageRows || []).map((row) => row.sender_id).filter(Boolean)));
      let nextNameMap = new Map();

      if (senderIds.length > 0) {
        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", senderIds);

        if (userError) throw userError;

        nextNameMap = new Map((userRows || []).map((row) => [row.id, row.name || "Unknown"]));
      }

      setParticipantNameMap(nextNameMap);
      setMessages(Array.isArray(messageRows) ? messageRows : []);
    } catch (error) {
      console.error("Error loading conversation messages:", error);
      setErrorMessage(error?.message || "Failed to load messages.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [resolvedConversationId]);

  useEffect(() => {
    if (!resolvedConversationId) return undefined;

    const channel = supabase
      .channel(`messages-channel-${resolvedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${resolvedConversationId}`,
        },
        async (payload) => {
          const newMessage = payload?.new;
          if (!newMessage?.id) return;

          setMessages((prev) => {
            const alreadyExists = prev.some((message) => message.id === newMessage.id);
            if (alreadyExists) return prev;

            return [
              ...prev,
              {
                ...newMessage,
                attachments: null,
              },
            ];
          });

          if (newMessage.sender_id) {
            setParticipantNameMap((prev) => {
              if (prev.has(newMessage.sender_id)) return prev;

              const next = new Map(prev);
              next.set(newMessage.sender_id, "Unknown");
              return next;
            });

            const { data: senderRow, error: senderError } = await supabase
              .from("users")
              .select("id, name")
              .eq("id", newMessage.sender_id)
              .maybeSingle();

            if (!senderError && senderRow?.id) {
              setParticipantNameMap((prev) => {
                const next = new Map(prev);
                next.set(senderRow.id, senderRow.name || "Unknown");
                return next;
              });
            }
          }

          if (newMessage.attachment_id) {
            const { data: attachmentRow, error: attachmentError } = await supabase
              .from("attachments")
              .select("id, file_name, file_path")
              .eq("id", newMessage.attachment_id)
              .maybeSingle();

            if (!attachmentError && attachmentRow?.id) {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === newMessage.id
                    ? { ...message, attachments: attachmentRow }
                    : message
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedConversationId]);

  const conversationTitle = useMemo(() => {
    if (!resolvedConversationId && targetUserId) return "New conversation";
    return "Conversation";
  }, [resolvedConversationId, targetUserId]);

  const conversationInitial = useMemo(() => {
    const trimmed = String(conversationTitle || "C").trim();
    return trimmed.charAt(0).toUpperCase() || "C";
  }, [conversationTitle]);

  const handleChooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    event.target.value = "";
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const getExistingDirectConversation = async (firstUserId, secondUserId) => {
    const { data: firstMembershipRows, error: firstMembershipError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", firstUserId);

    if (firstMembershipError) throw firstMembershipError;

    const firstConversationIds = Array.from(
      new Set((firstMembershipRows || []).map((row) => row.conversation_id).filter(Boolean))
    );

    if (firstConversationIds.length === 0) return null;

    const { data: secondMembershipRows, error: secondMembershipError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", secondUserId)
      .in("conversation_id", firstConversationIds);

    if (secondMembershipError) throw secondMembershipError;

    const sharedConversationIds = Array.from(
      new Set((secondMembershipRows || []).map((row) => row.conversation_id).filter(Boolean))
    );

    if (sharedConversationIds.length === 0) return null;

    const { data: directConversationRows, error: directConversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", "direct")
      .in("id", sharedConversationIds)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (directConversationError) throw directConversationError;

    return directConversationRows?.[0]?.id || null;
  };

  const ensureConversation = async () => {
    if (resolvedConversationId) return resolvedConversationId;

    if (!currentUserId || !targetUserId) {
      throw new Error("Conversation target is missing.");
    }

    const existingConversationId = await getExistingDirectConversation(currentUserId, targetUserId);
    if (existingConversationId) {
      setResolvedConversationId(existingConversationId);
      onConversationReady?.(existingConversationId);
      return existingConversationId;
    }

    const { data: conversationRow, error: createConversationError } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        institute_id: userData?.institute_id || null,
      })
      .select("id")
      .single();

    if (createConversationError) throw createConversationError;

    const createdConversationId = conversationRow?.id;
    if (!createdConversationId) {
      throw new Error("Conversation creation failed.");
    }

    const { error: participantError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: createdConversationId, user_id: currentUserId },
        { conversation_id: createdConversationId, user_id: targetUserId },
      ]);

    if (participantError) throw participantError;

    setResolvedConversationId(createdConversationId);
    onConversationReady?.(createdConversationId);
    return createdConversationId;
  };

  const sendMessage = async () => {
    const trimmed = draft.trim();

    if (!trimmed && !selectedFile) {
      alert("Type a message or attach a file.");
      return;
    }

    if (!currentUserId) {
      alert("You must be logged in to send a message.");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");

      const activeConversationId = await ensureConversation();

      let attachmentId = null;
      if (selectedFile) {
        const safeName = sanitizeFileName(selectedFile.name);
        const storagePath = `conversations/${activeConversationId}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase
          .storage
          .from("attachments")
          .upload(storagePath, selectedFile, { upsert: false });

        if (uploadError) {
          throw new Error(uploadError.message || "Failed to upload attachment.");
        }

        const { data: attachmentRow, error: attachmentError } = await supabase
          .from("attachments")
          .insert({
            event_id: null,
            course_id: null,
            operation_id: null,
            institute_id: userData?.institute_id || null,
            uploaded_by: currentUserId,
            file_path: storagePath,
            file_name: selectedFile.name,
            available_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (attachmentError) {
          await supabase.storage.from("attachments").remove([storagePath]);
          throw new Error(attachmentError.message || "Failed to save attachment details.");
        }

        attachmentId = attachmentRow?.id || null;
      }

      const { error: messageInsertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          sender_id: currentUserId,
          content: trimmed || null,
          message_type: selectedFile ? (trimmed ? "text" : "file") : "text",
          attachment_id: attachmentId,
        });

      if (messageInsertError) throw messageInsertError;

      const { error: conversationUpdateError } = await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);

      if (conversationUpdateError) {
        console.warn("Failed to update conversation timestamp:", conversationUpdateError);
      }

      setDraft("");
      setSelectedFile(null);
      await loadMessages();
      await Promise.resolve(onMessageSent?.());
    } catch (error) {
      console.error("Error sending message:", error);
      alert(error?.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const downloadAttachment = async (attachment) => {
    const path = attachment?.file_path;
    if (!path) return;

    const { data, error } = await supabase.storage.from("attachments").download(path);
    if (error || !data) {
      alert("Failed to download attachment.");
      return;
    }

    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.file_name || "attachment";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const hasPendingContent = Boolean(draft.trim() || selectedFile);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "520px",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: "14px",
        background: "#f4f7fb",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
          padding: "12px 14px",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "999px",
            background: "linear-gradient(140deg, #60a5fa 0%, #2563eb 100%)",
            color: "#eff6ff",
            fontWeight: 800,
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {conversationInitial}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.96rem", fontWeight: 700, color: "#0f172a" }}>{conversationTitle}</div>
          <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
            {resolvedConversationId ? "Messages refresh every 5s" : "Conversation starts when you send"}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: "300px",
          maxHeight: "520px",
          overflowY: "auto",
          padding: "14px",
          background: "#edf3fb",
          display: "grid",
          gap: "10px",
        }}
      >
        {loadingMessages ? (
          <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading messages...</div>
        ) : null}

        {!loadingMessages && errorMessage ? (
          <div style={{ color: "#b91c1c", fontSize: "0.88rem" }}>{errorMessage}</div>
        ) : null}

        {!loadingMessages && !errorMessage && messages.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
            {resolvedConversationId
              ? "No messages yet. Start the conversation below."
              : "Send your first message to start this conversation."}
          </div>
        ) : null}

        {!loadingMessages && !errorMessage && messages.map((message) => {
          const isOwn = String(message.sender_id) === String(currentUserId);
          const senderName = participantNameMap.get(message.sender_id) || "Unknown";

          return (
            <div
              key={message.id}
              style={{
                justifySelf: isOwn ? "end" : "start",
                maxWidth: "82%",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                background: isOwn
                  ? "linear-gradient(180deg, rgba(217, 236, 255, 0.98) 0%, rgba(237, 247, 255, 0.98) 100%)"
                  : "#ffffff",
                padding: "10px 11px",
                display: "grid",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>{senderName}</span>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{formatMessageTime(message.created_at)}</span>
              </div>

              {message.content ? (
                <div style={{ color: "#0f172a", fontSize: "0.88rem", whiteSpace: "pre-wrap" }}>
                  {message.content}
                </div>
              ) : null}

              {message.attachments?.file_path ? (
                <button
                  type="button"
                  onClick={() => downloadAttachment(message.attachments)}
                  style={{
                    justifySelf: "start",
                    border: "1px solid rgba(30, 64, 175, 0.3)",
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#1e3a8a",
                    borderRadius: "8px",
                    padding: "6px 9px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {message.attachments.file_name || "Attachment"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedFile ? (
        <div
          style={{
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
            borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
            padding: "8px 12px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.84rem",
              color: "#0f172a",
            }}
            title={selectedFile.name}
          >
            {selectedFile.name}
          </div>
          <button
            type="button"
            onClick={removeSelectedFile}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.36)",
              background: "#ffffff",
              borderRadius: "6px",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Remove file"
            title="Remove file"
          >
            <FiX size={14} />
          </button>
        </div>
      ) : null}

      <div style={{ padding: "12px", background: "#ffffff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "8px",
            alignItems: "end",
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "#f8fafc",
              borderRadius: "12px",
              height: "42px",
              width: "42px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
            }}
            title="Attach one file"
          >
            <FiPaperclip size={16} />
          </button>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message..."
          rows={2}
          style={{
            resize: "none",
            border: "1px solid rgba(148, 163, 184, 0.34)",
            borderRadius: "12px",
            padding: "10px 12px",
            fontSize: "0.88rem",
            outline: "none",
            minHeight: "42px",
            maxHeight: "110px",
            background: "#f8fafc",
          }}
        />

        <button
          type="button"
          onClick={sendMessage}
          disabled={isSending || !hasPendingContent}
          style={{
            border: "1px solid rgba(14, 116, 144, 0.35)",
            background: hasPendingContent
              ? "linear-gradient(130deg, #0ea5e9 0%, #0284c7 100%)"
              : "#e2e8f0",
            borderRadius: "12px",
            height: "42px",
            minWidth: "84px",
            padding: "0 12px",
            cursor: isSending || !hasPendingContent ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: hasPendingContent ? "#f0f9ff" : "#64748b",
            fontWeight: 700,
            opacity: isSending || !hasPendingContent ? 0.75 : 1,
            gap: "6px",
          }}
        >
          <FiSend size={14} />
          {isSending ? "Sending" : "Send"}
        </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleChooseFile}
      />
    </div>
  );
}
