import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { sendChatMessage } from "../utils/chatbot";
import supabase from "../utils/supabase";
import { fetchBotId, fetchProgramChatId } from "../utils/fetch";
import { sendTelegramNotification } from "../utils/telegramNotifications";

const QUICK_PROMPTS = [
  "When is my next class?",
  "When is my next vacation?",
  "Show CSE 3220 schedule for Group B",
  "Give me routine summary",
];

function formatMessageTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Chatbot() {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm your AcademyFlow Assistant. Ask me about schedule, vacations, teachers, courses, groups, or operations.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  async function resolveProgramIdForUser() {
    if (userData?.program_id) return userData.program_id;
    if (!userData?.id) return null;

    const { data, error } = await supabase
      .from("students")
      .select("program_id")
      .eq("id", userData.id)
      .single();

    if (error) {
      console.error("Error fetching user program_id:", error);
    }

    if (data?.program_id) return data.program_id;

    // Fallback for non-student users: pick the first active program in this institute.
    if (!userData?.institute_id) return null;

    const { data: fallbackProgram, error: fallbackError } = await supabase
      .from("programs")
      .select("id")
      .eq("institution_id", userData.institute_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      console.error("Error fetching fallback program id:", fallbackError);
      return null;
    }

    return fallbackProgram?.id || null;
  }

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    if (!userData?.institute_id) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Please log in first to use the chatbot.",
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    const userMsg = { role: "user", text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const instituteId = userData.institute_id;

      const [botId, resolvedProgramId] = await Promise.all([
        fetchBotId(instituteId),
        resolveProgramIdForUser(),
      ]);

      const chatId = await fetchProgramChatId(resolvedProgramId);

      // Pass conversation history (exclude initial greeting, last 10 messages for context window)
      const history = messages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        text: m.text,
      }));

      const reply = await sendChatMessage(text, history, instituteId);
      setMessages((prev) => [...prev, { role: "bot", text: reply, createdAt: new Date().toISOString() }]);

      if (botId && chatId) {
        const telegramMessage = [
          "<b>AcademyFlow Chatbot</b>",
          `<b>Institute:</b> ${userData.institute_name || instituteId}`,
          `<b>User:</b> ${userData.email || "Unknown"}`,
          `<b>Question:</b> ${text}`,
          `<b>Reply:</b> ${reply}`,
        ].join("\n");

        const notifyResult = await sendTelegramNotification(telegramMessage, {
          botId,
          chatId,
        });

        if (!notifyResult?.ok) {
          console.warn("Telegram notification failed:", notifyResult?.error || "Unknown error");
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: err.message || "Something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleQuickPrompt(prompt) {
    setInput(prompt);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "bot",
        text: "Chat cleared. Ask me anything from your academic database.",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  return (
    <>
      {/* Floating button */}
      <button className="chatbot-fab" onClick={() => setIsOpen(!isOpen)} title="AcademyFlow Assistant">
        {isOpen ? "✕" : "🤖"}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-avatar">🤖</div>
              <div className="chatbot-header-info">
                <h3>AcademyFlow AI</h3>
                <span>{loading ? "Thinking..." : "Online and ready"}</span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button className="chatbot-header-btn" onClick={clearChat} title="Clear chat">
                🗑
              </button>
              <button className="chatbot-header-btn" onClick={() => setIsOpen(false)} title="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg-wrap ${msg.role}`}>
                <div className={`chatbot-msg ${msg.role}`}>
                  {msg.text}
                </div>
                <div className="chatbot-msg-meta">
                  <span>{msg.role === "user" ? "You" : "Assistant"}</span>
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="chatbot-prompt-chip"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={loading}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="chatbot-input-area">
            <input
              className="chatbot-input"
              type="text"
              placeholder="Ask about classes, teachers, vacations, groups..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className="chatbot-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
