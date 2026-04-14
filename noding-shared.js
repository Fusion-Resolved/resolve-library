/* ============================================================
   noding-shared.js — THE CANONICAL SYSTEM BRAIN
   Logic for Sidebar, Modals, Notes, and Settings Navigation.
   ============================================================ */

/** ── 1. SIDEBAR & NAVIGATION ── **/

window.shOpenSidebar = function () {
  // Support both ID conventions across the app:
  //   index.html  → sh-sidebar / sh-sidebar-overlay
  //   effects.html and future pages → sh-sb / sh-sb-ov
  const sb = document.getElementById('sh-sidebar') || document.getElementById('sh-sb');
  const ov = document.getElementById('sh-sidebar-overlay') || document.getElementById('sh-sb-ov');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Always refresh auth state when the drawer opens
  if (typeof window.shRenderSidebarAuth === 'function') window.shRenderSidebarAuth();
};

window.shCloseSidebar = function () {
  const sb = document.getElementById('sh-sidebar') || document.getElementById('sh-sb');
  const ov = document.getElementById('sh-sidebar-overlay') || document.getElementById('sh-sb-ov');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
};

/** ── 1a. NAVIGATION MAP & SIDEBAR INJECTION ── **/

/**
 * Global navigation map for main app pages ONLY
 * Used by shSetActiveNav to determine active state
 * STRICT: Only primary navigation links (no settings sheet tabs)
 */
window.navMap = {
  'index.html': { name: 'Home', icon: 'home' },
  'home.html': { name: 'Home', icon: 'home', alias: 'index.html' },
  'effects.html': { name: 'Effects', icon: 'grid' },
  'nodegraph.html': { name: 'Node Graph', icon: 'git-branch' },
  'library.html': { name: 'Library', icon: 'layers' },
  'community.html': { name: 'Community', icon: 'users' }
};

/**
 * SVG icon collection for GLOBAL navigation ONLY
 * STRICT: No Settings Sheet tab icons here (those are separate)
 */
window.navIcons = {
  home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  grid: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  'git-branch': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
  layers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 4 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
};

/**
 * Inject the canonical sidebar HTML into the page.
 *
 * STRICT STRUCTURE (nothing may appear after the auth portal):
 *   sh-sb-head   — title + close button
 *   sh-sb-sec    — Navigate: exactly 5 links
 *   sh-sb-sec    — Account: email pill → Settings → #sidebar-auth-portal
 *
 * Targets #sh-sidebar (index.html) or #sh-sb (effects.html / future pages).
 * The auto-init listener below calls this automatically on DOMContentLoaded.
 *
 * @param {string} [currentPage] - Filename e.g. 'index.html'. Auto-detected if omitted.
 */
