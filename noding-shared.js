/* ============================================================
   noding-shared.js — THE FINAL UNIVERSAL SYSTEM BRAIN
   Includes: Sidebar, Header, Modals, Notes, and Bento Logic.
   ============================================================ */

/** ── 1. SIDEBAR & NAVIGATION ── **/

window.shOpenSidebar = function () {
  const sb = document.getElementById('sh-sidebar') || document.getElementById('sh-sb');
  const ov = document.getElementById('sh-sidebar-overlay') || document.getElementById('sh-sb-ov');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (typeof window.shRenderSidebarAuth === 'function') window.shRenderSidebarAuth();
};

window.shCloseSidebar = function () {
  const sb = document.getElementById('sh-sidebar') || document.getElementById('sh-sb');
  const ov = document.getElementById('sh-sidebar-overlay') || document.getElementById('sh-sb-ov');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
};

/** ── 2. THE ARCHITECT: Master Header Injection ── **/
window.shInjectHeader = function(options = {}) {
  const headerContainer = document.getElementById('master-header');
  if (!headerContainer) return;

  const actionText = options.actionText || "+ Create";
  const actionFunc = options.actionFunc || "openGlobalAdd()";
  const activeId   = options.activeId   || "nav-home";

  headerContainer.innerHTML = `
    <header>
      <a class="logo" href="index.html">
        <span class="brand-text">noding</span><span class="share-dot">.</span>
      </a>

      <div class="nav-center">
        <div class="nav-pill">
          <a class="nav-item ${activeId === 'nav-home' ? 'active' : ''}" id="nav-home" href="index.html">Home</a>
          <a class="nav-item ${activeId === 'nav-effects' ? 'active' : ''}" id="nav-effects" href="effects.html">Effects</a>
          <a class="nav-item ${activeId === 'nav-nodes' ? 'active' : ''}" id="nav-nodes" href="nodegraph.html">Node Graph</a>
          <a class="nav-item ${activeId === 'nav-library' ? 'active' : ''}" id="nav-library" href="library.html">Library</a>
          <a class="nav-item ${activeId === 'nav-community' ? 'active' : ''}" id="nav-community" href="community.html">Community</a>
        </div>
      </div>

      <div class="sh-hdr-right">
        <button class="sh-icon-btn" onclick="window.shOpenNote()" title="Quick note">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="sh-add-btn" id="master-action-btn" onclick="${actionFunc}">${actionText}</button>
        <button class="sh-hbg-btn" onclick="window.shOpenSidebar()" aria-label="Menu">
          <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </header>
  `;
};

/** ── 3. THE SIDEBAR INJECTOR ── **/
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
    { href: 'index.html', label: 'Home', icon: ICON.home, aliases: ['home.html'] },
    { href: 'effects.html', label: 'Effects', icon: ICON.effects, aliases: [] },
    { href: 'nodegraph.html', label: 'Node Graph', icon: ICON.nodegraph, aliases: ['nodes.html'] },
    { href: 'library.html', label: 'Library', icon: ICON.library, aliases: [] },
    { href: 'community.html', label: 'Community', icon: ICON.community, aliases: [] },
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
      <button class="sh-sb-close" onclick="window.shCloseSidebar()" aria-label="Close menu">&#x2715;</button>
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
  window.shRenderSidebarAuth();
};

/** ── 4. THE SPECIALIST: Auth Renderer ── **/
window.shRenderSidebarAuth = async function () {
  const portal = document.getElementById('sidebar-auth-portal');
  const emailContainer = document.getElementById('sidebar-email-container');
  if (!portal || !emailContainer || !window.supabaseClient) return;

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  const user = session ? session.user : null;

  if (user) {
    const email = user.email;
    const username = user.user_metadata?.full_name || email.split('@')[0] || 'User';
    const avatar = user.user_metadata?.avatar_url || '';

    emailContainer.innerHTML = `
      <div class="sh-sb-user-pill">
        <div class="sh-sb-avatar">
          ${avatar ? `<img src="${avatar}" alt="Profile">` : `<div class="sh-sb-avatar-initial">${username.charAt(0).toUpperCase()}</div>`}
        </div>
        <div class="sh-sb-user-info">
          <span class="sh-sb-username">${username}</span>
          <span class="sh-sb-user-email">${email}</span>
        </div>
      </div>
    `;
    portal.innerHTML = `
      <button class="sh-sb-item sh-sb-signout" onclick="window.handleSignOut()">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    `;
  } else {
    emailContainer.innerHTML = `<span id="sidebar-user-email" style="color:var(--text-muted); font-size:13px; padding-left:12px;">Not signed in</span>`;
    portal.innerHTML = `
      <a class="sh-sb-item" href="login.html">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Sign In / Register
      </a>
    `;
  }
};

