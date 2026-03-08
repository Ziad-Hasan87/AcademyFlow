import supabase from "./supabase";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ─── Fetch all context data from Supabase for the chatbot ───

async function fetchChatbotContext(instituteId) {
  const results = {};

  // Fetch departments
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("institute_id", instituteId);
  results.departments = departments || [];

  // Fetch programs
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, departments(name)")
    .eq("institution_id", instituteId)
    .eq("is_active", true);
  results.programs = programs || [];

  // Fetch active operations
  const programIds = results.programs.map((p) => p.id);
  if (programIds.length > 0) {
    const { data: operations } = await supabase
      .from("operations")
      .select("id, name, status, program_id, programs(name)")
      .in("program_id", programIds)
      .eq("status", "active");
    results.operations = operations || [];
  } else {
    results.operations = [];
  }

  // Fetch routines
  if (programIds.length > 0) {
    const { data: routines } = await supabase
      .from("routine")
      .select(`
        id, name, created_at,
        operation:operation_id (id, name, program_id)
      `)
      .order("created_at", { ascending: false });
    results.routines = routines || [];
  } else {
    results.routines = [];
  }

  // Fetch recurring events (class schedule)
  const routineIds = results.routines.map((r) => r.id);
  if (routineIds.length > 0) {
    const { data: events } = await supabase
      .from("recurring_events")
      .select(`
        id, title, type, start_at, end_at, expire_at,
        start_slot, end_slot, day_of_week, repeat_every,
        start_week, course_id, description, is_reschedulable,
        for_users, from_table, routine_id
      `)
      .in("routine_id", routineIds)
      .order("day_of_week");
    results.events = events || [];
  } else {
    results.events = [];
  }

  // Fetch courses
  const operationIds = results.operations.map((o) => o.id);
  if (operationIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, operation_id")
      .in("operation_id", operationIds);
    results.courses = courses || [];
  } else {
    results.courses = [];
  }

  // Fetch teachers
  const { data: teachers } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("institute_id", instituteId)
    .eq("role", "Teacher");
  results.teachers = teachers || [];

  // Fetch course-teacher assignments
  const courseIds = results.courses.map((c) => c.id);
  if (courseIds.length > 0) {
    const { data: moderators } = await supabase
      .from("course_moderators")
      .select("course_id, user_id, users(id, name, role)")
      .in("course_id", courseIds);
    results.courseModerators = moderators || [];
  } else {
    results.courseModerators = [];
  }

  // Fetch groups
  if (programIds.length > 0) {
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, program_id, programs(name)")
      .in("program_id", programIds);
    results.groups = groups || [];
  } else {
    results.groups = [];
  }

  // Fetch slots
  if (operationIds.length > 0) {
    const { data: slots } = await supabase
      .from("slotinfo")
      .select("*")
      .in("operation_id", operationIds)
      .order("serial_no");
    results.slots = slots || [];
  } else {
    results.slots = [];
  }

  // Fetch subgroups
  const groupIds = results.groups.map((g) => g.id);
  if (groupIds.length > 0) {
    const { data: subgroups } = await supabase
      .from("subgroups")
      .select("id, name, group_id, groups(name)")
      .in("group_id", groupIds);
    results.subgroups = subgroups || [];
  } else {
    results.subgroups = [];
  }

  // Fetch vacations
  const { data: vacations } = await supabase
    .from("vacations")
    .select("id, start_day, end_day, description, from_table, for_users")
    .eq("institute_id", instituteId)
    .order("start_day", { ascending: true });
  results.vacations = vacations || [];

  // Fetch custom knowledge base (extra data you add manually)
  const { data: knowledgeBase } = await supabase
    .from("chatbot_knowledge")
    .select("id, title, content, category, created_at")
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  results.knowledgeBase = knowledgeBase || [];

  return results;
}

// ─── Build the system prompt with fetched data ───

