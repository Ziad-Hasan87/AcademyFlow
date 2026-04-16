import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";

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

function getEventTimeRange(event) {
  const startAt = formatEventTime(event?.start_at);
  const endAt = formatEventTime(event?.end_at);

  if (startAt && endAt) return `${startAt} - ${endAt}`;
  if (startAt) return startAt;

  if (event?.start_slot || event?.end_slot) {
    return `${event.start_slot || "?"} - ${event.end_slot || "?"}`;
  }

  return "Time not set";
}

export default function DailyEvents({ selectedDate }) {
  const { userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

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

      const onlyTimeEvents = (Array.isArray(data) ? data : [])
        .filter((event) => String(event?.type || "").toLowerCase() === "time")
        .sort((a, b) => {
          const aTime = new Date(a?.start_at || `${selectedDate}T00:00:00`).getTime();
          const bTime = new Date(b?.start_at || `${selectedDate}T00:00:00`).getTime();
          return aTime - bTime;
        });

      setEvents(onlyTimeEvents);
      setLoading(false);
    };

    fetchDailyTimeEvents();
  }, [selectedDate, userData?.id]);

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
            <article key={event.id} className="daily-event-item">
              <div className="daily-event-time">{getEventTimeRange(event)}</div>
              <div className="daily-event-title">{event?.title || "Untitled event"}</div>
              {event?.description ? (
                <p className="daily-event-description">{event.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