/** ── 5. QUICK NOTES SYSTEM ── **/
window.shOpenNote = function() {
  const ov = document.getElementById('sh-note-ov');
  if (ov) {
    ov.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => { document.getElementById('sh-note-title')?.focus(); }, 100);
  }
};

window.shCloseNote = function() {
  const ov = document.getElementById('sh-note-ov');
  if (ov) { ov.style.display = 'none'; document.body.style.overflow = ''; }
};

window.shSaveNote = function() {
  const t = (document.getElementById('sh-note-title')?.value || '').trim();
  const b = (document.getElementById('sh-note-body')?.value || '').trim();
  if (!t && !b) { window.toast('Nothing to save', 'e'); return; }

  const notes = JSON.parse(localStorage.getItem('rl-quick-notes') || '[]');
  notes.push({ id: Date.now().toString(36), title: t, note: b, at: new Date().toISOString() });
  localStorage.setItem('rl-quick-notes', JSON.stringify(notes));
  
  if(document.getElementById('sh-note-title')) document.getElementById('sh-note-title').value = '';
  if(document.getElementById('sh-note-body')) document.getElementById('sh-note-body').value = '';
  window.shCloseNote();
  window.toast('Note saved to library ✓', 'v');
};

/** ── 6. UI UTILITIES & MODALS ── **/
window.shOpenSearch = function() { window.toast("Search feature coming soon"); };
window.shOpenAddModal = function(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
};
window.shCloseModal = function(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
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
  }
};

/** ── 7. DIRTY STATE, WIZARDS & TABS ── **/
window.isDirty = false;

function shSetDirty(value) {
  window.isDirty = value;
  document.querySelectorAll('.dirty-dot').forEach(dot => { dot.style.display = value ? 'block' : 'none'; });
  const banner = document.getElementById('unsavedBanner');
  if (banner) banner.classList.toggle('visible', value);
}

function shCheckDirty() {
  if (!window.isDirty) return true;
  const proceed = confirm('You have unsaved changes. Are you sure you want to leave?');
  if (proceed) shSetDirty(false);
  return proceed;
}

// RESTORED: Powers the "Create Effect" multi-step forms
window.shGoStep = function(id, index) {
  const container = document.getElementById(id);
  if (!container) return;
  const panels = container.querySelectorAll('.wiz-panel');
  panels.forEach((p, i) => p.classList.toggle('active', i === index));
  const progress = container.querySelector('.wiz-progress-bar');
  if (progress) progress.style.width = ((index + 1) / panels.length * 100) + '%';
};

// RESTORED: Powers the tabs in the Settings Sheet
window.shGoTab = function(containerId, tabId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.sh-tab-panel').forEach(p => p.classList.toggle('active', p.id === tabId));
  container.querySelectorAll('.sh-nav-item, .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
};

/** ── 8. BENTO CARD TRACKING ── **/
document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.bento-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(2) + '%';
      const yPct = ((e.clientY - rect.top) / rect.height * 100).toFixed(2) + '%';
      card.style.setProperty('--mouse-x', xPct);
      card.style.setProperty('--mouse-y', yPct);
    });
  });
});

/** ── 9. INITIALIZATION & SYNC ── **/
document.addEventListener('DOMContentLoaded', function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  window.shInjectSidebar(currentPage);

  // Sync with Supabase auth changes
  setTimeout(() => {
    if (window.supabaseClient) {
      window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
          window.__nodingUser = session.user;
          localStorage.setItem('rl-auth-user', JSON.stringify(session.user));
        } else {
          window.__nodingUser = null;
          localStorage.removeItem('rl-auth-user');
        }
        window.shRenderSidebarAuth();
      });
    }
  }, 500);
});

// For page-specific modals
window.openGlobalAdd = function() { window.shOpenAddModal('modal-global-add'); };
window.openSubmitModal = function() { window.shOpenAddModal('modal-submit-effect'); };
