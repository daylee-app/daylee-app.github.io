const SUPABASE_URL = "https://qfgmcnbqhhelrdxvdrdb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21jbmJxaGhlbHJkeHZkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTY2OTgsImV4cCI6MjA2MzY5MjY5OH0.OZhA0jmUmGcQ5ZJs3gxy99blGsz7YyRJyBfiHDDAWIc";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let userProfile = null;
let familyId = null;

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = "/signin.html"; return; }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) { alert("No profile found."); return; }
  userProfile = profile;
  familyId = profile.family_id;
}

function appendMessage(msg) {
  const div = document.createElement('div');
  div.className = 'chat-message' + (msg.user_id === userProfile.id ? ' me' : '');
  div.innerHTML = `<span class="chat-user">${msg.user_name || 'Someone'}:</span> <span class="chat-text">${msg.text}</span>
    <span class="chat-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadMessages() {
  if (!familyId) return;
  const { data: messages } = await supabase
    .from('family_chat')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })
    .limit(100);
  chatMessages.innerHTML = '';
  (messages || []).forEach(appendMessage);
}

async function sendMessage(text) {
  if (!text.trim()) return;
  // Insert message for the whole family (all users with this family_id will see it)
  await supabase.from('family_chat').insert([{
    family_id: familyId,
    user_id: userProfile.id,
    user_name: userProfile.name,
    text: text.trim()
  }]);
}

chatForm.onsubmit = async function(e) {
  e.preventDefault();
  const text = chatInput.value;
  chatInput.value = '';
  await sendMessage(text);
  // Don't reload messages here; real-time will handle it
};

async function main() {
  await loadProfile();
  await loadMessages();

  // Real-time updates for the whole family
  supabase.channel('family_chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_chat', filter: `family_id=eq.${familyId}` }, payload => {
      appendMessage(payload.new);
    })
    .subscribe();
}

main();