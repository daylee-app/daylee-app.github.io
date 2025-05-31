// --- Supabase Setup ---
    const SUPABASE_URL = "https://qfgmcnbqhhelrdxvdrdb.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21jbmJxaGhlbHJkeHZkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTY2OTgsImV4cCI6MjA2MzY5MjY5OH0.OZhA0jmUmGcQ5ZJs3gxy99blGsz7YyRJyBfiHDDAWIc";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let userProfile = null, familyId = null, familyEvents = [];

// --- Load Profile & Events ---
async function loadProfileAndEvents() {
  if (!supabase) await loadApiKeys();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { window.location.href = "/signin.html"; return; }
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profileError || !profile) { alert("No profile found."); return; }
  userProfile = profile;
  familyId = profile.family_id;
  const { data: cal } = await supabase.from('calendars').select('*').eq('family_id', familyId).maybeSingle();
  familyEvents = (cal && cal.events) ? (Array.isArray(cal.events) ? cal.events : JSON.parse(cal.events)) : [];
}

// --- AI Chat Logic ---
const aiChat = document.getElementById('aiChat');
const aiForm = document.getElementById('aiForm');
const aiInput = document.getElementById('aiInput');

function appendMessage(text, sender = "ai") {
  const msg = document.createElement('div');
  msg.className = 'ai-message ' + sender;
  msg.textContent = text;
  aiChat.appendChild(msg);
  aiChat.scrollTop = aiChat.scrollHeight;
}

// --- Smarter Synonym and Phrase Normalization ---
function normalizeInput(input) {
  // Correct common misspellings for date words and other keywords
  let text = input.trim().toLowerCase();
  text = text
    .replace(/\btomm?orrow\b/g, "tomorrow")
    .replace(/\btodayy\b/g, "today")
    .replace(/\byesturday\b/g, "yesterday")
    .replace(/\bcalender\b/g, "calendar")
    .replace(/\bdelet\b/g, "delete")
    .replace(/\bad\b/g, "add")
    .replace(/\beventt\b/g, "event")
    .replace(/\bshwo\b/g, "show")
    .replace(/\bwhenn\b/g, "when")
    .replace(/\bavailible\b/g, "available");
  return text;
}

