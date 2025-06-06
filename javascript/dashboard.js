  // Show loader for 3 seconds, then hide
  window.addEventListener('DOMContentLoaded', function() {
    const loader = document.querySelector('.loader');
    if (loader) {
      loader.style.display = 'block';
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => loader.style.display = 'none', 400);
      }, 3000);
    }
  });
  // --- Iframe Navigation ---
  function updateHeaderVisibility() {
    const iframe = document.getElementById('iframeViewer');
    const header = document.getElementById('mainHeader');
    if (iframe && iframe.style.display !== 'none') {
      header.style.display = 'none';
    } else {
      header.style.display = '';
    }
  }

  function openInIframe(url) {
    const iframe = document.getElementById('iframeViewer');
    const mainContent = document.getElementById('mainContent');
    iframe.src = url;
    iframe.style.display = 'block';
    mainContent.style.display = 'none';
    updateHeaderVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showDashboard() {
    const iframe = document.getElementById('iframeViewer');
    const mainContent = document.getElementById('mainContent');
    iframe.style.display = 'none';
    iframe.src = '';
    mainContent.style.display = 'flex';
    updateHeaderVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Sidebar nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const useIframe = this.getAttribute('data-iframe') === 'true';
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      if (useIframe) {
        e.preventDefault();
        openInIframe(this.getAttribute('href'));
      } else {
        e.preventDefault();
        showDashboard();
      }
    });
  });
  // Widget links
  document.querySelectorAll('.iframe-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      openInIframe(this.getAttribute('href'));
    });
  });

  // --- Supabase Setup ---
  const SUPABASE_URL = "https://qfgmcnbqhhelrdxvdrdb.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21jbmJxaGhlbHJkeHZkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTY2OTgsImV4cCI6MjA2MzY5MjY5OH0.OZhA0jmUmGcQ5ZJs3gxy99blGsz7YyRJyBfiHDDAWIc";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- Auth Check & Display Family Code ---
  async function checkAuthAndDisplay() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      openInIframe('/signin');
      return;
    }
    displayFamilyCode(user);
  }

  // --- Display Family Code ---
  async function displayFamilyCode(user) {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
    if (!profile || !profile.family_id) return;
    const { data: family } = await supabase.from('families').select('code').eq('id', profile.family_id).single();
    if (family && family.code) {
      let codeDiv = document.getElementById('familyCodeDisplay');
      codeDiv.innerHTML = `Your Family Code: <span style="color:#2563eb;font-weight:700;font-size:1.3em;">${family.code}</span>`;
    }
  }

  // Run on load
  checkAuthAndDisplay();
  window.addEventListener('DOMContentLoaded', updateHeaderVisibility);
// Mobile nav logic
  const sidebar = document.getElementById('sidebar');
  const navToggle = document.getElementById('mobileNavToggle');
  const navOverlay = document.getElementById('mobileNavOverlay');

  function openMobileNav() {
    sidebar.classList.add('open');
    navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    sidebar.classList.remove('open');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', openMobileNav);
  navOverlay.addEventListener('click', closeMobileNav);

  // Close nav on link click (mobile only)
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeMobileNav();
    });
  });

  // Optional: close nav on resize if desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMobileNav();
  });
