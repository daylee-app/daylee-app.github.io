const assistantInput = document.getElementById('assistantInput');

assistantInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    const query = assistantInput.value.trim();
    assistantInput.value = '';
    handleAssistantQuery(query);
  }
});

function handleAssistantQuery(input) {
  const lower = input.toLowerCase();
  const today = new Date();

  // 1. Add Event: "add dentist appointment tomorrow at 3:00"
  const addRegex = /add (.+?) (?:on )?(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?(?: at (\d{1,2}(:\d{2})?\s?(am|pm)?))?/i;
  const matchAdd = input.match(addRegex);
  if (matchAdd) {
    const [, title, dayStr, timeStr] = matchAdd;
    const date = resolveDate(dayStr || "today");
    const time = formatTime(timeStr);
    const newEvent = { title, date, time, desc: '' };
    events.push(newEvent);
    localStorage.setItem('dayleeEvents', JSON.stringify(events));
    renderCalendar(currentMonth, currentYear);
    showNotification(`Added "${title}" on ${date}${time ? ' at ' + time : ''}`);
    return;
  }

  // 2. Check Free: "am I free monday at 2?"
  const freeRegex = /am i free (?:on )?(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: at (\d{1,2}(:\d{2})?\s?(am|pm)?))?/i;
  const matchFree = input.match(freeRegex);
  if (matchFree) {
    const [, dayStr, timeStr] = matchFree;
    const date = resolveDate(dayStr);
    const time = formatTime(timeStr);
    const conflict = events.find(e => e.date === date && (!time || e.time === time));
    if (conflict) {
      showNotification(`You're busy: ${conflict.title}${conflict.time ? ' at ' + conflict.time : ''}`);
    } else {
      showNotification(`You're free ${dayStr}${time ? ' at ' + time : ''}!`);
    }
    return;
  }

  showNotification("Sorry, I didn't understand that.");
}

function resolveDate(dayStr) {
  const map = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const today = new Date();
  if (dayStr === "today") return today.toISOString().slice(0, 10);
  if (dayStr === "tomorrow") {
    const d = new Date(today); d.setDate(today.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (dayStr in map) {
    const dayIndex = map[dayStr];
    const diff = (dayIndex - today.getDay() + 7) % 7 || 7;
    const d = new Date(today); d.setDate(today.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }
  return today.toISOString().slice(0, 10);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  let time = timeStr.toLowerCase().replace(/\s+/g, '');
  if (time.includes('am') || time.includes('pm')) {
    let [h, m] = time.replace(/(am|pm)/, '').split(':');
    m = m || '00';
    h = parseInt(h);
    if (time.includes('pm') && h !== 12) h += 12;
    if (time.includes('am') && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  } else {
    let [h, m] = time.split(':');
    m = m || '00';
    return `${h.padStart(2, '0')}:${m}`;
  }
}