// --- Natural Language Parser for Calendar ---
function parseCommand(input) {
  const text = normalizeInput(input);

  // Calculator: try to detect math expressions
  if (/^[\d\.\+\-\*\/\(\) ]+$/.test(input.trim())) {
    return { action: "calculate", expr: input.trim() };
  }

  // Add event: supports "add event title tomorrow", "add event title today", "add event title", etc.
  if (/add/.test(text)) {
    let title = "";
    let date = null;
    let time = "";

    // Try to extract title and keywords
    // e.g. "add event Dentist tomorrow at 15:00"
    const addMatch = text.match(/add (?:event )?(.+?)(?: on (\d{4}-\d{2}-\d{2}))?(?: at (\d{1,2}(:\d{2})?\s*[ap]m|\d{1,2}:\d{2}))?(?:\s|$)/i);

    if (addMatch) {
      title = addMatch[1]
        .replace(/\b(tomorrow|today|yesterday)\b/i, '') // Remove date words from title
        .replace(/\s+$/, '')
        .trim();
      if (addMatch[2]) date = addMatch[2];
      if (addMatch[3]) time = addMatch[3].replace(/\s+/g, '');
    }

    // If "tomorrow", "today", or "yesterday" is in the input, set date accordingly
    if (/tomorrow/.test(text)) {
      const d = new Date(); d.setDate(d.getDate() + 1);
      date = d.toISOString().slice(0, 10);
    } else if (/today/.test(text)) {
      date = new Date().toISOString().slice(0, 10);
    } else if (/yesterday/.test(text)) {
      const d = new Date(); d.setDate(d.getDate() - 1);
      date = d.toISOString().slice(0, 10);
    }

    // If no title found, fallback to "Untitled"
    if (!title) title = "Untitled";

    return {
      action: "add",
      title,
      date,
      time
    };
  }

  // Delete event: supports "delete event title", "delete title"
  if (/delete/.test(text)) {
    // Match "delete event title" or "delete title"
    const delMatch = text.match(/delete (?:event )?(.+?)(?: on |\s+at |\s*$)/i) || text.match(/delete (.+)/i);
    let title = delMatch ? delMatch[1].replace(/(tomorrow|today|yesterday)$/i, '').trim() : null;
    return {
      action: "delete",
      title: title
    };
  }

  // Edit event
  if (/edit/.test(text)) {
    const titleMatch = text.match(/edit (?:event )?(.+?)(?: on |\s+at |\s*$)/i);
    const dateMatch = text.match(/on (\d{4}-\d{2}-\d{2})/i);
    const timeMatch = text.match(/to (\d{1,2}(:\d{2})?\s*[ap]m|\d{1,2}:\d{2})/i);
    return {
      action: "edit",
      title: titleMatch ? titleMatch[1].trim() : null,
      date: dateMatch ? dateMatch[1] : null,
      time: timeMatch ? timeMatch[1].replace(/\s+/g, '') : null
    };
  }

  // Show events
  if (/show|list|display|what|which|when|where|who|do i have|my|our|family|calendar|event/.test(text)) {
    if (/today/.test(text)) return { action: "show", date: new Date().toISOString().slice(0,10) };
    if (/tomorrow/.test(text)) {
      const d = new Date(); d.setDate(d.getDate()+1);
      return { action: "show", date: d.toISOString().slice(0,10) };
    }
    if (/yesterday/.test(text)) {
      const d = new Date(); d.setDate(d.getDate()-1);
      return { action: "show", date: d.toISOString().slice(0,10) };
    }
    if (/week/.test(text)) return { action: "show", range: "week" };
    if (/month/.test(text)) return { action: "show", range: "month" };
    if (/year/.test(text)) return { action: "show", range: "year" };
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return { action: "show", date: dateMatch[1] };
    return { action: "show", range: "all" };
  }

  // Availability
  if (/free|available|busy|slot|gap|open|can i|am i/.test(text)) {
    const dateMatch = text.match(/on (\d{4}-\d{2}-\d{2})/i);
    const timeMatch = text.match(/at (\d{1,2}(:\d{2})?\s*[ap]m|\d{1,2}:\d{2})/i);
    return {
      action: "availability",
      date: dateMatch ? dateMatch[1] : null,
      time: timeMatch ? timeMatch[1].replace(/\s+/g, '') : null
    };
  }

  // Help
  if (/help|how|usage|example|can you|what can you do/.test(text)) {
    return { action: "help" };
  }

  return { action: "unknown", original: input };
}

// --- Free AI API for general questions (no key required) ---
async function askFreeAiApi(question, calendarContext) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(question + " " + calendarContext)}&format=json&no_redirect=1&no_html=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.AbstractText) return data.AbstractText;
    if (data.Answer) return data.Answer;
    if (data.RelatedTopics && data.RelatedTopics.length)
      return data.RelatedTopics[0].Text || "Sorry, I couldn't find an answer.";
    return "Sorry, I couldn't find an answer.";
  } catch (e) {
    return "Sorry, there was a problem contacting the free AI service.";
  }
}

