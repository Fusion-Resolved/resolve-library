/* ============================================================
   auth.js — Centralized Supabase Auth for Resolve Library
   ============================================================
   HOW TO USE IN ANY PAGE:
     1. Load Supabase CDN first.
     2. Load this file second (before your page script).
     3. Add <div id="auth-btn-container"></div> in your header.
     4. Listen for 'authStateChanged' to re-render your page.
   ============================================================ */

// ── 1. SUPABASE INIT ─────────────────────────────────────────────────────────
// Replace the two placeholder strings with your project values.
// Every page shares this single instance via window._supabase.

const _SB_URL = 'https://nestqkrkxwrptoejlvno.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc3Rxa3JreHdycHRvZWpsdm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQyODksImV4cCI6MjA5MDY0MDI4OX0.CjQNl46EE8eJy8TUZNWNIM3mhxmV-tuf3EVK3Y2Re8s';

window._supabase = window.supabase.createClient(_SB_URL, _SB_KEY);

// ── 2. GLOBAL STATE ───────────────────────────────────────────────────────────
// Any page script can read window.CURRENT_USER_ID to know who is logged in.
// null  → no user logged in.
// string → the logged-in user's UUID.

window.CURRENT_USER_ID = null;

// ── 3. INTERNAL HELPERS ───────────────────────────────────────────────────────

