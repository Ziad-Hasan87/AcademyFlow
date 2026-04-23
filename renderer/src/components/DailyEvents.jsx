import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";
import Modal from "./Modal";
import ViewEvent from "./ViewEvent";

function formatDateLabel(dateStr) {
  if (!dateStr) return "No date selected";

  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventType(event) {
  return String(event?.type ?? event?.event_type ?? "")
    .trim()
    .toLowerCase();
}

function getStartTimeValue(event) {
  return event?.start_at ?? event?.start_time ?? null;
}

function getEndTimeValue(event) {
  return event?.end_at ?? event?.end_time ?? null;
}

function isTimeEvent(event) {
  const normalizedType = getEventType(event);
  if (normalizedType === "time") return true;

  return Boolean(getStartTimeValue(event) || getEndTimeValue(event));
}

function getEventTimeRange(event) {
  const startAt = formatEventTime(getStartTimeValue(event));
  const endAt = formatEventTime(getEndTimeValue(event));

  if (startAt && endAt) return `${startAt} - ${endAt}`;
  if (startAt) return startAt;

  if (event?.start_slot || event?.end_slot) {
    return `${event.start_slot || "?"} - ${event.end_slot || "?"}`;
  }

  return "Time not set";
}

function getEventImageUrl(event) {
  return event?.image_url || event?.image_path || "";
}

export default function DailyEvents({ selectedDate }) {
  const { userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [openingEventId, setOpeningEventId] = useState(null);

  const getEventId = (event) => event?.id ?? event?.event_id ?? null;

  const handleOpenEditEvent = async (event) => {
    const eventId = getEventId(event);
    if (!eventId) {
      alert("Unable to open this event for editing.");
      return;
    }

    try {
      setOpeningEventId(eventId);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        console.error("Error loading event details:", error);
        alert("Could not load full event details.");
        return;
      }

        setViewEvent(data || event);
        setIsViewOpen(true);
    } finally {
      setOpeningEventId(null);
    }
  };

  useEffect(() => {
    const fetchDailyTimeEvents = async () => {
      if (!selectedDate || !userData?.id) {
        setEvents([]);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.rpc("get_events_for_user", {
        p_user_id: userData.id,
        p_start_date: selectedDate,
        p_end_date: selectedDate,
      });

      if (error) {
        console.error("Error fetching daily events:", error);
        setEvents([]);
        setLoading(false);
        return;
      }

      const rawEvents = Array.isArray(data) ? data : [];
      const onlyTimeEvents = rawEvents
        .filter((event) => isTimeEvent(event))
        .sort((a, b) => {
          const aTime = new Date(getStartTimeValue(a) || `${selectedDate}T00:00:00`).getTime();
          const bTime = new Date(getStartTimeValue(b) || `${selectedDate}T00:00:00`).getTime();
          return aTime - bTime;
        });

      setEvents(onlyTimeEvents);
      setLoading(false);
    };

    fetchDailyTimeEvents();
  }, [selectedDate, userData?.id, refreshTick]);

  return (
    <section className="daily-events-container">
      <div className="daily-events-header">
        <h3>Daily Events</h3>
        <span>{formatDateLabel(selectedDate)}</span>
      </div>

      {!selectedDate && (
        <div className="daily-events-placeholder">Select a date to view time events.</div>
      )}

      {selectedDate && loading && (
        <div className="daily-events-placeholder">Loading events...</div>
      )}

      {selectedDate && !loading && events.length === 0 && (
        <div className="daily-events-placeholder">No time events found for this day.</div>
      )}

      {selectedDate && !loading && events.length > 0 && (
        <div className="daily-events-list">
          {events.map((event) => (
            <article
              key={getEventId(event) || `${event?.title || "event"}-${event?.date || ""}`}
              className="daily-event-item"
              role="button"
              tabIndex={0}
              onClick={() => {
                handleOpenEditEvent(event);
              }}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                  keyboardEvent.preventDefault();
                  handleOpenEditEvent(event);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {getEventImageUrl(event) ? (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    borderRadius: "10px",
                    overflow: "hidden",
                    marginBottom: "8px",
                    background: "#e2e8f0",
                  }}
                >
                  <img
                    src={getEventImageUrl(event)}
                    alt={event?.title || "Event image"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ) : null}

              <div className="daily-event-time">{getEventTimeRange(event)}</div>
              <div className="daily-event-title">{event?.title || "Untitled event"}</div>
              {openingEventId === getEventId(event) && (
                <p className="daily-event-description">Opening details...</p>
              )}
              {event?.description ? (
                <p className="daily-event-description">{event.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={isViewOpen}
        title="View Event"
        onClose={() => {
          setIsViewOpen(false);
          setViewEvent(null);
        }}
        contentClassName="explorer-theme-modal-content"
        bodyClassName="explorer-theme-modal-body"
      >
        {viewEvent && (
          <ViewEvent
            event={viewEvent}
            onUpdated={() => setRefreshTick((tick) => tick + 1)}
            onClose={() => {
              setIsViewOpen(false);
              setViewEvent(null);
            }}
          />
        )}
      </Modal>
    </section>
  );
}
