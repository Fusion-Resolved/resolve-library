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

    // Update ALL sidebar auth portals on EVERY state change
    updateAllSidebarPortals(user);

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
    await updateAllSidebarPortals(currentUser);
  } catch (err) {
    console.error("[auth.js] Failed to get initial session:", err);
    await updateAllSidebarPortals(null);
  }
}

/* ============================================================
   SIDEBAR PORTAL INJECTION — SINGLE SOURCE OF TRUTH
   ============================================================ */

async function updateAllSidebarPortals(user) {
  // Find ALL portal containers across the entire page
  const portals = document.querySelectorAll('#sidebar-auth-portal, #sb-auth-group');

  // Fetch profile data if user is logged in
  let profile = null;
  if (user && window._supabase) {
    try {
      const { data, error } = await window._supabase
        .from('profiles')
        .select('avatar_url, avatar_pos')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        profile = data;
      }
    } catch (err) {
      console.log("[auth.js] Could not fetch profile for sidebar:", err);
    }
  }

  portals.forEach(portal => {
    if (!portal) return;

    if (user) {
      // LOGGED IN: Show user info + Sign Out
      const email = user.email || 'User';
      const emailInitial = email.charAt(0).toUpperCase();
      
      // Build avatar HTML - image if available, otherwise initial
      let avatarHtml = '';
      if (profile && profile.avatar_url) {
        const avatarUrlWithCache = profile.avatar_url + '?t=' + new Date().getTime();
        let bgSize = 'cover';
        let bgPos = 'center';
        
        // Apply saved position if exists
        if (profile.avatar_pos) {
          const posParts = profile.avatar_pos.split(',');
          if (posParts.length === 3) {
            const x = parseInt(posParts[0], 10) || 0;
            const y = parseInt(posParts[1], 10) || 0;
            const zoom = parseInt(posParts[2], 10) || 100;
            bgSize = zoom + '%';
            bgPos = 'calc(50% + ' + x + 'px) calc(50% + ' + y + 'px)';
          }
        }
        
        avatarHtml = `<div style="width:32px;height:32px;border-radius:50%;background-image:url('${avatarUrlWithCache}');background-size:${bgSize};background-position:${bgPos};background-repeat:no-repeat;flex-shrink:0;border:1px solid rgba(108,123,255,0.3);"></div>`;
      } else {
        // Fallback to initial letter
        avatarHtml = `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6c7bff 0%,#4451d4 100%);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;color:#fff;flex-shrink:0;">${escapeHtml(emailInitial)}</div>`;
      }

      portal.innerHTML = `
        <div class="sh-sb-item" style="cursor:default;opacity:1;">
          ${avatarHtml}
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:500;color:var(--tp,#f4f4fb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(email)}</div>
            <div style="font-size:10px;color:var(--ts,#8f8fa8);">Pro Member</div>
          </div>
        </div>
        <a href="settings.html" class="sh-sb-item">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </a>
        <button class="sh-sb-item" onclick="handleSignOut()" style="width:100%;text-align:left;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      `;
    } else {
      // LOGGED OUT: Show Login / Sign Up link ONLY
      portal.innerHTML = `
        <a href="login.html" class="sh-nav-link" style="display:flex;align-items:center;gap:10px;padding:10px 14px;color:var(--tp,#f4f4fb);text-decoration:none;transition:all 0.15s;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Login / Sign Up
        </a>
      `;
    }
  });
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