/** ── 1. THE ARCHITECT: Injects the layout and links ── **/
window.shInjectSidebar = function (currentPage) {
  const sidebar = document.getElementById('sh-sidebar') || document.getElementById('sh-sb');
  if (!sidebar) return;

  const pageName = currentPage || window.location.pathname.split('/').pop() || 'index.html';

  const ICON = {
    home: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    effects: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    nodegraph: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M8 5.5h8M5.5 8v8M19 8v3a2 2 0 0 1-2 2h-3"/></svg>',
    library: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h4m3-7h-4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/></svg>',
    community: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    settings: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9"/></svg>',
    profile: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    folder: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
  };

  const NAV = [
    { href: 'index.html',     label: 'Home',       icon: ICON.home,      aliases: ['home.html'] },
    { href: 'effects.html',   label: 'Effects',    icon: ICON.effects,   aliases: [] },
    { href: 'nodegraph.html', label: 'Node Graph', icon: ICON.nodegraph, aliases: ['nodes.html'] },
    { href: 'library.html',   label: 'Library',    icon: ICON.library,   aliases: [] },
    { href: 'community.html', label: 'Community',  icon: ICON.community, aliases: [] },
  ];

  const isNavActive = (item) => [item.href, ...item.aliases].some(p => pageName === p || pageName.endsWith('/' + p));

  const navLinks = NAV.map((item) => `
    <a class="sh-sb-item${isNavActive(item) ? ' active' : ''}" href="${item.href}" data-page="${item.href}">
      ${item.icon}${item.label}
    </a>`).join('');

  const isDashboard = pageName === 'dashboard.html';
  const isProfile   = pageName === 'profile.html';
  const isMyEffects = pageName === 'effects.html' && window.location.search.includes('filter=mine');
  const isSettings  = pageName === 'settings.html' || pageName.includes('settings');

  sidebar.innerHTML = `
    <div class="sh-sb-head">
      <span class="sh-sb-title">Noding</span>
      <button class="sh-sb-close" onclick="shCloseSidebar()" aria-label="Close menu">&#x2715;</button>
    </div>

    <div class="sh-sb-sec">
      <div class="sh-sb-lbl">Navigate</div>
      ${navLinks}
    </div>

    <div class="sh-sb-sec sh-sb-account">
      <div class="sh-sb-lbl">Account</div>

      <div class="sh-sb-email" id="sidebar-email-container" aria-live="polite"></div>

      <a class="sh-sb-item${isDashboard ? ' active' : ''}" href="dashboard.html" data-page="dashboard.html">
        ${ICON.nodegraph} Dashboard
      </a>

      <a class="sh-sb-item${isProfile ? ' active' : ''}" href="profile.html" data-page="profile.html">
        ${ICON.profile} My Profile
      </a>

      <a class="sh-sb-item${isMyEffects ? ' active' : ''}" href="effects.html?filter=mine" data-page="my-effects">
        ${ICON.folder} My Effects
      </a>

      <a class="sh-sb-item${isSettings ? ' active' : ''}" href="settings.html" data-page="settings.html">
        ${ICON.settings} Settings
      </a>

      <div id="sidebar-auth-portal"></div>
    </div>
  `;

  sidebar.style.display = 'flex';
  sidebar.style.flexDirection = 'column';

  // ── IMPORTANT: Trigger the specialist to fill the user info slots ──
  window.shRenderSidebarAuth();
};


/** ── 2. THE SPECIALIST: Fills the user info slots (Avatar, Username, etc.) ── **/
window.shRenderSidebarAuth = function () {
  const emailContainer = document.getElementById('sidebar-email-container');
  const portal = document.getElementById('sidebar-auth-portal');
  if (!portal || !emailContainer) return;

  // 1. Resolve user from global state or storage
  let user = window.__nodingUser || null;
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem('rl-auth-user') || 'null');
    } catch (_) {}
  }

  if (user) {
    // ── LOGGED IN ──────────────────────────────────────────────────────────
    const email = user.email;
    const username = user.user_metadata?.full_name || user.email.split('@')[0] || 'User';
    const avatar = user.user_metadata?.avatar_url || '';

    // Inject the "User Pill" (Avatar + Username)
    emailContainer.innerHTML = `
      <div class="sh-sb-user-pill">
        <div class="sh-sb-avatar">
          ${avatar 
            ? `<img src="${avatar}" alt="Profile">` 
            : `<div class="sh-sb-avatar-initial">${username.charAt(0).toUpperCase()}</div>`
          }
        </div>
        <div class="sh-sb-user-info">
          <span class="sh-sb-username">${username}</span>
          <span class="sh-sb-user-email">${email}</span>
        </div>
      </div>
    `;

    portal.innerHTML = `
      <button class="sh-sb-item sh-sb-signout" onclick="window.shSidebarSignOut()">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    `;
  } else {
    // ── LOGGED OUT ─────────────────────────────────────────────────────────
    emailContainer.innerHTML = `<span id="sidebar-user-email">Not signed in</span>`;
    portal.innerHTML = `
      <a class="sh-sb-item" href="login.html">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Sign In
      </a>
      <a class="sh-sb-item sh-sb-signup" href="login.html?mode=signup">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        Sign Up
      </a>
    `;
  }
};

/**
 * Render (or re-render) only the auth portion of the sidebar.
 *
 * Reads auth state from:
 *   1. window.__nodingUser   — set by auth.js when Supabase resolves a session
 *   2. localStorage 'rl-auth-user'  — legacy / offline fallback
 *
 * Updates:
 *   #sidebar-user-email   — the muted email pill above Settings
 *   #sidebar-auth-portal  — Sign Out button (logged in)
 *                           OR Sign In + Sign Up links (logged out)
 *
 * INVARIANT: nothing is written outside #sidebar-auth-portal.
 * Called by shInjectSidebar() and shOpenSidebar() automatically.
 * auth.js should also call this from its onAuthStateChange handler.
 */
