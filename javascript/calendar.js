// --- Supabase Setup ---
    const SUPABASE_URL = "https://qfgmcnbqhhelrdxvdrdb.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21jbmJxaGhlbHJkeHZkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTY2OTgsImV4cCI6MjA2MzY5MjY5OH0.OZhA0jmUmGcQ5ZJs3gxy99blGsz7YyRJyBfiHDDAWIc";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- State ---
    let userProfile = null, familyId = null, familyRole = null, familyCode = null;
    let familyEvents = [];
    let familyMembers = [];
    let editingEventIndex = null;
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('monthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const addEventBtn = document.getElementById('addEventBtn');
    const eventModalBg = document.getElementById('eventModalBg');
    const closeEventModal = document.getElementById('closeEventModal');
    const eventForm = document.getElementById('eventForm');
    const eventModalTitle = document.getElementById('eventModalTitle');
    const eventTitle = document.getElementById('eventTitle');
    const eventDate = document.getElementById('eventDate');
    const eventTime = document.getElementById('eventTime');
    const eventDesc = document.getElementById('eventDesc');
    const eventColor = document.getElementById('eventColor');
    const eventCategory = document.getElementById('eventCategory');
    const eventPrivate = document.getElementById('eventPrivate');
    const eventReminder = document.getElementById('eventReminder');
    const eventLocation = document.getElementById('eventLocation');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    // Removed eventForList and familyMembers logic
    let today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- Load Profile & Family ---
    async function getProfileAndFamily() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/signin.html"; return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) { alert("No profile found."); return; }
      userProfile = profile;
      familyId = profile.family_id;
      familyRole = profile.role;
      // Get family code for invites
      const { data: fam } = await supabase.from('families').select('*').eq('id', familyId).single();
      familyCode = fam ? fam.code : null;
      // No need to get family members
    }

    // --- Load Family Events ---
    async function loadFamilyEvents() {
      if (!familyId) return;
      const { data: cal } = await supabase.from('calendars').select('*').eq('family_id', familyId).maybeSingle();
      familyEvents = [];
      if (cal && cal.events) {
        familyEvents = Array.isArray(cal.events) ? cal.events : JSON.parse(cal.events);
      }
      renderCalendar(currentMonth, currentYear);
    }

    // --- Save Family Events ---
    async function saveFamilyEvents(events) {
      if (!familyId) return;
      await supabase.from('calendars').upsert([{ family_id: familyId, events }]);
    }

    // --- Calendar Rendering ---
    function renderCalendar(month, year) {
      calendarGrid.innerHTML = '';
      // Days of week header
      daysOfWeek.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day-header';
        dayDiv.textContent = day;
        calendarGrid.appendChild(dayDiv);
      });
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDiv);
      }
      // Days
      for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const cellDateStr = cellDate.toISOString().slice(0, 10);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        if (cellDateStr === new Date().toISOString().slice(0, 10)) {
          dayDiv.classList.add('today');
        }
        // Show all events for the family
        const dayEvents = familyEvents.filter(e => e.date === cellDateStr);
        dayDiv.innerHTML = `<div class="calendar-day-num">${day}</div>`;
        dayEvents.forEach((e, idx) => {
          const evDiv = document.createElement('div');
          evDiv.className = 'calendar-event';
          evDiv.style.background = e.color || '#2563eb';
          evDiv.title = (e.title || '') + (e.location ? ` @ ${e.location}` : '');
          evDiv.innerHTML = `<span>${e.title || ''}</span>${e.location ? `<span style="font-size:0.9em;color:#fff8;"> @ ${e.location}</span>` : ''}`;
          evDiv.onclick = () => editEvent(familyEvents.indexOf(e));
          dayDiv.appendChild(evDiv);
        });
        dayDiv.onclick = (ev) => {
          if (ev.target === dayDiv) editEventForDay(cellDateStr);
        };
        calendarGrid.appendChild(dayDiv);
      }
    }

    function updateMonthYear() {
      const date = new Date(currentYear, currentMonth);
      const options = { month: 'long', year: 'numeric' };
      monthYear.textContent = date.toLocaleDateString(undefined, options);
    }

    prevMonthBtn.onclick = function() {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      updateMonthYear();
      renderCalendar(currentMonth, currentYear);
    };
    nextMonthBtn.onclick = function() {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      updateMonthYear();
      renderCalendar(currentMonth, currentYear);
    };

    // --- Add/Edit Event Modal ---
    addEventBtn.onclick = function() {
      editingEventIndex = null;
      eventModalTitle.textContent = "Add Event";
      eventModalBg.style.display = 'flex';
      eventTitle.value = '';
      eventDate.value = '';
      eventTime.value = '';
      eventDesc.value = '';
      eventColor.value = '#2563eb';
      eventCategory.value = '';
      eventPrivate.checked = false;
      eventReminder.value = '';
      eventLocation.value = '';
      deleteEventBtn.style.display = 'none'; // Hide delete button for new event
    };
    closeEventModal.onclick = function() {
      eventModalBg.style.display = 'none';
    };
    eventModalBg.onclick = function(e) {
      if (e.target === eventModalBg) eventModalBg.style.display = 'none';
    };

    function editEvent(idx) {
      editingEventIndex = idx;
      const e = familyEvents[idx];
      eventModalTitle.textContent = "Edit Event";
      eventModalBg.style.display = 'flex';
      eventTitle.value = e.title || '';
      eventDate.value = e.date || '';
      eventTime.value = e.time || '';
      eventDesc.value = e.desc || '';
      eventColor.value = e.color || '#2563eb';
      eventCategory.value = e.category || '';
      eventPrivate.checked = !!e.private;
      eventReminder.value = e.reminder || '';
      eventLocation.value = e.location || '';
      deleteEventBtn.style.display = 'inline-block'; // Show delete button for editing
    }

    function editEventForDay(dateStr) {
      editingEventIndex = null;
      eventModalTitle.textContent = "Add Event";
      eventModalBg.style.display = 'flex';
      eventTitle.value = '';
      eventDate.value = dateStr;
      eventTime.value = '';
      eventDesc.value = '';
      eventColor.value = '#2563eb';
      eventCategory.value = '';
      eventPrivate.checked = false;
      eventReminder.value = '';
      eventLocation.value = '';
      deleteEventBtn.style.display = 'none'; // Hide delete button for new event
    }

    deleteEventBtn.onclick = async function() {
      if (editingEventIndex !== null) {
        if (confirm("Delete this event?")) {
          familyEvents.splice(editingEventIndex, 1);
          await saveFamilyEvents(familyEvents);
          showNotification("Event deleted.");
          eventModalBg.style.display = 'none';
          renderCalendar(currentMonth, currentYear);
        }
      }
    };

    window.editEvent = editEvent;

    window.deleteEvent = async function(idx) {
      if (!confirm("Delete this event?")) return;
      familyEvents.splice(idx, 1);
      await saveFamilyEvents(familyEvents);
      showNotification("Event deleted.");
      renderCalendar(currentMonth, currentYear);
    };

    eventForm.onsubmit = async function(e) {
      e.preventDefault();
      const newEvent = {
        title: eventTitle.value,
        date: eventDate.value,
        time: eventTime.value,
        desc: eventDesc.value,
        color: eventColor.value,
        category: eventCategory.value,
        private: eventPrivate.checked,
        reminder: eventReminder.value,
        location: eventLocation.value
      };
      if (editingEventIndex !== null) {
        familyEvents[editingEventIndex] = newEvent;
      } else {
        familyEvents.push(newEvent);
      }
      await saveFamilyEvents(familyEvents);
      showNotification("Event saved!");
      eventModalBg.style.display = 'none';
      renderCalendar(currentMonth, currentYear);
    };

    function showNotification(msg, duration = 3500) {
      const n = document.getElementById('notification');
      n.textContent = msg;
      n.style.display = 'block';
      n.style.opacity = '1';
      n.style.pointerEvents = 'auto';
      setTimeout(() => {
        n.style.opacity = '0';
        n.style.pointerEvents = 'none';
      }, duration);
    }

    // --- Initial Render ---
    async function initialLoadAndSync() {
      await getProfileAndFamily();
      updateMonthYear();
      await loadFamilyEvents();
    }
    window.addEventListener('DOMContentLoaded', initialLoadAndSync);