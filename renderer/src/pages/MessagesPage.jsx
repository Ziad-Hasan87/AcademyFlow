import { useEffect, useMemo, useState } from "react";
import { FiMessageCircle, FiRefreshCw, FiSearch, FiUsers } from "react-icons/fi";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import Modal from "../components/Modal";
import MesageConversation from "../components/MesageConversation";

function formatDateTime(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [conversationItems, setConversationItems] = useState([]);
  const [isConversationOpen, setIsConversationOpen] = useState(false);

  const userId = userData?.id;

  const loadConversations = async () => {
    if (!userId) {
      setConversationItems([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data: membershipRows, error: membershipError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (membershipError) throw membershipError;

      const conversationIds = Array.from(
        new Set((membershipRows || []).map((row) => row.conversation_id).filter(Boolean))
      );

      if (conversationIds.length === 0) {
        setConversationItems([]);
        setLoading(false);
        return;
      }

      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, name, type, updated_at")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      const { data: participantRows, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds);

      if (participantsError) throw participantsError;

      const participantUserIds = Array.from(
        new Set((participantRows || []).map((row) => row.user_id).filter(Boolean))
      );

      let usersById = new Map();
      if (participantUserIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", participantUserIds);

        if (usersError) throw usersError;
        usersById = new Map((users || []).map((user) => [user.id, user]));
      }

      const participantsByConversation = new Map();
      (participantRows || []).forEach((row) => {
        if (!participantsByConversation.has(row.conversation_id)) {
          participantsByConversation.set(row.conversation_id, []);
        }

        participantsByConversation.get(row.conversation_id).push(row.user_id);
      });

      const nextItems = (conversations || []).map((conversation) => {
        const participantIds = participantsByConversation.get(conversation.id) || [];
        const otherParticipantIds = participantIds.filter((id) => id !== userId);
        const otherParticipantNames = otherParticipantIds
          .map((id) => usersById.get(id)?.name)
          .filter(Boolean);

        const fallbackName = otherParticipantNames.length > 0
          ? otherParticipantNames.join(", ")
          : "Unnamed conversation";

        const displayName = conversation.type === "direct"
          ? (otherParticipantNames[0] || fallbackName)
          : (conversation.name || fallbackName);

        return {
          id: conversation.id,
          displayName,
          type: conversation.type || "direct",
          participantCount: participantIds.length,
          updatedAt: conversation.updated_at,
          searchText: `${displayName} ${otherParticipantNames.join(" ")}`.toLowerCase(),
        };
      });

      setConversationItems(nextItems);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setErrorMessage(error?.message || "Failed to load conversations.");
      setConversationItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [userId]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversationItems;

    return conversationItems.filter((item) => item.searchText.includes(normalized));
  }, [conversationItems, query]);

  useEffect(() => {
    if (filteredConversations.length === 0) {
      setSelectedConversationId("");
      return;
    }

    const hasSelected = filteredConversations.some((item) => item.id === selectedConversationId);
    if (!hasSelected) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId]);

  const openConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    setIsConversationOpen(true);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)",
      }}
    >
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.28)",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(8px)",
          display: "grid",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
            <FiMessageCircle size={16} />
            <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Messages</div>
          </div>

          <button
            type="button"
            onClick={loadConversations}
            title="Refresh conversations"
            style={{
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "8px",
              padding: "6px 8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiRefreshCw size={14} />
          </button>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            borderRadius: "10px",
            padding: "8px 10px",
            background: "#ffffff",
          }}
        >
          <FiSearch size={14} color="#64748b" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username"
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "0.86rem",
              background: "transparent",
              color: "#0f172a",
            }}
          />
        </label>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px" }}>
        {loading ? (
          <div style={{ color: "#64748b", fontSize: "0.9rem", padding: "8px" }}>Loading conversations...</div>
        ) : null}

        {!loading && errorMessage ? (
          <div
            style={{
              border: "1px solid rgba(239, 68, 68, 0.28)",
              borderRadius: "10px",
              padding: "10px",
              background: "rgba(254, 242, 242, 0.9)",
              color: "#b91c1c",
              fontSize: "0.86rem",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {!loading && !errorMessage && filteredConversations.length === 0 ? (
          <div
            style={{
              border: "1px dashed rgba(148, 163, 184, 0.48)",
              borderRadius: "10px",
              padding: "12px",
              background: "rgba(255,255,255,0.75)",
              color: "#64748b",
              fontSize: "0.86rem",
            }}
          >
            {conversationItems.length === 0
              ? "No conversations found for your account."
              : "No conversations match your search."}
          </div>
        ) : null}

        {!loading && !errorMessage && filteredConversations.length > 0 ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {filteredConversations.map((item) => {
              const isSelected = selectedConversationId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openConversation(item.id)}
                  style={{
                    border: isSelected
                      ? "1px solid rgba(14, 116, 144, 0.4)"
                      : "1px solid rgba(148, 163, 184, 0.24)",
                    background: isSelected
                      ? "linear-gradient(180deg, rgba(224,242,254,0.9) 0%, rgba(240,249,255,0.92) 100%)"
                      : "rgba(255,255,255,0.85)",
                    borderRadius: "10px",
                    padding: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "grid",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <div
                      style={{
                        color: "#0f172a",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.displayName}
                    >
                      {item.displayName}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatDateTime(item.updatedAt)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.75rem" }}>
                    <FiUsers size={12} />
                    <span>
                      {item.type === "direct" ? "Direct" : "Group"} • {item.participantCount} participants
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={isConversationOpen && Boolean(selectedConversationId)}
        onClose={() => setIsConversationOpen(false)}
        title="Conversation"
        contentClassName="profile-modal-content"
        bodyClassName="profile-modal-body"
      >
        <MesageConversation
          conversationId={selectedConversationId}
          onMessageSent={loadConversations}
        />
      </Modal>
    </div>
  );
}