window.shRenderSidebarAuth = function () {
  const emailSpan = document.getElementById('sidebar-user-email');
  const portal    = document.getElementById('sidebar-auth-portal');
  if (!portal) return; // sidebar not on this page

  // ── Resolve the current user ──
  let user = window.__nodingUser || null;
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem('rl-auth-user') || 'null');
    } catch (_) {}
  }

  // Inline SVGs for auth buttons (self-contained — no dependency on ICON above)
  const SVG_SIGNOUT = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  const SVG_SIGNIN  = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
  const SVG_SIGNUP  = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';

  if (user) {
    // ── LOGGED IN ──────────────────────────────────────────────────────────
    const email = user.email || user.name || 'Signed in';

    if (emailSpan) {
      emailSpan.textContent = email;
      // Tooltip reveals the full address when the pill truncates
      emailSpan.parentElement && (emailSpan.parentElement.title = email);
    }

    // Sign Out is the absolute last element in the sidebar.
    portal.innerHTML = `
      <button class="sh-sb-item sh-sb-signout"
              onclick="window.shSidebarSignOut()"
              aria-label="Sign out of Noding">
        ${SVG_SIGNOUT}
        Sign Out
      </button>
    `;
  } else {
    // ── LOGGED OUT ─────────────────────────────────────────────────────────
    if (emailSpan) {
      emailSpan.textContent = 'Not signed in';
      emailSpan.parentElement && emailSpan.parentElement.removeAttribute('title');
    }

    // Sign In + Sign Up are the absolute last elements in the sidebar.
    portal.innerHTML = `
      <a class="sh-sb-item" href="login.html">
        ${SVG_SIGNIN}
        Sign In
      </a>
      <a class="sh-sb-item sh-sb-signup" href="login.html?mode=signup">
        ${SVG_SIGNUP}
        Sign Up
      </a>
    `;
  }
};

/**
 * Sign out from all auth layers then re-render the sidebar auth section.
 * Handles both Supabase (via auth.js) and the localStorage fallback.
 */
window.shSidebarSignOut = async function () {
  // 1. Supabase sign-out (if auth.js has initialised window.supabase)
  try {
    if (window.supabase && typeof window.supabase.auth?.signOut === 'function') {
      await window.supabase.auth.signOut();
    }
  } catch (e) {
    console.warn('[Noding] Supabase signOut error:', e);
  }

  // 2. Clear localStorage fallback session
  localStorage.removeItem('rl-auth-user');
  window.__nodingUser = null;

  // 3. Refresh sidebar auth UI
  window.shRenderSidebarAuth();

  if (typeof window.toast === 'function') window.toast('Signed out', 'v');
};

/**
 * Set active navigation state for PRIMARY navigation links only.
 * STRICT: Does NOT affect Settings Sheet tabs (.sh-nav class).
 *
 * Works with both legacy .nav-item and the current .sh-sb-item class.
 * Active state is driven entirely by CSS (.sh-sb-item.active) — no inline
 * style overrides are applied, keeping specificity clean.
 *
 * @param {string} pageName - Current page filename (e.g., 'index.html')
 */
window.shSetActiveNav = function (pageName) {
  const currentPage = pageName || window.location.pathname.split('/').pop() || 'index.html';

  // Target whichever sidebar ID this page uses
  const globalSidebar =
    document.getElementById('sh-sidebar') ||
    document.getElementById('sh-sb');
  if (!globalSidebar) return;

  const isSettingsPage =
    currentPage === 'settings.html' || currentPage.includes('settings');

  // Match both class names — .sh-sb-item (current) and .nav-item (legacy)
  globalSidebar.querySelectorAll('.sh-sb-item[data-page], .nav-item[data-page]').forEach(item => {
    const itemPage = item.getAttribute('data-page');
    const href     = item.getAttribute('href') || '';

    let isActive = itemPage === currentPage || href === currentPage;

    // home.html alias → index.html
    if (currentPage === 'home.html' && (itemPage === 'index.html' || href === 'index.html')) {
      isActive = true;
    }
    // nodegraph alias
    if (currentPage === 'nodes.html' && (itemPage === 'nodegraph.html' || href === 'nodegraph.html')) {
      isActive = true;
    }
    // Settings page variants
    if (isSettingsPage && (itemPage === 'settings.html' || href === 'settings.html')) {
      isActive = true;
    }

    // CSS class is the single source of truth for active appearance
    item.classList.toggle('active', isActive);
  });
};