function buildSystemPrompt(context) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Helper function to get slot time info
  const getSlotTime = (slotId) => {
    if (!slotId) return null;
    const slot = context.slots.find((s) => s.id === slotId);
    return slot ? `${slot.start || "?"}–${slot.end || "?"}` : null;
  };

  // Separate class events from vacation/holiday events
  const classEvents = context.events.filter((e) => {
    const type = String(e.type || "").toLowerCase();
    return !type.includes("vacation") && !type.includes("holiday");
  });

  const holidayEvents = context.events.filter((e) => {
    const type = String(e.type || "").toLowerCase();
    return type.includes("vacation") || type.includes("holiday");
  });

  // Format class events into readable schedule
  const scheduleLines = classEvents.map((e) => {
    const course = context.courses.find((c) => c.id === e.course_id);
    const moderators = context.courseModerators
      .filter((m) => m.course_id === e.course_id)
      .map((m) => m.users?.name)
      .filter(Boolean);
    const dayName = dayNames[e.day_of_week] || `Day ${e.day_of_week}`;
    
    // Get actual slot times instead of IDs
    const startSlotTime = getSlotTime(e.start_slot);
    const endSlotTime = getSlotTime(e.end_slot);
    const slotDisplay = startSlotTime && endSlotTime && e.start_slot === e.end_slot 
      ? startSlotTime 
      : startSlotTime && endSlotTime 
        ? `${startSlotTime} to ${endSlotTime}`
        : `Slot IDs: ${e.start_slot || "?"} to ${e.end_slot || "?"}`;
    
    return `- ${e.title || course?.name || "Untitled"} on ${dayName}, Time: ${slotDisplay}, Teachers: ${moderators.join(", ") || "Not assigned"}${e.description ? `, Note: ${e.description}` : ""}`;
  });

  // Format holiday/vacation events
  const holidayLines = holidayEvents.map((e) => {
    const dayName = dayNames[e.day_of_week] || `Day ${e.day_of_week}`;
    return `- ${e.title || "Holiday"} on ${dayName}${e.description ? `: ${e.description}` : ""}${e.start_at ? ` (Start: ${e.start_at})` : ""}${e.end_at ? ` (End: ${e.end_at})` : ""}`;
  });

  // Format vacations from vacations table
  const vacationLines = (context.vacations || []).map((v) => {
    const fromTableMap = {
      all: "All",
      programs: `Program ID: ${v.for_users}`,
      departments: `Department ID: ${v.for_users}`,
      operations: `Operation ID: ${v.for_users}`,
    };
    const targetInfo = fromTableMap[v.from_table] || v.from_table;
    return `- ${v.start_day} to ${v.end_day} (${targetInfo})${v.description ? `: ${v.description}` : ""}`;
  });

  // Format teacher list
  const teacherLines = context.teachers.map((t) => `- ${t.name} (${t.role})`);

  // Format courses with their teachers
  const courseLines = context.courses.map((c) => {
    const mods = context.courseModerators
      .filter((m) => m.course_id === c.id)
      .map((m) => m.users?.name)
      .filter(Boolean);
    return `- ${c.name}: Teachers: ${mods.join(", ") || "Not assigned"}`;
  });

  // Format groups
  const groupLines = context.groups.map((g) => `- ${g.name} (Program: ${g.programs?.name || "N/A"})`);

  // Format subgroups
  const subgroupLines = (context.subgroups || []).map((sg) => `- ${sg.name} (Group: ${sg.groups?.name || "N/A"})`);

  // Format slots
  const slotLines = context.slots.map((s) => `- Slot ${s.serial_no}: ${s.start || "?"} - ${s.end || "?"}`);

  // Format custom knowledge base
  const kbLines = context.knowledgeBase.map((kb) => `- [${kb.category || "General"}] ${kb.title}: ${kb.content}`);

  return `You are AcademyFlow Assistant, a helpful AI chatbot for an academic institution management system.
Today's date is ${today}.

You answer questions about class schedules, routines, vacations, teachers, courses, and general academic information.
Be concise, friendly, and accurate. If you don't know something, say so honestly.
Only answer questions related to the academic data provided below. For unrelated questions, politely redirect.
Always prioritize explicit database facts over assumptions.
When answering course schedule questions, include day, time, audience (group/subgroup/all), and teacher if available.
Avoid showing raw UUIDs if a readable label or time exists.

=== DEPARTMENTS ===
${context.departments.map((d) => `- ${d.name} (${d.code})`).join("\n") || "No departments found."}

=== PROGRAMS ===
${context.programs.map((p) => `- ${p.name} (Dept: ${p.departments?.name || "N/A"})`).join("\n") || "No programs found."}

=== ACTIVE OPERATIONS (Semesters/Terms) ===
${context.operations.map((o) => `- ${o.name} (Program: ${o.programs?.name || "N/A"})`).join("\n") || "No active operations."}

=== CLASS SCHEDULE / RECURRING EVENTS ===
${scheduleLines.join("\n") || "No scheduled classes."}

=== VACATIONS & HOLIDAYS (from recurring events) ===
${holidayLines.join("\n") || "No holiday events in recurring schedule."}

=== VACATIONS (from vacations table) ===
${vacationLines.join("\n") || "No vacations scheduled."}

=== TIME SLOTS ===
${slotLines.join("\n") || "No slot info available."}

=== COURSES & TEACHERS ===
${courseLines.join("\n") || "No courses found."}

=== ALL TEACHERS ===
${teacherLines.join("\n") || "No teachers found."}

=== GROUPS ===
${groupLines.join("\n") || "No groups found."}

=== SUBGROUPS ===
${subgroupLines.join("\n") || "No subgroups found."}

=== ADDITIONAL KNOWLEDGE BASE ===
${kbLines.join("\n") || "No additional information."}
`;
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

