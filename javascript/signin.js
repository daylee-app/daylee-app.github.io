  // --- Supabase Setup ---
    const SUPABASE_URL = "https://qfgmcnbqhhelrdxvdrdb.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21jbmJxaGhlbHJkeHZkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTY2OTgsImV4cCI6MjA2MzY5MjY5OH0.OZhA0jmUmGcQ5ZJs3gxy99blGsz7YyRJyBfiHDDAWIc";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- Switch Forms ---
  document.getElementById('switchToSignup').onclick = () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = '';
    document.getElementById('switchToSignup').style.display = 'none';
    document.getElementById('switchToLogin').style.display = '';
  };
  document.getElementById('switchToLogin').onclick = () => {
    document.getElementById('loginForm').style.display = '';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('switchToSignup').style.display = '';
    document.getElementById('switchToLogin').style.display = 'none';
  };

  // --- Login ---
  document.getElementById('loginForm').onsubmit = async function(e) {
    e.preventDefault();
    document.getElementById('loginError').textContent = '';
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value,
      password: loginPassword.value
    });
    if (error) {
      document.getElementById('loginError').textContent = error.message;
    } else {
      window.location.href = "";
    }
  };

  // --- Signup ---
  document.getElementById('signupForm').onsubmit = async function(e) {
    e.preventDefault();
    document.getElementById('signupError').textContent = '';
    document.getElementById('signupSuccess').textContent = '';
    const name = signupName.value;
    const email = signupEmail.value;
    const password = signupPassword.value;
    let familyCode = signupFamilyCode.value.trim();
    try {
      let familyId, role;
      if (!familyCode) {
        // Create new family
        familyCode = Math.random().toString().slice(2,12);
        const { data: fam, error: famErr } = await supabase
          .from('families')
          .insert([{ code: familyCode }])
          .select()
          .single();
        if (famErr) throw famErr;
        familyId = fam.id;
        role = "organizer";
      } else {
        // Join existing family
        const { data: fam, error: famErr } = await supabase
          .from('families')
          .select('*')
          .eq('code', familyCode)
          .single();
        if (famErr || !fam) throw new Error("Invalid family code.");
        familyId = fam.id;
        role = "member";
      }
      // Create user
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email, password
      });
      if (signUpErr) throw signUpErr;
      const userId = signUpData.user.id;
      // Insert profile
      const { error: profErr } = await supabase
        .from('profiles')
        .insert([{ id: userId, name, email, family_id: familyId, role }]);
      if (profErr) throw profErr;
      document.getElementById('signupSuccess').textContent = "Signup successful! You can now log in.";
    } catch (err) {
      document.getElementById('signupError').textContent = err.message || err.error_description;
    }
  };