/**
 * Check if Settings link should be visible
 * Settings is always visible, but auth.js may add auth-specific items
 */
window.shCheckSettingsVisibility = function() {
  const settingsLinks = document.querySelectorAll('[data-page="settings.html"], a[href="settings.html"]');
  settingsLinks.forEach(link => {
    // Ensure Settings link is always visible
    link.style.display = 'flex';
  });
};

/** ── 2. QUICK NOTES SYSTEM ── **/

window.shOpenNote = function() {
  const ov = document.getElementById('sh-note-ov');
  if (ov) {
    ov.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Auto-focus the title for speed
    setTimeout(() => {
      const titleInput = document.getElementById('sh-note-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }
};

window.shCloseNote = function() {
  const ov = document.getElementById('sh-note-ov');
  if (ov) {
    ov.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.shSaveNote = function() {
  const t = (document.getElementById('sh-note-title')?.value || '').trim();
  const b = (document.getElementById('sh-note-body')?.value || '').trim();
  
  if (!t && !b) { 
    window.toast('Nothing to save', 'e'); 
    return; 
  }

  const notes = JSON.parse(localStorage.getItem('rl-quick-notes') || '[]');
  notes.push({ 
    id: Date.now().toString(36), 
    title: t, 
    note: b, 
    at: new Date().toISOString() 
  });
  
  // ── STORED XSS WARNING ───────────────────────────────────────────────────
  // Note data is raw user input. It is safe here (stored as JSON string),
  // but it MUST be rendered via .textContent (never .innerHTML or
  // insertAdjacentHTML) wherever notes are displayed in the library or
  // elsewhere. Example of the ONLY safe render pattern:
  //
  //   noteEl.querySelector('.note-title').textContent = note.title;
  //   noteEl.querySelector('.note-body').textContent  = note.note;
  //
  // If you ever need to render markdown/rich text from notes, run the content
  // through a sanitiser (e.g. DOMPurify.sanitize()) BEFORE touching innerHTML.
  // ────────────────────────────────────────────────────────────────────────
  localStorage.setItem('rl-quick-notes', JSON.stringify(notes));
  
  // Cleanup
  if(document.getElementById('sh-note-title')) document.getElementById('sh-note-title').value = '';
  if(document.getElementById('sh-note-body')) document.getElementById('sh-note-body').value = '';
  
  window.shCloseNote();
  window.toast('Note saved to library ✓', 'v');
};

/** ── 3. UNIVERSAL MODALS & UI ── **/

/** Search stub — header button calls this */
window.shOpenSearch = function() {
  window.toast("Search feature coming soon");
};

window.shOpenAddModal = function(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    console.warn(`Noding Error: Modal "${id}" not found.`);
  }
};

window.shCloseModal = function(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
};

window.toast = function(msg, type = 'v') {
  const t = document.getElementById('toast');
  if (t) {
    const d = document.getElementById('toastDot');
    const m = document.getElementById('toastMsg');
    if(d) d.className = `toast-dot ${type}`;
    if(m) m.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  } else {
    // Fallback if toast HTML is missing from the page
    console.log(`[Toast]: ${msg}`);
  }
};

/** ── 4. SETTINGS ENGINE ── **/

// NOTE: goPanel is intentionally NOT defined here.
// settings.html declares its own authoritative goPanel() in its inline script,
// which targets the correct scroll container (.content) for that page's layout.
// Defining it here as well would create a last-write-wins race depending on
// load order, and the shared version's .settings-main scroll target doesn't
// exist on that page. If other pages ever need panel navigation, define a
// page-specific version in their own inline script rather than re-centralising
// it here.

// Tracks if settings have changed without saving
window.markDirty = function() {
  const saveBar = document.getElementById('saveBar');
  if (saveBar) saveBar.classList.add('show');
};

window.discardChanges = function() {
  const saveBar = document.getElementById('saveBar');
  if (saveBar) saveBar.classList.remove('show');
  window.toast('Changes discarded', 'e');
  // Optional: reload page to reset fields
  // location.reload();
};

/** ── 5. FLAT FILE LINK SUPPORT ── **/
// Allows .html links to work normally on GitHub Pages
// Directory-style URLs removed to prevent 404 errors

document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link || !link.getAttribute('href')) return;
  
  const href = link.getAttribute('href');
  
  // Fix legacy "home.html" to index.html
  if (href === 'home.html') {
    e.preventDefault();
    window.location.href = 'index.html';
    return;
  }
  
  // Allow .html links to navigate normally - no redirects needed
  // All internal navigation now uses flat .html file structure
});

/** ── 6. PAGE-SPECIFIC GHOSTS ── **/

// For index.html & library.html
window.openGlobalAdd = function() {
  window.shOpenAddModal('modal-global-add');
};

// For community.html
window.openSubmitModal = function() {
  window.shOpenAddModal('modal-submit-effect');
};

// For videos.html
window.openAddSheet = function() {
  const sheet = document.getElementById('add-video-sheet');
  if (sheet) sheet.classList.add('open');
};

/** ── 4. BENTO CARD MOUSE TRACKING (from source-of-truth.html) ── **/

/**
 * Per-card cursor spotlight — tracks mouse position within each .bento-card
 * and updates --mouse-x / --mouse-y custom properties so the ::before
 * radial-gradient glow follows the cursor.
 */
document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.bento-card');

  cards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      const rect = card.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(2) + '%';
      const yPct = ((e.clientY - rect.top) / rect.height * 100).toFixed(2) + '%';
      card.style.setProperty('--mouse-x', xPct);
      card.style.setProperty('--mouse-y', yPct);
    });
  });
});

