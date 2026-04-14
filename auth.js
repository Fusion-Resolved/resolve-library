/* ============================================================
   auth.js — Noding Authentication System
   ============================================================ */

// Supabase configuration — REAL API KEYS
const SUPABASE_URL = 'https://nestqkrkxwrptoejlvno.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hAmhQaWOO0w4f-O8EEPxlg_0cw_i1m4';

/* ============================================================
   SAFE INITIALIZATION — Wait for Supabase Library
   ============================================================ */

function initSupabase() {
  // Check if supabase library is loaded
  if (typeof supabase === 'undefined') {
    console.error("[auth.js] Supabase library not loaded yet. Retrying in 100ms...");
    setTimeout(initSupabase, 100);
    return;
  }

  // Initialize only once
  if (!window._supabase) {
    try {
      window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("[auth.js] Supabase client initialized successfully");
    } catch (err) {
      console.error("[auth.js] Failed to initialize Supabase:", err);
      return;
    }
  }

  // Start auth system
  startAuthSystem();
}

/* ============================================================
   AUTH STATE MANAGEMENT — SOURCE OF TRUTH
   ============================================================ */

let currentUser = null;

function startAuthSystem() {
  // Listen for auth state changes — THIS IS THE SOURCE OF TRUTH
  window._supabase.auth.onAuthStateChange(function (event, session) {
    const user = session ? session.user : null;
    currentUser = user;

    // Dispatch custom event for all pages
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { event: event, session: session, user: user }
    }));

    // Update user email in sidebar
    updateSidebarUserEmail(user);

    // Handle specific events
    if (event === 'SIGNED_OUT') {
      currentUser = null;
    }
  });

  // Initial session check
  checkInitialSession();
}

async function checkInitialSession() {
  try {
    const { data: { session } } = await window._supabase.auth.getSession();
    currentUser = session ? session.user : null;
    await updateSidebarUserEmail(currentUser);
  } catch (err) {
    console.error("[auth.js] Failed to get initial session:", err);
    await updateSidebarUserEmail(null);
  }
}

/* ============================================================
   SIDEBAR USER EMAIL — Populates the email in Account section
   ============================================================ */

async function updateSidebarUserEmail(user) {
  const emailEl = document.getElementById('sidebar-user-email');
  if (!emailEl) return;

  if (user && user.email) {
    emailEl.textContent = user.email;
    emailEl.style.color = 'rgba(244,244,251,0.8)';
  } else {
    emailEl.textContent = 'Not signed in';
    emailEl.style.color = 'rgba(143,143,168,0.6)';
  }
}

/* ============================================================
   AUTH ACTIONS
   ============================================================ */

// Global sign out handler — HARD REDIRECT
window.handleSignOut = async function() {
  try {
    if (window._supabase) {
      await window._supabase.auth.signOut();
    }
  } catch (err) {
    console.error('[auth.js] Sign out error:', err);
  } finally {
    // ALWAYS redirect to index.html — hard redirect to clear session state
    window.location.href = 'index.html';
  }
};

// Open auth modal (used by settings page when signed out)
window.openAuthModal = function() {
  window.location.href = 'login.html';
};

// Initialize auth system when DOM is ready AND supabase is available
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  // DOM already loaded, start immediately
  initSupabase();
}