// --- Command Handlers ---
async function handleCommand(cmd) {
  // Calculator
  if (cmd.action === "calculate") {
    try {
      // eslint-disable-next-line no-eval
      let result = eval(cmd.expr);
      return `The result is: ${result}`;
    } catch {
      return "Sorry, I couldn't calculate that.";
    }
  }

  // Add event (actually adds to calendar)
  if (cmd.action === "add") {
    if (!cmd.date) return "Please specify a date for the event (e.g. 'add event Meeting tomorrow' or 'add event Meeting on 2024-06-01').";
    const newEvent = {
      title: cmd.title || "Untitled",
      date: cmd.date,
      time: cmd.time || "",
      desc: "",
      color: "#fff", // Default color is white
      category: "",
      private: false,
      reminder: "",
      location: ""
    };
    familyEvents.push(newEvent);
    await supabase.from('calendars').upsert([{ family_id: familyId, events: familyEvents }]);
    return `Event "${newEvent.title}" added on ${cmd.date}${cmd.time ? " at " + cmd.time : ""}.`;
  }

  // Delete event (by name, deletes all matching events)
  if (cmd.action === "delete") {
    if (!cmd.title) return "Please specify the event name (e.g. 'delete event Meeting').";
    const beforeCount = familyEvents.length;
    familyEvents = familyEvents.filter(e => e.title.toLowerCase() !== cmd.title.toLowerCase());
    const deletedCount = beforeCount - familyEvents.length;
    if (deletedCount === 0) return `No event named "${cmd.title}" found.`;
    await supabase.from('calendars').upsert([{ family_id: familyId, events: familyEvents }]);
    return `Deleted ${deletedCount} event${deletedCount > 1 ? "s" : ""} named "${cmd.title}".`;
  }

  // Edit event
  if (cmd.action === "edit") {
    if (!cmd.title || !cmd.date || !cmd.time) return "Please specify the event title, date, and new time (e.g. 'edit event Meeting on 2024-06-01 to 16:00').";
    const idx = familyEvents.findIndex(e => e.title.toLowerCase() === cmd.title.toLowerCase() && e.date === cmd.date);
    if (idx === -1) return "Event not found.";
    familyEvents[idx].time = cmd.time;
    await supabase.from('calendars').upsert([{ family_id: familyId, events: familyEvents }]);
    return `Event "${cmd.title}" on ${cmd.date} updated to ${cmd.time}.`;
  }

  // Show events (detailed)
  if (cmd.action === "show") {
    let events = [];
    let details = "";
    if (cmd.date) {
      events = familyEvents.filter(e => e.date === cmd.date);
      if (events.length === 0) return `No events found for ${cmd.date}.`;
      details = events.map(e =>
        `• "${e.title}"${e.time ? " at " + e.time : ""}${e.location ? " (Location: " + e.location + ")" : ""}${e.desc ? " - " + e.desc : ""}`
      ).join('\n');
      return `Events on ${cmd.date}:\n${details}`;
    }
    if (cmd.range === "week") {
      const today = new Date();
      const week = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const ds = d.toISOString().slice(0,10);
        const dayEvents = familyEvents.filter(e => e.date === ds);
        if (dayEvents.length) {
          week.push(ds + ":\n" + dayEvents.map(e =>
            `  • "${e.title}"${e.time ? " at " + e.time : ""}${e.location ? " (Location: " + e.location + ")" : ""}${e.desc ? " - " + e.desc : ""}`
          ).join('\n'));
        }
      }
      return week.length ? "Events this week:\n" + week.join('\n') : "No events this week.";
    }
    if (cmd.range === "month") {
      const m = (new Date()).toISOString().slice(0,7);
      const monthEvents = familyEvents.filter(e => e.date && e.date.startsWith(m));
      if (monthEvents.length === 0) return "No events this month.";
      details = monthEvents.map(e =>
        `• "${e.title}" on ${e.date}${e.time ? " at " + e.time : ""}${e.location ? " (Location: " + e.location + ")" : ""}${e.desc ? " - " + e.desc : ""}`
      ).join('\n');
      return `Events this month:\n${details}`;
    }
    if (cmd.range === "year") {
      const y = (new Date()).toISOString().slice(0,4);
      const yearEvents = familyEvents.filter(e => e.date && e.date.startsWith(y));
      if (yearEvents.length === 0) return "No events this year.";
      details = yearEvents.map(e =>
        `• "${e.title}" on ${e.date}${e.time ? " at " + e.time : ""}${e.location ? " (Location: " + e.location + ")" : ""}${e.desc ? " - " + e.desc : ""}`
      ).join('\n');
      return `Events this year:\n${details}`;
    }
    if (familyEvents.length === 0) return "No events found.";
    details = familyEvents.map(e =>
      `• "${e.title}" on ${e.date}${e.time ? " at " + e.time : ""}${e.location ? " (Location: " + e.location + ")" : ""}${e.desc ? " - " + e.desc : ""}`
    ).join('\n');
    return `All events:\n${details}`;
  }

  // Availability (detailed)
  if (cmd.action === "availability") {
    let date = cmd.date || new Date().toISOString().slice(0,10);
    let time = cmd.time;
    let events = familyEvents.filter(e => e.date === date);

    if (!time) {
      if (events.length === 0) {
        // Find next busy day
        let nextBusy = familyEvents
          .filter(e => e.date > date)
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        let prevBusy = familyEvents
          .filter(e => e.date < date)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        let msg = `You are free all day on ${date}.`;
        if (nextBusy) msg += `\nYour next event is "${nextBusy.title}" on ${nextBusy.date}${nextBusy.time ? " at " + nextBusy.time : ""}.`;
        if (prevBusy) msg += `\nYour last event was "${prevBusy.title}" on ${prevBusy.date}${prevBusy.time ? " at " + prevBusy.time : ""}.`;
        return msg;
      }
      // Show busy times and free slots
      let busyTimes = events
        .filter(e => e.time)
        .map(e => e.time)
        .sort();
      let busyList = events
        .map(e => `${e.title}${e.time ? " at " + e.time : ""}`)
        .join(', ');
      let msg = `You have these events on ${date}: ${busyList}.`;
      if (busyTimes.length) {
        msg += `\nBusy times: ${busyTimes.join(', ')}.`;
        // Suggest free slots (simple: gaps between events)
        let freeSlots = [];
        for (let i = 0; i < busyTimes.length - 1; i++) {
          freeSlots.push(`between ${busyTimes[i]} and ${busyTimes[i+1]}`);
        }
        if (freeSlots.length) msg += `\nPossible free slots: ${freeSlots.join(', ')}.`;
      } else {
        msg += `\nYou have events, but no specific times set.`;
      }
      return msg;
    }

    // If a time is specified, check for conflicts and suggest alternatives
    let conflict = events.find(e => {
      if (!e.time) return false;
      let t1 = (e.time || '').replace(/[ap]m/i, '').trim();
      let t2 = time.replace(/[ap]m/i, '').trim();
      return t1 === t2;
    });
    if (conflict) {
      // Suggest next available time
      let allTimes = events.filter(e => e.time).map(e => e.time).sort();
      let idx = allTimes.indexOf(conflict.time);
      let nextFree = allTimes[idx + 1] ? `Try after ${allTimes[idx + 1]}.` : "Try later in the day.";
      return `You already have "${conflict.title}" at ${time} on ${date}. ${nextFree}`;
    } else {
      // Show what is before/after this time
      let busyTimes = events.filter(e => e.time).map(e => e.time).sort();
      let before = busyTimes.filter(t => t < time).pop();
      let after = busyTimes.find(t => t > time);
      let msg = `You are free at ${time} on ${date}.`;
      if (before) msg += ` Your previous event is at ${before}.`;
      if (after) msg += ` Your next event is at ${after}.`;
      return msg;
    }
  }

  // Help
  if (cmd.action === "help") {
    return `You can ask me things like:
- "Show my events today"
- "Add event Dentist tomorrow"
- "Add event Dentist on 2024-06-01 at 15:00"
- "Delete event Dentist"
- "Delete Dentist"
- "Edit event Dentist on 2024-06-01 to 16:00"
- "Can I do yoga at 10:00 on 2024-06-01?"
- "Am I free at 2pm tomorrow?"
- "What is 5*7+2?"
- "When is my next free slot?"
- "List all meetings next week"
- "Show everything for this month"
- "Calculate 12*8+4"
I understand many ways to ask about your calendar, events, and even math!`;
  }

  // For any other question, use the free AI API with calendar context
  if (cmd.action === "unknown") {
    const context = familyEvents.length
      ? familyEvents.map(e => `${e.title} on ${e.date}${e.time ? " at " + e.time : ""}`).join("; ")
      : "No events scheduled.";
    return await askFreeAiApi(cmd.original || "Unknown question", context);
  }

  return "Sorry, I didn't understand that. Try asking about your events, or say 'help'.";
}

// --- Form Handler ---
aiForm.onsubmit = async function(e) {
  e.preventDefault();
  const input = aiInput.value;
  appendMessage(input, "user");
  aiInput.value = "";
  await loadProfileAndEvents(); // Always refresh events before acting
  const cmd = parseCommand(input);
  let response = "Thinking...";
  appendMessage(response, "ai");
  response = await handleCommand(cmd);
  // Replace last AI message
  aiChat.lastChild.textContent = response;
};

// --- Initial Load ---
(async () => {
  try {
    await loadApiKeys();
    await loadProfileAndEvents();
    appendMessage("Hi! Ask me anything about your calendar. I understand many ways to ask about your events, time, and even math. Type 'help' for examples.", "ai");
  } catch (err) {
    appendMessage("Ask me anyting about your calendar", "ai");
  }
})();