/** ═════════════════════════════════════════════════════════════════════════════
    SECTION: GLOBAL MODAL & NAVIGATION LOGIC
    Consolidated from Effect Wizard (5 - noding-add-new-effect_V2.html)
    and Settings Sheet (6 - noding-edit-settings.html)
    Provides: universal modal controls, wizard navigation, tab navigation,
    dirty state management, confirmation dialogs
    ═════════════════════════════════════════════════════════════════════════════ */

/**
 * Global dirty state flag - tracks if user has unsaved changes
 * Used by shCheckDirty() to prevent accidental navigation
 */
window.isDirty = false;

/**
 * Set the global dirty state and update UI indicators
 * @param {boolean} value - true if there are unsaved changes
 */
function shSetDirty(value) {
  window.isDirty = value;
  
  // Update dirty indicators on tabs/nav items
  document.querySelectorAll('.dirty-dot').forEach(function(dot) {
    dot.style.display = value ? 'block' : 'none';
  });
  
  // Show/hide unsaved banner if it exists
  const banner = document.getElementById('unsavedBanner');
  if (banner) {
    banner.classList.toggle('visible', value);
  }
  
  console.log('[Noding] Dirty state:', value);
}

/**
 * Check if there are unsaved changes - call before closing/navigation
 * Returns true if safe to proceed, false if user cancelled
 */
function shCheckDirty() {
  if (!window.isDirty) return true;
  
  const proceed = confirm('You have unsaved changes. Are you sure you want to leave?');
  if (proceed) {
    shSetDirty(false);
  }
  return proceed;
}

/**
 * Open a modal by ID - works for wizards, sheets, confirmations
 * @param {string} id - ID of the overlay element to open
 */
function shOpen(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error('[Noding] shOpen: Element not found:', id);
    return;
  }
  
  el.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Auto-focus first input if it's a wizard/sheet with form
  setTimeout(function() {
    const firstInput = el.querySelector('input:not([type="hidden"]), textarea, select');
    if (firstInput) firstInput.focus();
  }, 100);
  
  console.log('[Noding] Opened:', id);
}

/**
 * Close a modal by ID
 * @param {string} id - ID of the overlay element to close
 */
function shClose(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error('[Noding] shClose: Element not found:', id);
    return;
  }
  
  // Check for unsaved changes first
  if (window.isDirty && !shCheckDirty()) {
    return; // User cancelled
  }
  
  el.classList.remove('active');
  document.body.style.overflow = '';
  console.log('[Noding] Closed:', id);
}

/**
 * Navigate to a specific step in a wizard
 * @param {string} containerId - ID of the wizard panel container
 * @param {number} index - Step index (0-based)
 */