function findNextClassEvent(context) {
  const now = new Date();
  const nowMs = now.getTime();
  const slotMap = new Map((context.slots || []).map((s) => [s.id, s]));

  const candidates = (context.events || [])
    .filter((e) => {
      const type = String(e.type || "").toLowerCase();
      const isClassLike = !type || !(type.includes("vacation") || type.includes("holiday"));
      if (!isClassLike) return false;

      if (e.expire_at) {
        const expire = new Date(e.expire_at);
        if (!Number.isNaN(expire.getTime()) && expire.getTime() < nowMs) return false;
      }

      return typeof e.day_of_week === "number";
    })
    .map((e) => {
      const target = new Date(now);
      const currentDow = now.getDay();
      let addDays = (e.day_of_week - currentDow + 7) % 7;

      const slot = slotMap.get(e.start_slot);
      const time = parseTimeString(e.start_at) || parseTimeString(slot?.start);
      if (!time) return null;

      target.setDate(now.getDate() + addDays);
      target.setHours(time.hours, time.minutes, 0, 0);

      // If today's class time has passed, shift to next week.
      if (target.getTime() <= nowMs) {
        addDays += 7;
        target.setDate(now.getDate() + addDays);
      }

      return { ...e, nextDate: target };
    })
    .filter(Boolean)
    .sort((a, b) => a.nextDate - b.nextDate);

  return candidates[0] || null;
}

function formatEventLine(event, context) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const course = (context.courses || []).find((c) => c.id === event.course_id);
  const moderators = (context.courseModerators || [])
    .filter((m) => m.course_id === event.course_id)
    .map((m) => m.users?.name)
    .filter(Boolean);

  const when = event.nextDate
    ? event.nextDate.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : `${dayNames[event.day_of_week] || "Unknown day"}`;

  // Get actual slot time instead of showing IDs
  const startSlot = (context.slots || []).find((s) => s.id === event.start_slot);
  const endSlot = (context.slots || []).find((s) => s.id === event.end_slot);
  const slotDisplay = startSlot && endSlot && event.start_slot === event.end_slot
    ? `${startSlot.start || "?"}–${startSlot.end || "?"}`
    : startSlot && endSlot
      ? `${startSlot.start || "?"} to ${endSlot.end || "?"}`
      : "Time slot not specified";

  return `${event.title || course?.name || "Untitled class"} on ${when} at ${slotDisplay}${moderators.length ? `, Teacher: ${moderators.join(", ")}` : ""}`;
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

function resolveTargetLabel(fromTable, forUsers, context) {
  if (!fromTable || fromTable === "all") return "All";
  if (fromTable === "groups") {
    const group = (context.groups || []).find((g) => g.id === forUsers);
    return group ? `Group ${group.name}` : "Group";
  }
  if (fromTable === "subgroups") {
    const subgroup = (context.subgroups || []).find((sg) => sg.id === forUsers);
    return subgroup ? `Subgroup ${subgroup.name}` : "Subgroup";
  }
  return fromTable;
}

