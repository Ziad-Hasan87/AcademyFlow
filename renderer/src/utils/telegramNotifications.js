function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatValue(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function nowLabel() {
  return new Date().toLocaleString();
}

export async function sendTelegramNotification(message) {
  console.log("[Notifier] window.telegramNotifier exists?", !!window.telegramNotifier);
  console.log("[Notifier] window.telegramNotifier.send exists?", !!window.telegramNotifier?.send);
  console.log("[Notifier] window keys:", Object.keys(window).filter(k => !k.startsWith("_")));
  
  if (!window.telegramNotifier?.send) {
    console.warn("Telegram notifier bridge is not available.");
    return { ok: false, error: "Notifier bridge unavailable" };
  }

  return window.telegramNotifier.send({ message });
}

export async function notifyRoutineEventChange({ action, eventData = {}, actor = "System" }) {
  const courseName = eventData.courseName || "Unassigned";
  const lines = [
    "<b>AcademyFlow Notification</b>",
    `<b>Type:</b> Routine Event ${escapeHtml(action)}`,
    `<b>Title:</b> ${escapeHtml(formatValue(eventData.title))}`,
    `<b>Course:</b> ${escapeHtml(courseName)}`,
    `<b>Day:</b> ${escapeHtml(formatValue(eventData.dayOfWeek))}`,
    `<b>Slot:</b> ${escapeHtml(formatValue(eventData.startSlot))} to ${escapeHtml(formatValue(eventData.endSlot))}`,
    `<b>Target:</b> ${escapeHtml(formatValue(eventData.targetType))} - ${escapeHtml(formatValue(eventData.targetName))}`,
    `<b>Updated By:</b> ${escapeHtml(actor)}`,
    `<b>Time:</b> ${escapeHtml(nowLabel())}`
  ];

  if (eventData.description) {
    lines.splice(7, 0, `<b>Description:</b> ${escapeHtml(eventData.description)}`);
  }

  return sendTelegramNotification(lines.join("\n"));
}

export async function notifyVacationChange({ action, vacationData = {}, actor = "System" }) {
  const lines = [
    "<b>AcademyFlow Notification</b>",
    `<b>Type:</b> Vacation ${escapeHtml(action)}`,
    `<b>For:</b> ${escapeHtml(formatValue(vacationData.targetType))} - ${escapeHtml(formatValue(vacationData.targetName))}`,
    `<b>Start:</b> ${escapeHtml(formatValue(vacationData.startDay))}`,
    `<b>End:</b> ${escapeHtml(formatValue(vacationData.endDay))}`,
    `<b>Description:</b> ${escapeHtml(formatValue(vacationData.description, "None"))}`,
    `<b>Updated By:</b> ${escapeHtml(actor)}`,
    `<b>Time:</b> ${escapeHtml(nowLabel())}`
  ];

  return sendTelegramNotification(lines.join("\n"));
}