function shGoStep(containerId, index) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[Noding] shGoStep: Container not found:', containerId);
    return;
  }
  
  const panels = container.querySelectorAll('.wiz-panel');
  const indicators = container.querySelectorAll('.step-seg');
  const progressBar = container.querySelector('.wiz-progress-bar');
  
  // Validate index
  if (index < 0 || index >= panels.length) {
    console.error('[Noding] shGoStep: Invalid step index:', index);
    return;
  }
  
  // Update panels
  panels.forEach(function(panel, i) {
    panel.classList.toggle('active', i === index);
  });
  
  // Update step indicators
  indicators.forEach(function(ind, i) {
    ind.classList.remove('active', 'done');
    if (i < index) ind.classList.add('done');
    if (i === index) ind.classList.add('active');
  });
  
  // Update progress bar
  if (progressBar) {
    const progress = ((index + 1) / panels.length * 100).toFixed(1) + '%';
    progressBar.style.width = progress;
  }
  
  // Update buttons visibility
  const btnBack = container.querySelector('.btn-back');
  const btnNext = container.querySelector('.btn-next');
  const btnPublish = container.querySelector('.btn-publish');
  
  if (btnBack) btnBack.style.visibility = index === 0 ? 'hidden' : 'visible';
  if (btnNext) btnNext.style.display = index === panels.length - 1 ? 'none' : 'inline-flex';
  if (btnPublish) btnPublish.style.display = index === panels.length - 1 ? 'inline-flex' : 'none';
  
  console.log('[Noding] Wizard step:', containerId, '→', index);
}

/**
 * Navigate to next step in wizard
 * @param {string} containerId - ID of the wizard panel container
 */
function shNextStep(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const panels = container.querySelectorAll('.wiz-panel');
  let currentIndex = 0;
  
  panels.forEach(function(panel, i) {
    if (panel.classList.contains('active')) currentIndex = i;
  });
  
  if (currentIndex < panels.length - 1) {
    shGoStep(containerId, currentIndex + 1);
  }
}

/**
 * Navigate to previous step in wizard
 * @param {string} containerId - ID of the wizard panel container
 */
function shPrevStep(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const panels = container.querySelectorAll('.wiz-panel');
  let currentIndex = 0;
  
  panels.forEach(function(panel, i) {
    if (panel.classList.contains('active')) currentIndex = i;
  });
  
  if (currentIndex > 0) {
    shGoStep(containerId, currentIndex - 1);
  }
}

/**
 * Switch to a specific tab in a settings sheet
 * @param {string} containerId - ID of the settings sheet container
 * @param {string} tabId - ID of the tab panel to activate
 */
function shGoTab(containerId, tabId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[Noding] shGoTab: Container not found:', containerId);
    return;
  }
  
  // Update sidebar nav items
  const navItems = container.querySelectorAll('.sh-nav-item');
  navItems.forEach(function(item) {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });
  
  // Update tab buttons
  const tabBtns = container.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  // Update tab panels
  const panels = container.querySelectorAll('.sh-tab-panel');
  panels.forEach(function(panel) {
    panel.classList.toggle('active', panel.id === tabId);
  });
  
  console.log('[Noding] Tab switch:', containerId, '→', tabId);
}

/**
 * Initialize navigation click handlers for a settings sheet
 * Call this once on DOMContentLoaded for each sheet
 * @param {string} containerId - ID of the settings sheet container
 */
function shInitTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Sidebar nav items
  container.querySelectorAll('.sh-nav-item').forEach(function(item) {
    item.addEventListener('click', function() {
      if (window.isDirty && !shCheckDirty()) return;
      shGoTab(containerId, this.dataset.tab);
    });
  });
  
  // Tab buttons
  container.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (window.isDirty && !shCheckDirty()) return;
      shGoTab(containerId, this.dataset.tab);
    });
  });
}

/**
 * Show a confirmation dialog
 * @param {Object} options - Confirmation options
 * @param {string} options.title - Dialog title
 * @param {string} options.text - Dialog body text
 * @param {string} options.type - 'warning' or 'danger'
 * @param {string} options.confirmText - Text for confirm button
 * @param {Function} options.onConfirm - Callback when confirmed
 * @param {Function} options.onCancel - Callback when cancelled
 */