/** Safely escape HTML to prevent XSS in injected strings. */
function _authEsc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Show a brief status message inside the modal. */
function _authSetStatus(msg, isError) {
  var el = document.getElementById('_auth-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--danger, #f06060)' : 'var(--accent, #c8f060)';
  el.style.opacity = '1';
}

/** Update the header button and fire authStateChanged. */
function _authSyncUI(user) {
  window.CURRENT_USER_ID = user ? user.id : null;

  // ── Header button ─────────────────────────────────────────────────────────
  var container = document.getElementById('auth-btn-container');
  if (container) {
    if (user) {
      var initial = _authEsc((user.email || 'U')[0].toUpperCase());
      container.innerHTML =
        '<button onclick="window.handleSignOut()" style="' +
          'display:inline-flex;align-items:center;gap:7px;' +
          'background:transparent;border:1px solid var(--border2);' +
          'border-radius:999px;padding:5px 12px 5px 6px;' +
          'color:var(--text2);font-family:var(--font-body);font-size:12px;' +
          'cursor:pointer;transition:all .15s;' +
        '" onmouseover="this.style.borderColor=\'var(--border3)\';this.style.color=\'var(--text)\'" ' +
           'onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text2)\'">' +
          '<span style="width:22px;height:22px;border-radius:50%;background:var(--accent);' +
            'display:inline-flex;align-items:center;justify-content:center;' +
            'font-size:11px;font-weight:700;color:#070708;">' + initial + '</span>' +
          'Sign Out' +
        '</button>';
    } else {
      container.innerHTML =
        '<button onclick="window.openAuthModal()" style="' +
          'background:transparent;border:1px solid var(--border2);' +
          'border-radius:999px;padding:6px 14px;' +
          'color:var(--text2);font-family:var(--font-body);font-size:12px;' +
          'cursor:pointer;transition:all .15s;' +
        '" onmouseover="this.style.borderColor=\'var(--border3)\';this.style.color=\'var(--text)\'" ' +
           'onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text2)\'">' +
          'Log In' +
        '</button>';
    }
  }

  // ── Sidebar auth widget (existing sh-auth-wrap, present in all pages) ─────
  var wrap = document.getElementById('sh-auth-wrap');
  if (wrap) {
    if (user) {
      var avatarInitial = _authEsc((user.email || 'U')[0].toUpperCase());
      wrap.innerHTML =
        '<div style="display:flex;align-items:center;gap:9px">' +
          '<div class="sh-auth-avatar">' + avatarInitial + '</div>' +
          '<div style="font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            _authEsc(user.email || 'Signed in') +
          '</div>' +
        '</div>' +
        '<button class="sh-auth-out" onclick="window.handleSignOut()">Sign out</button>';
    } else {
      wrap.innerHTML =
        '<div class="sh-auth-title">Sign in</div>' +
        '<div class="sh-auth-sub">Access your library anywhere.</div>' +
        '<div class="sh-auth-field"><label>Email</label>' +
          '<input id="sh-auth-email-q" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
        '<div class="sh-auth-field"><label>Password</label>' +
          '<input id="sh-auth-pw-q" type="password" placeholder="••••••••" autocomplete="current-password"></div>' +
        '<button class="sh-auth-submit" onclick="window.handleSignIn()">Sign In</button>' +
        '<div class="sh-auth-switch">No account? ' +
          '<button onclick="window.openAuthModal(\'up\')">Sign up</button>' +
        '</div>';
    }
  }

  // ── Notify the rest of the page ───────────────────────────────────────────
  window.dispatchEvent(new Event('authStateChanged'));
}

// ── 4. MODAL INJECTION ────────────────────────────────────────────────────────
// Injected once on DOMContentLoaded. Uses CSS variables from the host page
// so it automatically inherits whatever theme the user has saved.

function _authInjectModal() {
  if (document.getElementById('_auth-modal-overlay')) return; // already injected

  var overlay = document.createElement('div');
  overlay.id = '_auth-modal-overlay';
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Sign in or create account');

  overlay.style.cssText = [
    'display:none',
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.75)',
    'z-index:9999',
    'align-items:center',
    'justify-content:center',
    'padding:1rem',
    'backdrop-filter:blur(8px)',
    '-webkit-backdrop-filter:blur(8px)',
  ].join(';');

  overlay.innerHTML = [
    '<div id="_auth-modal" style="',
      'background:var(--surface,#101013);',
      'border:1px solid var(--border2,rgba(255,255,255,.10));',
      'border-radius:18px;',
      'width:100%;',
      'max-width:380px;',
      'box-shadow:0 8px 40px rgba(0,0,0,.7);',
      'animation:_authIn .18s ease;',
      'overflow:hidden;',
    '">',

    /* Animation */
    '<style>',
      '@keyframes _authIn{from{transform:scale(.96) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}',
    '</style>',

    /* Header */
    '<div style="',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:1.1rem 1.25rem;',
      'border-bottom:1px solid var(--border,rgba(255,255,255,.06));',
    '">',
      '<span id="_auth-modal-title" style="',
        'font-family:var(--font-head,sans-serif);',
        'font-size:1rem;font-weight:700;',
        'color:var(--text,#edeae2);',
      '">Sign In</span>',
      '<button onclick="window.closeAuthModal()" style="',
        'background:var(--surface2,#18181d);',
        'border:1px solid var(--border2,rgba(255,255,255,.10));',
        'border-radius:50%;width:28px;height:28px;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:13px;cursor:pointer;',
        'color:var(--text2,#7c7874);',
      '">✕</button>',
    '</div>',

    /* Body */
    '<div style="padding:1.25rem;">',

      /* Status line */
      '<div id="_auth-status" style="',
        'min-height:18px;font-size:12px;font-family:var(--font-mono,monospace);',
        'margin-bottom:10px;opacity:0;transition:opacity .2s;',
      '"></div>',

      /* Email field */
      '<div style="margin-bottom:10px;">',
        '<label style="',
          'display:block;font-size:10px;font-family:var(--font-mono,monospace);',
          'text-transform:uppercase;letter-spacing:.07em;',
          'color:var(--text2,#7c7874);margin-bottom:5px;',
        '">Email</label>',
        '<input id="_auth-email" type="email" placeholder="you@example.com" autocomplete="email" style="',
          'width:100%;background:var(--surface2,#18181d);',
          'border:1px solid var(--border2,rgba(255,255,255,.10));',
          'border-radius:9px;padding:9px 12px;',
          'color:var(--text,#edeae2);',
          'font-family:var(--font-body,sans-serif);font-size:14px;',
          'outline:none;box-sizing:border-box;',
        '">',
      '</div>',

      /* Password field */
      '<div style="margin-bottom:16px;">',
        '<label style="',
          'display:block;font-size:10px;font-family:var(--font-mono,monospace);',
          'text-transform:uppercase;letter-spacing:.07em;',
          'color:var(--text2,#7c7874);margin-bottom:5px;',
        '">Password</label>',
        '<input id="_auth-password" type="password" placeholder="••••••••" autocomplete="current-password" style="',
          'width:100%;background:var(--surface2,#18181d);',
          'border:1px solid var(--border2,rgba(255,255,255,.10));',
          'border-radius:9px;padding:9px 12px;',
          'color:var(--text,#edeae2);',
          'font-family:var(--font-body,sans-serif);font-size:14px;',
          'outline:none;box-sizing:border-box;',
        '">',
      '</div>',

      /* Action buttons */
      '<div style="display:flex;gap:8px;margin-bottom:12px;">',

        /* Log In */
        '<button id="_auth-signin-btn" onclick="window.handleSignIn()" style="',
          'flex:1;background:var(--accent,#c8f060);color:#070708;',
          'border:none;border-radius:8px;',
          'padding:10px;font-family:var(--font-body,sans-serif);',
          'font-size:13px;font-weight:600;cursor:pointer;',
        '">Log In</button>',

        /* Sign Up */
        '<button id="_auth-signup-btn" onclick="window.handleSignUp()" style="',
          'flex:1;background:var(--surface2,#18181d);color:var(--text2,#7c7874);',
          'border:1px solid var(--border2,rgba(255,255,255,.10));border-radius:8px;',
          'padding:10px;font-family:var(--font-body,sans-serif);',
          'font-size:13px;cursor:pointer;',
        '">Sign Up</button>',

      '</div>',

      /* Cancel */
      '<button onclick="window.closeAuthModal()" style="',
        'width:100%;background:transparent;border:none;',
        'color:var(--text2,#7c7874);',
        'font-family:var(--font-body,sans-serif);font-size:12px;',
        'cursor:pointer;padding:4px;',
      '">Cancel</button>',

    '</div>', /* /body */
    '</div>', /* /_auth-modal */
  ].join('');

  /* Close on backdrop click */
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) window.closeAuthModal();
  });

  /* Close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeAuthModal();
  });

  document.body.appendChild(overlay);
}

// ── 5. PUBLIC AUTH METHODS ────────────────────────────────────────────────────

/** Open the auth modal. Pass 'up' to default to sign-up mode. */
window.openAuthModal = function (mode) {
  var overlay = document.getElementById('_auth-modal-overlay');
  if (!overlay) return;
  var title = document.getElementById('_auth-modal-title');
  if (title) title.textContent = (mode === 'up') ? 'Create Account' : 'Sign In';
  var status = document.getElementById('_auth-status');
  if (status) { status.textContent = ''; status.style.opacity = '0'; }
  overlay.style.display = 'flex';
  setTimeout(function () {
    var emailEl = document.getElementById('_auth-email');
    if (emailEl) emailEl.focus();
  }, 50);
};