function localAnswerFromContext(userMessage, context, withQuotaNote = false) {
  const q = String(userMessage || "").toLowerCase();
  const prefix = withQuotaNote
    ? "LLM quota is currently exceeded, so I am answering directly from your database.\n\n"
    : "";

  const isClassLike = (event) => {
    const type = String(event?.type || "").toLowerCase();
    return !type || !(type.includes("vacation") || type.includes("holiday"));
  };

  const matchedCourses = (context.courses || []).filter((course) => looksLikeMatch(q, course.name));
  const matchedGroups = (context.groups || []).filter((group) => looksLikeMatch(q, group.name));
  const matchedSubgroups = (context.subgroups || []).filter((subgroup) => looksLikeMatch(q, subgroup.name));
  const scheduleIntent = q.includes("slot") || q.includes("time") || q.includes("when") || q.includes("class") || q.includes("schedule") || q.includes("routine");

  if (scheduleIntent && (matchedCourses.length || matchedGroups.length || matchedSubgroups.length)) {
    const slotById = new Map((context.slots || []).map((slot) => [slot.id, slot]));
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const selectedCourseIds = new Set(matchedCourses.map((c) => c.id));
    const selectedGroupIds = new Set(matchedGroups.map((g) => g.id));
    const selectedSubgroupIds = new Set(matchedSubgroups.map((sg) => sg.id));

    const eventMatchesAudience = (event) => {
      const audience = String(event.from_table || "").toLowerCase();
      if (!selectedGroupIds.size && !selectedSubgroupIds.size) return true;
      if (audience === "groups" && selectedGroupIds.has(event.for_users)) return true;
      if (audience === "subgroups" && selectedSubgroupIds.has(event.for_users)) return true;
      return false;
    };

    const events = (context.events || [])
      .filter(isClassLike)
      .filter((event) => !selectedCourseIds.size || selectedCourseIds.has(event.course_id))
      .filter(eventMatchesAudience)
      .sort((a, b) => {
        const dayDiff = (a.day_of_week ?? 99) - (b.day_of_week ?? 99);
        if (dayDiff !== 0) return dayDiff;
        const aSlot = slotById.get(a.start_slot)?.serial_no ?? 999;
        const bSlot = slotById.get(b.start_slot)?.serial_no ?? 999;
        return aSlot - bSlot;
      });

    if (!events.length) {
      return `${prefix}I found the course/group in your data, but no matching scheduled class events were found.`;
    }

    const lines = events.slice(0, 8).map((event) => {
      const course = (context.courses || []).find((c) => c.id === event.course_id);
      const slotStart = slotById.get(event.start_slot);
      const slotEnd = slotById.get(event.end_slot);
      const timeText = slotStart && slotEnd
        ? `${slotStart.start || "?"} - ${slotEnd.end || "?"}`
        : "Time not defined";
      const dayText = dayNames[event.day_of_week] || `Day ${event.day_of_week}`;
      const audienceText = resolveTargetLabel(event.from_table, event.for_users, context);
      const teacherNames = (context.courseModerators || [])
        .filter((m) => m.course_id === event.course_id)
        .map((m) => m.users?.name)
        .filter(Boolean)
        .join(", ");

      return `- ${course?.name || event.title || "Untitled"}: ${dayText}, ${timeText}, For: ${audienceText}${teacherNames ? `, Teacher: ${teacherNames}` : ""}`;
    });

    return `${prefix}Here is the schedule from your database:\n${lines.join("\n")}`;
  }

  if (q.includes("next class") || q.includes("next lecture") || q.includes("upcoming class")) {
    const nextEvent = findNextClassEvent(context);
    if (!nextEvent) {
      return `${prefix}I could not find any upcoming class from your current routine data.`;
    }
    return `${prefix}Your next class is: ${formatEventLine(nextEvent, context)}.`;
  }

  if (q.includes("vacation") || q.includes("holiday") || q.includes("break")) {
    // Get vacation/holiday events from recurring events
    const holidayEvents = (context.events || []).filter((e) => {
      const type = String(e.type || "").toLowerCase();
      return type.includes("vacation") || type.includes("holiday");
    });

    // Get vacations from vacations table
    const vacations = context.vacations || [];
    
    // Find next upcoming vacation by date
    const now = new Date();
    const upcomingVacations = vacations.filter((v) => {
      if (!v.start_day) return false;
      const startDate = new Date(v.start_day);
      return startDate >= now;
    }).sort((a, b) => new Date(a.start_day) - new Date(b.start_day));

    if (!holidayEvents.length && !vacations.length) {
      return `${prefix}I could not find any vacation/holiday information in the current data.`;
    }

    let response = `${prefix}`;
    
    if (upcomingVacations.length > 0) {
      const nextVacation = upcomingVacations[0];
      response += `📅 Next Vacation: ${nextVacation.start_day} to ${nextVacation.end_day}`;
      if (nextVacation.description) response += ` - ${nextVacation.description}`;
      response += `\n\n`;
    }

    if (vacations.length > 0) {
      const vacationLines = vacations.slice(0, 5).map((v) => 
        `- ${v.start_day} to ${v.end_day}${v.description ? `: ${v.description}` : ""}`
      );
      response += `All Vacations (${vacations.length}):\n${vacationLines.join("\n")}`;
    }

    if (holidayEvents.length > 0) {
      const eventLines = holidayEvents.slice(0, 3).map((v) => `- ${formatEventLine(v, context)}`);
      response += `\n\nHoliday Events (${holidayEvents.length}):\n${eventLines.join("\n")}`;
    }

    return response;
  }

  if (q.includes("teacher") || q.includes("faculty") || q.includes("moderator")) {
    const teachers = (context.teachers || []).map((t) => t.name).filter(Boolean);
    if (!teachers.length) {
      return `${prefix}No teacher records were found for your institute.`;
    }

    const courseLines = (context.courses || []).slice(0, 8).map((c) => {
      const mods = (context.courseModerators || [])
        .filter((m) => m.course_id === c.id)
        .map((m) => m.users?.name)
        .filter(Boolean);
      return `- ${c.name}: ${mods.join(", ") || "Not assigned"}`;
    });

    return `${prefix}Total teachers: ${teachers.length}.\n${courseLines.length ? `Course assignments:\n${courseLines.join("\n")}` : "No course-teacher assignments found."}`;
  }

  if (q.includes("summary") || q.includes("routine") || q.includes("schedule")) {
    const nextEvent = findNextClassEvent(context);
    const upcomingVacations = (context.vacations || []).filter((v) => {
      if (!v.start_day) return false;
      const startDate = new Date(v.start_day);
      return startDate >= new Date();
    }).sort((a, b) => new Date(a.start_day) - new Date(b.start_day));
    
    const nextVacation = upcomingVacations[0];
    
    return `${prefix}Routine summary:\n- Departments: ${(context.departments || []).length}\n- Programs: ${(context.programs || []).length}\n- Active operations: ${(context.operations || []).length}\n- Courses: ${(context.courses || []).length}\n- Teachers: ${(context.teachers || []).length}\n- Groups: ${(context.groups || []).length}\n- Subgroups: ${(context.subgroups || []).length}\n- Scheduled events: ${(context.events || []).length}\n- Vacations: ${(context.vacations || []).length}\n${nextEvent ? `- Next class: ${formatEventLine(nextEvent, context)}` : "- Next class: Not found"}\n${nextVacation ? `- Next vacation: ${nextVacation.start_day} to ${nextVacation.end_day}` : ""}`;
  }

  return `${prefix}I can answer directly from your database for classes, course schedules, teachers, groups/subgroups, operations, and vacations. Try: "Show CSE 3220 schedule for Group B" or "When is my next vacation?"`;
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

// ─── Send message to Groq API ───

export async function sendChatMessage(userMessage, conversationHistory, instituteId) {
  // Fetch fresh context from database
  const context = await fetchChatbotContext(instituteId);

  if (!GROQ_API_KEY) {
    return localAnswerFromContext(userMessage, context, false);
  }

  const systemPrompt = buildSystemPrompt(context);

  // Build conversation for Groq (OpenAI-compatible format)
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
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
