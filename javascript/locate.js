// --- Supabase Setup ---
    const SUPABASE_URL = "https://qfgmcnbqhhelrdxvdrdb.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21jbmJxaGhlbHJkeHZkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTY2OTgsImV4cCI6MjA2MzY5MjY5OH0.OZhA0jmUmGcQ5ZJs3gxy99blGsz7YyRJyBfiHDDAWIc";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let userLat, userLng, map, userProfile, familyId;
    const status = document.getElementById('locationStatus');
    const mapDiv = document.getElementById('map');
    const resultsList = document.getElementById('results');

    // Get user profile and family
    async function getProfileAndFamily() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { status.textContent = "Please sign in."; return null; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) { status.textContent = "No profile found."; return null; }
      userProfile = profile;
      familyId = profile.family_id;
      return profile;
    }

    // Save user's location to their profile
    async function saveUserLocation(lat, lng) {
      if (!userProfile) return;
      await supabase.from('profiles').update({ lat, lng }).eq('id', userProfile.id);
    }

    // Show all family members' locations on the map
    async function showFamilyLocations() {
      if (!familyId || !map) return;
      const { data: members } = await supabase.from('profiles').select('full_name,lat,lng,id').eq('family_id', familyId);
      members.forEach(m => {
        if (typeof m.lat === 'number' && typeof m.lng === 'number') {
          const marker = L.marker([m.lat, m.lng]).addTo(map);
          marker.bindPopup(`<b>${m.full_name || "Unknown"}</b>${m.id === userProfile.id ? " (You)" : ""}`);
        }
      });
    }

    // Geolocation and map setup
    async function setupMapAndLocations() {
      await getProfileAndFamily();
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async function(pos) {
          userLat = pos.coords.latitude;
          userLng = pos.coords.longitude;
          status.textContent = "You're here!";
          map = L.map('map').setView([userLat, userLng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);
          // Save your location to your profile
          await saveUserLocation(userLat, userLng);
          // Show all family locations
          await showFamilyLocations();
        }, function() {
          status.textContent = "Unable to get your location.";
          mapDiv.style.display = 'none';
        });
      } else {
        status.textContent = "Geolocation is not supported by your browser.";
        mapDiv.style.display = 'none';
      }
    }

    setupMapAndLocations();

    document.getElementById('searchForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const query = encodeURIComponent(document.getElementById('placeQuery').value);
      if (typeof userLat === 'number' && typeof userLng === 'number') {
        status.textContent = "Searching nearby…";
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=10&viewbox=${userLng-0.02},${userLat+0.02},${userLng+0.02},${userLat-0.02}&bounded=1`)
          .then(res => res.json())
          .then(data => {
            resultsList.innerHTML = '';
            if (data.length === 0) {
              status.textContent = "No places found nearby.";
              return;
            }
            status.textContent = `Found ${data.length} places:`;
            data.forEach(place => {
              const li = document.createElement('li');
              li.style.margin = "0.5rem 0";
              li.innerHTML = `<button style="background:#f1f5fd;border:none;padding:0.7rem 1rem;border-radius:8px;cursor:pointer;width:100%;text-align:left;">
                <b>${place.display_name.split(',')[0]}</b><br>
                <span style="font-size:0.95em;color:#555;">${place.display_name}</span>
              </button>`;
              li.querySelector('button').onclick = () => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${place.lat},${place.lon}`;
                window.open(url, '_blank');
              };
              resultsList.appendChild(li);
            });
          })
          .catch(() => {
            status.textContent = "Error searching for places.";
          });
      } else {
        alert('Location not available yet.');
      }
    });