/** Close the auth modal. */
window.closeAuthModal = function () {
  var overlay = document.getElementById('_auth-modal-overlay');
  if (overlay) overlay.style.display = 'none';
};

/** Sign up a new user with email + password. */
window.handleSignUp = async function () {
  var email    = (document.getElementById('_auth-email')    || document.getElementById('sh-auth-email-q'));
  var password = (document.getElementById('_auth-password') || document.getElementById('sh-auth-pw-q'));
  if (!email || !password) return;

  var emailVal = email.value.trim();
  var pwVal    = password.value;

  if (!emailVal || !pwVal) {
    _authSetStatus('Please enter your email and password.', true);
    return;
  }

  _authSetStatus('Creating account…', false);
  try {
    var res = await window._supabase.auth.signUp({ email: emailVal, password: pwVal });
    if (res.error) throw res.error;
    _authSetStatus('Account created! Check your email to confirm.', false);
    setTimeout(window.closeAuthModal, 2500);
  } catch (err) {
    _authSetStatus(err.message || 'Sign-up failed.', true);
  }
};

/** Sign in an existing user with email + password. */
window.handleSignIn = async function () {
  var email    = (document.getElementById('_auth-email')    || document.getElementById('sh-auth-email-q'));
  var password = (document.getElementById('_auth-password') || document.getElementById('sh-auth-pw-q'));
  if (!email || !password) return;

  var emailVal = email.value.trim();
  var pwVal    = password.value;

  if (!emailVal || !pwVal) {
    _authSetStatus('Please enter your email and password.', true);
    return;
  }

  _authSetStatus('Signing in…', false);
  try {
    var res = await window._supabase.auth.signInWithPassword({ email: emailVal, password: pwVal });
    if (res.error) throw res.error;
    _authSyncUI(res.data.user);
    window.closeAuthModal();
  } catch (err) {
    _authSetStatus(err.message || 'Sign-in failed.', true);
  }
};

/** Sign out the current user. */
window.handleSignOut = async function () {
  try {
    await window._supabase.auth.signOut();
  } catch (_) { /* swallow */ }
  _authSyncUI(null);
};

// ── 6. SESSION CHECK + BOOT ───────────────────────────────────────────────────
// Runs on DOMContentLoaded:
//   • Injects the modal into <body>.
//   • Checks for an existing Supabase session (persisted in localStorage).
//   • Populates the header button and sidebar accordingly.
//   • Sets up the Supabase onAuthStateChange listener.

document.addEventListener('DOMContentLoaded', async function () {

  // Inject modal HTML once the DOM exists.
  _authInjectModal();

  // Check for an existing session (e.g. user refreshed the page).
  try {
    var sessionRes = await window._supabase.auth.getSession();
    var user = sessionRes.data && sessionRes.data.session
      ? sessionRes.data.session.user
      : null;
    _authSyncUI(user);
  } catch (_) {
    _authSyncUI(null);
  }

  // Keep in sync with any future Supabase token refreshes or sign-ins
  // triggered from another tab.
  window._supabase.auth.onAuthStateChange(function (_event, session) {
    _authSyncUI(session ? session.user : null);
  });

});
