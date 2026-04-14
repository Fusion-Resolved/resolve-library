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
        
        window.supabaseClient = window._supabase;
        
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
   SIDEBAR POPULATION — Email + Auth Button
   ============================================================ */

async function updateSidebarUserEmail(user) {
  const emailEl = document.getElementById('sidebar-user-email');
  const authPortal = document.getElementById('sidebar-auth-portal');
  
  // Update email display
  if (emailEl) {
    if (user && user.email) {
      emailEl.textContent = user.email;
      emailEl.style.color = 'rgba(244,244,251,0.85)';
    } else {
      emailEl.textContent = 'Not signed in';
      emailEl.style.color = 'rgba(143,143,168,0.5)';
    }
  }
  
  // Update auth portal (Sign Out OR Sign In/Up)
  if (authPortal) {
    if (user) {
      // LOGGED IN: Show Sign Out button (absolute last item)
      authPortal.innerHTML = `
        <button class="nav-item" onclick="handleSignOut()" style="display:flex;align-items:center;gap:12px;padding:10px 16px;margin:0 8px;border-radius:10px;transition:all 0.15s;color:rgba(240,96,96,0.7);border:none;background:transparent;width:calc(100% - 16px);text-align:left;cursor:pointer;">
          <span style="display:flex;align-items:center;opacity:0.7;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span style="font-family:var(--font-body);font-size:13px;font-weight:500;">Sign Out</span>
        </button>
      `;
    } else {
      // LOGGED OUT: Show Sign In / Sign Up link (absolute last item)
      authPortal.innerHTML = `
        <a href="login.html" class="nav-item" style="display:flex;align-items:center;gap:12px;padding:10px 16px;margin:0 8px;border-radius:10px;transition:all 0.15s;color:rgba(244,244,251,0.7);text-decoration:none;">
          <span style="display:flex;align-items:center;opacity:0.7;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          </span>
          <span style="font-family:var(--font-body);font-size:13px;font-weight:500;">Sign In / Sign Up</span>
        </a>
      `;
    }
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