function shConfirm(options) {
  const ov = document.getElementById('confirmOverlay') || createConfirmOverlay();
  const box = ov.querySelector('.confirm-box');
  
  // Set content
  box.querySelector('.confirm-title').textContent = options.title || 'Confirm';
  box.querySelector('.confirm-text').textContent = options.text || 'Are you sure?';
  
  // Set type (warning/danger)
  box.className = 'confirm-box ' + (options.type || 'warning');
  
  // Set button text
  const btnConfirm = box.querySelector('.btn-confirm');
  if (btnConfirm) btnConfirm.textContent = options.confirmText || 'Confirm';
  
  // Store callbacks
  ov._onConfirm = options.onConfirm || function() {};
  ov._onCancel = options.onCancel || function() {};
  
  shOpen('confirmOverlay');
}

/**
 * Create default confirm overlay if it doesn't exist
 */
function createConfirmOverlay() {
  const ov = document.createElement('div');
  ov.id = 'confirmOverlay';
  ov.className = 'confirm-ov';
  ov.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon">!</div>
      <div class="confirm-title">Confirm</div>
      <div class="confirm-text">Are you sure?</div>
      <div class="confirm-actions">
        <button class="btn btn-secondary btn-cancel">Cancel</button>
        <button class="btn btn-danger btn-confirm">Confirm</button>
      </div>
    </div>
  `;
  
  // Add click handlers
  ov.querySelector('.btn-cancel').addEventListener('click', function() {
    shClose('confirmOverlay');
    if (ov._onCancel) ov._onCancel();
  });
  
  ov.querySelector('.btn-confirm').addEventListener('click', function() {
    shClose('confirmOverlay');
    if (ov._onConfirm) ov._onConfirm();
  });
  
  // Close on overlay click
  ov.addEventListener('click', function(e) {
    if (e.target === ov) {
      shClose('confirmOverlay');
      if (ov._onCancel) ov._onCancel();
    }
  });
  
  document.body.appendChild(ov);
  return ov;
}

/**
 * Auto-initialize common patterns on DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', function() {
  
  // Close overlays on backdrop click
  document.querySelectorAll('.sheet-ov, .confirm-ov').forEach(function(ov) {
    ov.addEventListener('click', function(e) {
      if (e.target === ov) {
        const id = ov.id;
        if (id && !ov.classList.contains('ov-del')) {
          shClose(id);
        }
      }
    });
  });
  
  // Escape key to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const activeOv = document.querySelector('.sheet-ov.active, .confirm-ov.active');
      if (activeOv && !activeOv.classList.contains('ov-del')) {
        shClose(activeOv.id);
      }
    }
  });
  
  // Form input tracking for dirty state
  document.querySelectorAll('input, textarea, select').forEach(function(input) {
    input.addEventListener('change', function() {
      shSetDirty(true);
    });
    input.addEventListener('input', function() {
      // Debounced dirty flag for typing
      clearTimeout(input._dirtyTimer);
      input._dirtyTimer = setTimeout(function() {
        shSetDirty(true);
      }, 500);
    });
  });
  
  console.log('[Noding] Modal & Navigation system initialized');
});

/**
 * Auto-initialize sidebar navigation on DOMContentLoaded.
 * Works with both #sh-sidebar (index.html) and #sh-sb (effects.html / future pages).
 * With `defer` on the script tags this fires after HTML is parsed but before
 * the user can interact, so no race conditions with onclick attributes.
 */
document.addEventListener('DOMContentLoaded', function () {
  // Drain any calls that were queued by the inline safety shim before this
  // script loaded (covers the edge case of an extremely fast user interaction
  // on a slow connection).
  if (typeof window.__shDrainStubs === 'function') {
    window.__shDrainStubs([
      'shOpenSidebar', 'shCloseSidebar',
      'shOpenNote', 'shCloseNote', 'shSaveNote',
      'shOpenSearch', 'toast'
    ]);
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // Support both sidebar ID conventions
  const sidebar =
    document.getElementById('sh-sidebar') ||
    document.getElementById('sh-sb');

  if (sidebar) {
    window.shInjectSidebar(currentPage);
    window.shSetActiveNav(currentPage);
    console.log('[Noding] Sidebar initialized for:', currentPage);
  }
});

/** End of Global Modal & Navigation Logic */
