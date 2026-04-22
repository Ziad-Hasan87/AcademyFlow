import supabase from "./supabase";
import { RPC_CHATBOT_CONTEXT } from "./query";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toSqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";

  if (typeof value === "string") {
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  const asJson = JSON.stringify(value).replace(/'/g, "''");
  return `'${asJson}'::jsonb`;
}

function buildRpcSqlCall(functionName, rpcParams = {}) {
  const entries = Object.entries(rpcParams);

  if (!entries.length) {
    return `select * from public.${functionName}();`;
  }

  const paramsBlock = entries
    .map(([key, value]) => `  ${key} => ${toSqlLiteral(value)}`)
    .join(",\n");

  return `select *\nfrom public.${functionName}(\n${paramsBlock}\n);`;
}

async function callRpcWithQueryLog(functionName, rpcParams = {}) {
  const sqlCall = buildRpcSqlCall(functionName, rpcParams);
  console.log(`[Chatbot RPC] Executing:\n${sqlCall}`);

  const result = await supabase.rpc(functionName, rpcParams);
  const rowCount = Array.isArray(result?.data) ? result.data.length : result?.data ? 1 : 0;

  if (result?.error) {
    console.warn(`[Chatbot RPC] ${functionName} failed:`, result.error?.message || result.error);
  } else {
    console.log(`[Chatbot RPC] ${functionName} rows: ${rowCount}`);
  }

  return result;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueIds(values) {
  return [...new Set(values.filter(Boolean))];
}

function mapById(items) {
  return new Map(normalizeArray(items).map((item) => [item.id, item]));
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizeUuidParam(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeDateParam(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function normalizeTextParam(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function detectNeedsUserContext(userMessage, conversationHistory) {
  const current = String(userMessage || "").toLowerCase();
  const history = normalizeArray(conversationHistory)
    .slice(-4)
    .map((message) => String(message?.text || "").toLowerCase())
    .join(" ");
  const corpus = `${current} ${history}`;

  return /\b(my|mine|me|for\s+me|myself|our\s+class|my\s+class|my\s+schedule)\b/.test(corpus);
}

function sanitizeAdvancedRpcParams(rawParams = {}, scopeFilters = null) {
  const params = rawParams && typeof rawParams === "object" ? rawParams : {};
  void scopeFilters;

  return {
    p_start_date: hasOwn(params, "p_start_date") ? normalizeDateParam(params.p_start_date) : null,
    p_end_date: hasOwn(params, "p_end_date") ? normalizeDateParam(params.p_end_date) : null,
    p_program_id: hasOwn(params, "p_program_id") ? normalizeUuidParam(params.p_program_id) : null,
    p_group_id: hasOwn(params, "p_group_id") ? normalizeUuidParam(params.p_group_id) : null,
    p_subgroup_id: hasOwn(params, "p_subgroup_id") ? normalizeUuidParam(params.p_subgroup_id) : null,
    p_operation_id: hasOwn(params, "p_operation_id") ? normalizeUuidParam(params.p_operation_id) : null,
    p_teacher_name: hasOwn(params, "p_teacher_name") ? normalizeTextParam(params.p_teacher_name) : null,
    p_group_name: hasOwn(params, "p_group_name") ? normalizeTextParam(params.p_group_name) : null,
    p_subgroup_name: hasOwn(params, "p_subgroup_name") ? normalizeTextParam(params.p_subgroup_name) : null,
    p_program_name: hasOwn(params, "p_program_name") ? normalizeTextParam(params.p_program_name) : null,
    p_operation_name: hasOwn(params, "p_operation_name") ? normalizeTextParam(params.p_operation_name) : null,
  };
}

function extractJsonObjectCandidate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenceMatch?.[1] || text).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    const slice = candidate.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
}

function canonicalText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikeMatch(query, target) {
  const q = canonicalText(query);
  const t = canonicalText(target);
  if (!q || !t) return false;
  return q.includes(t) || t.includes(q);
}

function isQuotaOrBillingError(message) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("rate") ||
    text.includes("billing") ||
    text.includes("exceeded") ||
    text.includes("429") ||
    text.includes("403")
  );
}

function isVacationLikeEvent(event) {
  const blob = `${event?.type || ""} ${event?.title || ""} ${event?.description || ""}`.toLowerCase();
  return blob.includes("vacation") || blob.includes("holiday") || blob.includes("break");
}

function isClassLikeEvent(event) {
  return !isVacationLikeEvent(event);
}

function parseTimeString(value) {
  if (!value) return null;

  if (typeof value === "string" && value.includes("T")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return { hours: d.getHours(), minutes: d.getMinutes() };
    }
  }

  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function formatTimeValue(value) {
  if (!value) return "";

  if (typeof value === "string" && value.includes("T")) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  const time = parseTimeString(value);
  if (!time) return String(value);

  const temp = new Date();
  temp.setHours(time.hours, time.minutes, 0, 0);
  return temp.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateLabel(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return String(dateValue);

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeNextOccurrence(dayOfWeek, time, referenceDate = new Date()) {
  if (typeof dayOfWeek !== "number" || !time) return null;

  const target = new Date(referenceDate);
  const currentDow = target.getDay();
  let addDays = (dayOfWeek - currentDow + 7) % 7;

  target.setDate(target.getDate() + addDays);
  target.setHours(time.hours, time.minutes, 0, 0);

  if (target.getTime() <= referenceDate.getTime()) {
    target.setDate(target.getDate() + 7);
  }

  return target;
}

function getEventStartDateTime(event, slotById, referenceDate = new Date()) {
  if (event?.start_at) {
    const parsed = new Date(event.start_at);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (event?.date) {
    const datePart = String(event.date).slice(0, 10);
    const slot = slotById.get(event.start_slot);
    const time = parseTimeString(event.start_time) || parseTimeString(slot?.start);
    if (time) {
      const parsed = new Date(`${datePart}T${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const parsedDate = new Date(`${datePart}T00:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  }

  const slot = slotById.get(event?.start_slot);
  const recurringTime = parseTimeString(event?.start_time) || parseTimeString(slot?.start);
  return computeNextOccurrence(event?.day_of_week, recurringTime, referenceDate);
}

function getEventTimeLabel(event, slotById) {
  const startAt = formatTimeValue(event?.start_at || event?.start_time);
  const endAt = formatTimeValue(event?.end_at || event?.end_time);
  if (startAt && endAt) return `${startAt} - ${endAt}`;
  if (startAt) return startAt;

  const startSlot = slotById.get(event?.start_slot);
  const endSlot = slotById.get(event?.end_slot);

  if (startSlot && endSlot) {
    return `${formatTimeValue(startSlot.start)} - ${formatTimeValue(endSlot.end)}`;
  }

  if (startSlot) {
    return `${formatTimeValue(startSlot.start)} - ${formatTimeValue(startSlot.end)}`;
  }

  return "Time not specified";
}

function getEventDateLabel(event, slotById) {
  const startDate = getEventStartDateTime(event, slotById);
  if (startDate) return toDateLabel(startDate);
  if (typeof event?.day_of_week === "number") return DAY_NAMES[event.day_of_week] || `Day ${event.day_of_week}`;
  return "Date not specified";
}

function resolveAudienceLabel(event, lookups) {
  const fromTable = String(event?.from_table || "").toLowerCase();
  const targetId = event?.for_users;

  if (!fromTable) return "All";
  if (fromTable === "groups") return lookups.groupById.get(targetId)?.name || "Group";
  if (fromTable === "subgroups") return lookups.subgroupById.get(targetId)?.name || "Subgroup";
  if (fromTable === "programs") return lookups.programById.get(targetId)?.name || "Program";
  if (fromTable === "operations") return lookups.operationById.get(targetId)?.name || "Operation";
  if (fromTable === "departments") return lookups.departmentById.get(targetId)?.name || "Department";

  return fromTable;
}

function getTeacherNamesForEvent(event, context) {
  const fromEventModerators = normalizeArray(context.eventModerators)
    .filter((moderator) => moderator.event_id === event.id)
    .map((moderator) => moderator.users?.name)
    .filter(Boolean);

  if (fromEventModerators.length > 0) {
    return [...new Set(fromEventModerators)];
  }

  const fromCourseModerators = normalizeArray(context.courseModerators)
    .filter((moderator) => moderator.course_id === event.course_id)
    .map((moderator) => moderator.users?.name)
    .filter(Boolean);

  return [...new Set(fromCourseModerators)];
}

function getCourseLabel(event, context) {
  const course = mapById(context.courses).get(event.course_id);
  return course?.name || event?.title || "Untitled";
}

function dedupeEventsById(events) {
  const byId = new Map();
  for (const event of normalizeArray(events)) {
    const key = event?.id || `${event?.title || "untitled"}-${event?.date || "no-date"}`;
    if (!byId.has(key)) {
      byId.set(key, event);
    }
  }
  return [...byId.values()];
}

function sortEventsByStart(events, slotById) {
  return [...normalizeArray(events)].sort((a, b) => {
    const aStart = getEventStartDateTime(a, slotById);
    const bStart = getEventStartDateTime(b, slotById);

    if (aStart && bStart) return aStart.getTime() - bStart.getTime();
    if (aStart) return -1;
    if (bStart) return 1;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function formatEventLine(event, context, slotById) {
  const lookups = {
    groupById: mapById(context.groups),
    subgroupById: mapById(context.subgroups),
    programById: mapById(context.programs),
    operationById: mapById(context.operations),
    departmentById: mapById(context.departments),
  };

  const title = event?.title || getCourseLabel(event, context);
  const dateText = getEventDateLabel(event, slotById);
  const timeText = getEventTimeLabel(event, slotById);
  const audienceText = resolveAudienceLabel(event, lookups);
  const teacherNames = getTeacherNamesForEvent(event, context);

  return `${title} | ${dateText} | ${timeText} | For: ${audienceText}${teacherNames.length ? ` | Teacher: ${teacherNames.join(", ")}` : ""}`;
}

async function safeSelect(fetcher, label) {
  try {
    const { data, error } = await fetcher();
    if (error) {
      console.warn(`Chatbot lookup failed (${label}):`, error?.message || error);
      return [];
    }
    return normalizeArray(data);
  } catch (error) {
    console.warn(`Chatbot lookup threw (${label}):`, error?.message || error);
    return [];
  }
}

async function fetchEventsViaAdvancedRpc({ userId, searchText = null, scopeFilters = null, rpcOverrides = null, includeUserContext = true }) {
  void searchText;
  void scopeFilters;

  const defaultParams = {
    p_user_id: includeUserContext ? (userId || null) : null,
    p_start_date: null,
    p_end_date: null,
    p_group_id: null,
    p_subgroup_id: null,
    p_program_id: null,
    p_operation_id: null,
    p_teacher_name: null,
    p_group_name: null,
    p_subgroup_name: null,
    p_program_name: null,
    p_operation_name: null,
  };

  const plannedParams = sanitizeAdvancedRpcParams(rpcOverrides || {}, scopeFilters);
  const rpcParams = {
    ...defaultParams,
    ...plannedParams,
    p_user_id: includeUserContext ? (userId || null) : null,
  };

  const { data, error } = await callRpcWithQueryLog("get_events_advanced", rpcParams);

  if (error) throw error;
  return normalizeArray(data);
}

async function fetchUserProfileViaRpc(userId) {
  if (!userId) return null;

  try {
    const rpcParams = {
      p_user_id: userId,
    };

    const { data, error } = await callRpcWithQueryLog("get_user_profile", rpcParams);

    if (error) {
      console.warn("Chatbot user profile RPC failed:", error?.message || error);
      return null;
    }

    const profile = normalizeArray(data)[0] || null;
    console.log("[Chatbot RPC] get_user_profile loaded:", profile ? {
      id: profile.id,
      role: profile.role,
      name: profile.name,
      department_name: profile.department_name,
      program_name: profile.program_name,
      group_name: profile.group_name,
      subgroup_name: profile.subgroup_name,
      codename: profile.codename,
    } : "No profile row");

    return profile;
  } catch (error) {
    console.warn("Chatbot user profile RPC threw:", error?.message || error);
    return null;
  }
}

async function fetchUserScopeFilters(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("students")
      .select("program_id, group_id, subgroup_id, operation_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Chatbot user scope lookup failed:", error?.message || error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      programId: data.program_id || null,
      groupId: data.group_id || null,
      subgroupId: data.subgroup_id || null,
      operationId: data.operation_id || null,
    };
  } catch (error) {
    console.warn("Chatbot user scope lookup threw:", error?.message || error);
    return null;
  }
}

async function planAdvancedRpcParamsWithGroq({
  userMessage,
  conversationHistory,
  userProfile,
  userScopeFilters,
  includeUserContext,
}) {
  if (!GROQ_API_KEY) return null;

  const conversationLines = normalizeArray(conversationHistory)
    .slice(-8)
    .map((message) => `- ${message.role || "unknown"}: ${String(message.text || "").trim()}`)
    .join("\n") || "- No prior conversation";

  const plannerMessages = [
    {
      role: "system",
      content:
        "You are an RPC planner for AcademyFlow. Return ONLY valid JSON with one object field named rpc_params. " +
        "Do not include explanations, markdown, or extra keys. " +
        "Allowed rpc_params keys: p_start_date, p_end_date, p_group_id, p_subgroup_id, p_program_id, p_operation_id, p_teacher_name, p_group_name, p_subgroup_name, p_program_name, p_operation_name. " +
        "Dates must be YYYY-MM-DD or null. IDs must be UUID strings or null. Name keys must be plain text or null. " +
        "ONLY include parameters required by user intent. Do not include extra filters.",
    },
    {
      role: "user",
      content: [
        "Create rpc_params for get_events_advanced based on the query and context.",
        "",
        "Current user profile:",
        formatUserProfileForPrompt(userProfile),
        "",
        "Available user scope IDs (prefer these for 'my' context):",
        `- program_id: ${userScopeFilters?.programId || "null"}`,
        `- group_id: ${userScopeFilters?.groupId || "null"}`,
        `- subgroup_id: ${userScopeFilters?.subgroupId || "null"}`,
        `- operation_id: ${userScopeFilters?.operationId || "null"}`,
        `- include_user_context: ${includeUserContext ? "true" : "false"}`,
        "",
        "Conversation context:",
        conversationLines,
        "",
        `Current user query: ${userMessage}`,
        "",
        "Respond only in this exact JSON shape:",
        '{"rpc_params":{"p_start_date":null,"p_end_date":null,"p_group_id":null,"p_subgroup_id":null,"p_program_id":null,"p_operation_id":null,"p_teacher_name":null,"p_group_name":null,"p_subgroup_name":null,"p_program_name":null,"p_operation_name":null}}',
      ].join("\n"),
    },
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: plannerMessages,
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `Groq planner error (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = extractJsonObjectCandidate(content);
    const rawParams = parsed?.rpc_params || parsed?.rpcParams || parsed?.params || parsed;

    if (!rawParams || typeof rawParams !== "object") {
      console.warn("[Chatbot Planner] Unable to parse rpc_params from Groq response.", content);
      return null;
    }

    const sanitizedParams = sanitizeAdvancedRpcParams(rawParams, userScopeFilters);
    console.log("[Chatbot Planner] Planned get_events_advanced params:", sanitizedParams);
    return sanitizedParams;
  } catch (error) {
    console.warn("[Chatbot Planner] Planning failed:", error?.message || error);
    return null;
  }
}

function formatUserProfileForPrompt(userProfile) {
  if (!userProfile) {
    return "- User profile is not available.";
  }

  const lines = [
    `- Name: ${userProfile.name || "Unknown"}`,
    `- Role: ${userProfile.role || "Unknown"}`,
  ];

  if (userProfile.department_name) {
    lines.push(`- Department: ${userProfile.department_name}`);
  }

  if (userProfile.program_name) {
    lines.push(`- Program: ${userProfile.program_name}`);
  }

  if (userProfile.group_name) {
    lines.push(`- Group: ${userProfile.group_name}`);
  }

  if (userProfile.subgroup_name) {
    lines.push(`- Subgroup: ${userProfile.subgroup_name}`);
  }

  if (userProfile.codename) {
    lines.push(`- Teacher codename: ${userProfile.codename}`);
  }

  return lines.join("\n");
}

function formatRpcParamsForPrompt(params) {
  if (!params) {
    return "- Planner did not return explicit rpc_params (default query flow used).";
  }

  const entries = Object.entries(params);
  if (!entries.length) {
    return "- Planner returned an empty rpc_params object.";
  }

  return entries.map(([key, value]) => `- ${key}: ${value === null || value === undefined ? "null" : String(value)}`).join("\n");
}

async function fetchLookupData(events, instituteId) {
  const allEvents = normalizeArray(events);

  const courseIds = uniqueIds(allEvents.map((event) => event.course_id));
  const eventIds = uniqueIds(allEvents.map((event) => event.id));
  const groupIds = uniqueIds(allEvents.filter((event) => String(event.from_table || "").toLowerCase() === "groups").map((event) => event.for_users));
  const subgroupIds = uniqueIds(allEvents.filter((event) => String(event.from_table || "").toLowerCase() === "subgroups").map((event) => event.for_users));
  const programIds = uniqueIds(allEvents.filter((event) => String(event.from_table || "").toLowerCase() === "programs").map((event) => event.for_users));
  const operationIds = uniqueIds(allEvents.filter((event) => String(event.from_table || "").toLowerCase() === "operations").map((event) => event.for_users));
  const departmentIds = uniqueIds(allEvents.filter((event) => String(event.from_table || "").toLowerCase() === "departments").map((event) => event.for_users));
  const slotIds = uniqueIds(allEvents.flatMap((event) => [event.start_slot, event.end_slot]));

  const [courses, groups, subgroups, programs, operations, departments, slots, eventModerators, courseModerators, teachers] = await Promise.all([
    courseIds.length
      ? safeSelect(() => supabase.from("courses").select("id, name").in("id", courseIds), "courses")
      : Promise.resolve([]),
    groupIds.length
      ? safeSelect(() => supabase.from("groups").select("id, name").in("id", groupIds), "groups")
      : Promise.resolve([]),
    subgroupIds.length
      ? safeSelect(() => supabase.from("subgroups").select("id, name").in("id", subgroupIds), "subgroups")
      : Promise.resolve([]),
    programIds.length
      ? safeSelect(() => supabase.from("programs").select("id, name").in("id", programIds), "programs")
      : Promise.resolve([]),
    operationIds.length
      ? safeSelect(() => supabase.from("operations").select("id, name").in("id", operationIds), "operations")
      : Promise.resolve([]),
    departmentIds.length
      ? safeSelect(() => supabase.from("departments").select("id, name").in("id", departmentIds), "departments")
      : Promise.resolve([]),
    slotIds.length
      ? safeSelect(() => supabase.from("slotinfo").select("id, serial_no, start, end").in("id", slotIds), "slotinfo")
      : Promise.resolve([]),
    eventIds.length
      ? safeSelect(
          () => supabase.from("event_moderators").select("event_id, user_id, users(id, name, role)").in("event_id", eventIds),
          "event moderators"
        )
      : Promise.resolve([]),
    courseIds.length
      ? safeSelect(
          () => supabase.from("course_moderators").select("course_id, user_id, users(id, name, role)").in("course_id", courseIds),
          "course moderators"
        )
      : Promise.resolve([]),
    instituteId
      ? safeSelect(
          () => supabase.from("users").select("id, name, role").eq("institute_id", instituteId).eq("role", "Teacher"),
          "teachers"
        )
      : Promise.resolve([]),
  ]);

  return {
    courses,
    groups,
    subgroups,
    programs,
    operations,
    departments,
    slots,
    eventModerators,
    courseModerators,
    teachers,
  };
}

async function fetchChatbotContext({
  userId,
  instituteId,
  searchText,
  plannedRpcParams = null,
  preloadedUserProfile = null,
  preloadedScopeFilters = null,
  includeUserContext = true,
}) {
  void searchText;

  const userProfile = preloadedUserProfile || (await fetchUserProfileViaRpc(userId));
  const userScopeFilters = preloadedScopeFilters || (await fetchUserScopeFilters(userId));

  let events = [];
  let searchedEvents = [];

  if (plannedRpcParams) {
    events = await fetchEventsViaAdvancedRpc({
      userId,
      scopeFilters: userScopeFilters,
      rpcOverrides: plannedRpcParams,
      includeUserContext,
    });
    searchedEvents = events;
  } else {
    events = await fetchEventsViaAdvancedRpc({
      userId,
      scopeFilters: userScopeFilters,
      includeUserContext,
    });
    searchedEvents = events;
  }

  const mergedEvents = dedupeEventsById([...events, ...searchedEvents]);
  const lookups = await fetchLookupData(mergedEvents, instituteId);

  return {
    events: mergedEvents,
    searchedEvents: dedupeEventsById(searchedEvents),
    userProfile,
    ...lookups,
  };
}

function findNextClassEvent(context, slotById) {
  const now = new Date();
  const candidates = normalizeArray(context.events)
    .filter(isClassLikeEvent)
    .map((event) => ({
      ...event,
      _nextStart: getEventStartDateTime(event, slotById, now),
    }))
    .filter((event) => event._nextStart && event._nextStart.getTime() >= now.getTime())
    .sort((a, b) => a._nextStart.getTime() - b._nextStart.getTime());

  return candidates[0] || null;
}

function buildSystemPrompt(context, plannedRpcParams = null) {
  const slotById = mapById(context.slots);
  const baseEvents = context.searchedEvents.length > 0 ? context.searchedEvents : context.events;
  const eventsForPrompt = sortEventsByStart(baseEvents, slotById).slice(0, 100);

  const eventLines = eventsForPrompt.map((event) => `- ${formatEventLine(event, context, slotById)}`);
  const classCount = normalizeArray(context.events).filter(isClassLikeEvent).length;
  const vacationCount = normalizeArray(context.events).filter(isVacationLikeEvent).length;
  const userProfileLines = formatUserProfileForPrompt(context.userProfile);
  const plannedParamsLines = formatRpcParamsForPrompt(plannedRpcParams);

  return `${RPC_CHATBOT_CONTEXT}

Use ONLY the data below, which was fetched via get_events_advanced for the current user.
Use CURRENT USER PROFILE to personalize and disambiguate answers.
If the answer is not present, say that clearly.

=== CURRENT USER PROFILE (get_user_profile) ===
${userProfileLines}

=== PLANNER SELECTED RPC PARAMS ===
${plannedParamsLines}

=== EVENT COUNTS ===
- Total events: ${normalizeArray(context.events).length}
- Class-like events: ${classCount}
- Vacation/holiday events: ${vacationCount}

=== EVENT DATA (RPC OUTPUT) ===
${eventLines.join("\n") || "No events found from get_events_advanced."}`;
}

function localAnswerFromContext(userMessage, context, withQuotaNote = false) {
  const q = String(userMessage || "").toLowerCase();
  const prefix = withQuotaNote
    ? "LLM quota is currently exceeded, so I am answering directly from your get_events_advanced RPC data.\n\n"
    : "";

  const slotById = mapById(context.slots);
  const searchedEvents = context.searchedEvents.length > 0 ? context.searchedEvents : context.events;
  const classEvents = normalizeArray(context.events).filter(isClassLikeEvent);
  const vacationEvents = normalizeArray(context.events).filter(isVacationLikeEvent);
  const profile = context.userProfile;

  if (q.includes("who am i") || q.includes("my profile") || q.includes("my info")) {
    if (!profile) {
      return `${prefix}I could not load your profile from get_user_profile.`;
    }

    const infoLines = [
      `- Name: ${profile.name || "Unknown"}`,
      `- Role: ${profile.role || "Unknown"}`,
    ];

    if (profile.department_name) infoLines.push(`- Department: ${profile.department_name}`);
    if (profile.program_name) infoLines.push(`- Program: ${profile.program_name}`);
    if (profile.group_name) infoLines.push(`- Group: ${profile.group_name}`);
    if (profile.subgroup_name) infoLines.push(`- Subgroup: ${profile.subgroup_name}`);
    if (profile.codename) infoLines.push(`- Codename: ${profile.codename}`);

    return `${prefix}Your profile from get_user_profile:\n${infoLines.join("\n")}`;
  }

  if (q.includes("next class") || q.includes("next lecture") || q.includes("upcoming class")) {
    const nextEvent = findNextClassEvent(context, slotById);
    if (!nextEvent) {
      return `${prefix}I could not find any upcoming class from get_events_advanced.`;
    }

    return `${prefix}Your next class is: ${formatEventLine(nextEvent, context, slotById)}.`;
  }

  if (q.includes("vacation") || q.includes("holiday") || q.includes("break")) {
    if (!vacationEvents.length) {
      return `${prefix}I could not find any vacation or holiday events in get_events_advanced.`;
    }

    const upcoming = sortEventsByStart(vacationEvents, slotById)
      .filter((event) => {
        const start = getEventStartDateTime(event, slotById);
        return start && start.getTime() >= Date.now();
      })
      .slice(0, 5)
      .map((event) => `- ${formatEventLine(event, context, slotById)}`);

    if (!upcoming.length) {
      const recent = sortEventsByStart(vacationEvents, slotById)
        .slice(0, 5)
        .map((event) => `- ${formatEventLine(event, context, slotById)}`);
      return `${prefix}Vacation/holiday events found:\n${recent.join("\n")}`;
    }

    return `${prefix}Upcoming vacations/holidays:\n${upcoming.join("\n")}`;
  }

  const scheduleIntent =
    q.includes("slot") || q.includes("time") || q.includes("when") || q.includes("class") || q.includes("schedule") || q.includes("routine");

  if (scheduleIntent) {
    const matchedCourseIds = normalizeArray(context.courses)
      .filter((course) => looksLikeMatch(q, course.name))
      .map((course) => course.id);

    const matchedGroupIds = normalizeArray(context.groups)
      .filter((group) => looksLikeMatch(q, group.name))
      .map((group) => group.id);

    const matchedSubgroupIds = normalizeArray(context.subgroups)
      .filter((subgroup) => looksLikeMatch(q, subgroup.name))
      .map((subgroup) => subgroup.id);

    let events = normalizeArray(searchedEvents).filter(isClassLikeEvent);

    if (!events.length) {
      events = classEvents;
    }

    if (matchedCourseIds.length > 0) {
      const selected = new Set(matchedCourseIds);
      events = events.filter((event) => selected.has(event.course_id));
    }

    if (matchedGroupIds.length > 0 || matchedSubgroupIds.length > 0) {
      const groupSet = new Set(matchedGroupIds);
      const subgroupSet = new Set(matchedSubgroupIds);

      events = events.filter((event) => {
        const source = String(event.from_table || "").toLowerCase();
        if (source === "groups" && groupSet.has(event.for_users)) return true;
        if (source === "subgroups" && subgroupSet.has(event.for_users)) return true;
        return false;
      });
    }

    if (!events.length) {
      return `${prefix}I could not find matching scheduled events in get_events_advanced.`;
    }

    const lines = sortEventsByStart(events, slotById)
      .slice(0, 8)
      .map((event) => `- ${formatEventLine(event, context, slotById)}`);

    return `${prefix}Here is the schedule from get_events_advanced:\n${lines.join("\n")}`;
  }

  if (q.includes("teacher") || q.includes("faculty") || q.includes("moderator")) {
    const teacherNames = normalizeArray(context.teachers).map((teacher) => teacher.name).filter(Boolean);

    if (!teacherNames.length) {
      return `${prefix}I could not find teacher records in the available event scope.`;
    }

    const lines = teacherNames.slice(0, 12).map((name) => `- ${name}`);
    return `${prefix}Teachers in your current scope (${teacherNames.length}):\n${lines.join("\n")}`;
  }

  if (q.includes("summary") || q.includes("overview")) {
    const nextClass = findNextClassEvent(context, slotById);
    const firstVacation = sortEventsByStart(vacationEvents, slotById).find((event) => {
      const start = getEventStartDateTime(event, slotById);
      return start && start.getTime() >= Date.now();
    });

    return `${prefix}Event summary from get_events_advanced:\n- Total events: ${normalizeArray(context.events).length}\n- Class events: ${classEvents.length}\n- Vacation/holiday events: ${vacationEvents.length}\n${nextClass ? `- Next class: ${formatEventLine(nextClass, context, slotById)}\n` : "- Next class: Not found\n"}${firstVacation ? `- Next vacation/holiday: ${formatEventLine(firstVacation, context, slotById)}` : "- Next vacation/holiday: Not found"}`;
  }

  const sampleLines = sortEventsByStart(searchedEvents, slotById)
    .slice(0, 5)
    .map((event) => `- ${formatEventLine(event, context, slotById)}`);

  if (sampleLines.length > 0) {
    return `${prefix}I found these relevant events from get_events_advanced:\n${sampleLines.join("\n")}`;
  }

  return `${prefix}I can answer using get_events_advanced for schedules, classes, vacations, teachers, and event summaries. Try asking: "When is my next class?" or "Show my course schedule."`;
}

// ─── Send message to Groq API ───

export async function sendChatMessage(userMessage, conversationHistory, instituteId, userId) {
  const includeUserContext = detectNeedsUserContext(userMessage, conversationHistory);

  const [userProfile, userScopeFilters] = await Promise.all([
    fetchUserProfileViaRpc(userId),
    fetchUserScopeFilters(userId),
  ]);

  let plannedRpcParams = null;
  if (GROQ_API_KEY) {
    plannedRpcParams = await planAdvancedRpcParamsWithGroq({
      userMessage,
      conversationHistory,
      userProfile,
      userScopeFilters,
      includeUserContext,
    });
  }

  const context = await fetchChatbotContext({
    userId,
    instituteId,
    searchText: userMessage,
    plannedRpcParams,
    preloadedUserProfile: userProfile,
    preloadedScopeFilters: userScopeFilters,
    includeUserContext,
  });

  if (!GROQ_API_KEY) {
    return localAnswerFromContext(userMessage, context, false);
  }

  const systemPrompt = buildSystemPrompt(context, plannedRpcParams);

  // Build conversation for Groq (OpenAI-compatible format)
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  // Add conversation history
  for (const msg of normalizeArray(conversationHistory)) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    });
  }

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage,
  });

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.25,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `Groq API error (${response.status})`;

      if (isQuotaOrBillingError(message)) {
        return localAnswerFromContext(userMessage, context, true);
      }

      throw new Error(message);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return localAnswerFromContext(userMessage, context, false);
    }

    return reply;
  } catch (error) {
    if (isQuotaOrBillingError(error?.message)) {
      return localAnswerFromContext(userMessage, context, true);
    }
    throw error;
  }
}

// ─── Add custom knowledge to the chatbot_knowledge table ───

export async function addKnowledge(instituteId, title, content, category = "General") {
  const { data, error } = await supabase
    .from("chatbot_knowledge")
    .insert([{ institute_id: instituteId, title, content, category }])
    .select();

  if (error) throw error;
  return data;
}

export async function deleteKnowledge(knowledgeId) {
  const { error } = await supabase
    .from("chatbot_knowledge")
    .delete()
    .eq("id", knowledgeId);

  if (error) throw error;
}

export async function fetchKnowledge(instituteId) {
  const { data, error } = await supabase
    .from("chatbot_knowledge")
    .select("id, title, content, category, created_at")
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function formatSlotInfo(eventObj) {
  if (!eventObj) return "N/A";
  if (eventObj.start_time || eventObj.end_time) {
    return `${eventObj.start_time || "?"} to ${eventObj.end_time || "?"}`;
  }
  if (eventObj.start_slot || eventObj.end_slot) {
    return `${eventObj.start_slot || "?"} to ${eventObj.end_slot || "?"}`;
  }
  if (eventObj.start_at || eventObj.end_at) {
    return `${eventObj.start_at || "?"} to ${eventObj.end_at || "?"}`;
  }
  return "N/A";
}

function localEventNotificationFallback({ action = "created", oldAttributes, newAttributes, deletedAttributes }) {
  if (action === "deleted") {
    const deleted = deletedAttributes || oldAttributes || newAttributes || {};
    const title = deleted.title || "Untitled Event";
    const date = deleted.date || "N/A";
    const slot = formatSlotInfo(deleted);
    return `Event cancelled - Title: ${title}, Date: ${date}, Slot: ${slot}.`;
  }

  const current = newAttributes || oldAttributes || {};
  const title = current.title || "Untitled Event";
  const date = current.date || "N/A";
  const slot = formatSlotInfo(current);

  if (oldAttributes && newAttributes) {
    const changedKeys = Object.keys(newAttributes).filter(
      (key) => JSON.stringify(newAttributes[key]) !== JSON.stringify(oldAttributes[key])
    );
    const changes = changedKeys.length
      ? changedKeys
          .map((key) => `${key}: ${oldAttributes[key] ?? "null"} -> ${newAttributes[key] ?? "null"}`)
          .join("; ")
      : "No field-level change detected.";

    return `Event updated - Title: ${title}, Date: ${date}, Slot: ${slot}. Changes: ${changes}`;
  }

  return `New event - Title: ${title}, Date: ${date}, Slot: ${slot}. Please check your routine.`;
}

export async function generateEventNotificationFromJson({
  action = "created",
  oldAttributes = null,
  newAttributes = null,
  deletedAttributes = null,
}) {
  const instruction =
    "if there are two jsons, summarize the changes in the event and include event identity info like title, group, date, time, and description. if there is a single json, summarize the new event using the same attributes for a clear and concise student notification. include no additional texts. highlight changes for each attribute exactly in this format:\nTitle: CSE 3210 (B1) (MHO, WIS) (updated)\nGroup: B (changed from Subgroup B1)\nDate: 2026-04-07 (changed from 2026-04-08)\nTime: 11:30 AM to 1:10 PM (changed from 11:20 AM to 1:10 PM )\nDescription: Bring BYOD (updated)\nThis event has been updated.\nconvert 24h time to 12h time. use bold for changed parts and labels. if event is deleted, end with: This event has been cancelled. derive group/subgroup/program labels from from_table and for_users fields when present. Here is the JSON data:\n\n`;";

  let payload;

  if (action === "deleted") {
    payload = { action: "deleted", deletedAttributes: deletedAttributes || oldAttributes || newAttributes };
  } else if (oldAttributes && newAttributes) {
    payload = { action: "updated", oldAttributes, newAttributes };
  } else {
    payload = { action: "created", newAttributes: newAttributes || oldAttributes };
  }

  if (!GROQ_API_KEY) {
    return localEventNotificationFallback({ action, oldAttributes, newAttributes, deletedAttributes });
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You write student-facing academic event notifications. Follow user instructions exactly. Output only the final notification text.",
          },
          {
            role: "user",
            content: `${instruction}\n\nJSON:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `Groq API error (${response.status})`;
      if (isQuotaOrBillingError(message)) {
        return localEventNotificationFallback({ action, oldAttributes, newAttributes, deletedAttributes });
      }
      throw new Error(message);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || localEventNotificationFallback({ action, oldAttributes, newAttributes, deletedAttributes });
  } catch (error) {
    if (isQuotaOrBillingError(error?.message)) {
      return localEventNotificationFallback({ action, oldAttributes, newAttributes, deletedAttributes });
    }
    return localEventNotificationFallback({ action, oldAttributes, newAttributes, deletedAttributes });
  }
}
