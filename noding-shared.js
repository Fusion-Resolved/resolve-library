/* ============================================================
   noding-shared.js — THE CANONICAL SYSTEM BRAIN
   Logic for Sidebar, Modals, Notes, and Settings Navigation.
   ============================================================ */

/** ── 1. SIDEBAR & NAVIGATION ── **/

window.shOpenSidebar = function() {
  const sb = document.getElementById('sh-sidebar');
  const ov = document.getElementById('sh-sidebar-overlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.style.display = 'block';
  document.body.style.overflow = 'hidden';
};

window.shCloseSidebar = function() {
  const sb = document.getElementById('sh-sidebar');
  const ov = document.getElementById('sh-sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.style.display = 'none';
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
 * Inject sidebar navigation HTML into the page
 * STRICT STRUCTURE:
 *   1. Main Navigation (5 links)
 *   2. Account Section (Profile Email, Settings, Sign Out)
 *      - Sign Out MUST be the absolute last item
 *      - No elements after Sign Out
 * Call this from DOMContentLoaded to populate sidebar structure
 * @param {string} currentPage - Filename of current page (e.g., 'index.html')
 */
window.shInjectSidebar = function(currentPage) {
  const sidebar = document.getElementById('sh-sidebar');
  if (!sidebar) {
    console.warn('[Noding] shInjectSidebar: Sidebar element not found');
    return;
  }

  // Get current page name for highlighting
  const pageName = currentPage || window.location.pathname.split('/').pop() || 'index.html';
  
  // STRICT: Only these 5 main navigation items (NO ghosts, NO tabs, NO wizard steps)
  const mainNav = [
    { href: 'index.html', name: 'Home', icon: 'home' },
    { href: 'effects.html', name: 'Effects', icon: 'grid' },
    { href: 'nodegraph.html', name: 'Node Graph', icon: 'git-branch' },
    { href: 'library.html', name: 'Library', icon: 'layers' },
    { href: 'community.html', name: 'Community', icon: 'users' }
  ];

  // Build main nav HTML
  const mainNavHtml = mainNav.map(item => {
    const isActive = pageName === item.href || pageName.endsWith('/' + item.href);
    const iconSvg = window.navIcons[item.icon] || '';
    return `
      <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}" data-page="${item.href}">
        ${iconSvg}
        <span style="font-family:var(--font-body);font-size:13px;font-weight:500;">${item.name}</span>
      </a>
    `;
  }).join('');

  // Check if on settings page (for Account section highlighting)
  const isSettingsPage = pageName === 'settings.html' || 
                         pageName.includes('settings');

  // STRICT Sidebar structure - NO tabs, NO sh-nav contamination, NO elements after Sign Out
  const sidebarContent = `
    <!-- ═══════════════════════════════════════════════════════════════════════
         MAIN NAVIGATION — 5 Core App Links
         ═══════════════════════════════════════════════════════════════════════ -->
    <div class="sh-sb-main" style="padding:16px 0;flex-shrink:0;">
      ${mainNavHtml}
    </div>
    
    <!-- ═══════════════════════════════════════════════════════════════════════
         ACCOUNT SECTION — Strict order: Email → Settings → Sign Out
         Sign Out MUST be the absolute last element in the sidebar.
         ═══════════════════════════════════════════════════════════════════════ -->
    <div class="sh-sb-account" style="padding:16px 0;margin-top:auto;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
      
      <!-- Account Label -->
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(143,143,168,0.5);padding:0 20px 12px;font-family:var(--font-mono);">Account</div>
      
      <!-- Profile Info: Email address (small, muted) — populated by auth.js -->
      <div id="sidebar-user-profile" style="padding:0 16px 12px;margin:0 4px;">
        <div style="font-size:11px;color:rgba(143,143,168,0.6);padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
          <span id="sidebar-user-email" style="font-family:var(--font-mono);letter-spacing:0.02em;">Not signed in</span>
        </div>
      </div>
      
      <!-- Settings Link -->
      <a href="settings.html" class="nav-item ${isSettingsPage ? 'active' : ''}" data-page="settings.html" style="margin-bottom:4px;">
        ${window.navIcons['settings'] || ''}
        <span style="font-family:var(--font-body);font-size:13px;font-weight:500;">Settings</span>
      </a>
      
      <!-- Sign Out Button — ABSOLUTE LAST ITEM, no exceptions -->
      <button class="nav-item" onclick="handleSignOut()" style="color:rgba(240,96,96,0.7);border:none;background:transparent;width:100%;text-align:left;cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span style="font-family:var(--font-body);font-size:13px;font-weight:500;">Sign Out</span>
      </button>
      
    </div>
  `;

  // Insert content (completely replace any existing ghost content)
  sidebar.innerHTML = sidebarContent;
  
  // Ensure proper flex layout on sidebar
  sidebar.style.display = 'flex';
  sidebar.style.flexDirection = 'column';
  sidebar.style.height = '100%';

  console.log('[Noding] Sidebar injected for page:', pageName);
  console.log('[Noding] Sidebar structure: 5 main links + Account (Email, Settings, Sign Out)');
};

/**
 * Set active navigation state for PRIMARY navigation links only
 * STRICT: Does NOT affect Settings Sheet tabs (sh-nav class)
 * @param {string} pageName - Current page filename (e.g., 'index.html')
 */
window.shSetActiveNav = function(pageName) {
  const currentPage = pageName || window.location.pathname.split('/').pop() || 'index.html';
  
  // STRICT: Only update nav-item elements in the GLOBAL sidebar (sh-sidebar)
  // NEVER touch sh-nav items (those are for Settings Sheet internal navigation)
  const globalSidebar = document.getElementById('sh-sidebar');
  if (!globalSidebar) return;
  
  // Check for settings page variants
  const isSettingsPage = currentPage === 'settings.html' || 
                         currentPage.includes('settings');
  
  // Only target nav-items within the global sidebar
  globalSidebar.querySelectorAll('.nav-item').forEach(item => {
    const itemPage = item.getAttribute('data-page');
    const href = item.getAttribute('href');
    
    // STRICT: Apply active state to primary nav links + Settings
    let isActive = false;
    
    // Check main nav pages
    if (itemPage === currentPage || href === currentPage) {
      isActive = true;
    }
    
    // Check for home.html alias
    if (currentPage === 'home.html' && (itemPage === 'index.html' || href === 'index.html')) {
      isActive = true;
    }
    
    // Check for Settings page (explicit match)
    if (isSettingsPage && (itemPage === 'settings.html' || href === 'settings.html')) {
      isActive = true;
    }
    
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
 * Auto-initialize sidebar navigation on DOMContentLoaded
 * Injects sidebar content and sets active nav state automatically
 */
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure auth.js has initialized first
  setTimeout(function() {
    // Get current page from URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Check if sidebar exists on this page
    const sidebar = document.getElementById('sh-sidebar');
    if (sidebar) {
      // Inject sidebar navigation
      window.shInjectSidebar(currentPage);
      
      // Set active navigation state
      window.shSetActiveNav(currentPage);
      
      // Ensure Settings link visibility
      window.shCheckSettingsVisibility();
      
      console.log('[Noding] Sidebar navigation initialized for:', currentPage);
    }
  }, 50);
});

/** End of Global Modal & Navigation Logic */