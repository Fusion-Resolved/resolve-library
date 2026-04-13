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
  
  localStorage.setItem('rl-quick-notes', JSON.stringify(notes));
  
  // Cleanup
  if(document.getElementById('sh-note-title')) document.getElementById('sh-note-title').value = '';
  if(document.getElementById('sh-note-body')) document.getElementById('sh-note-body').value = '';
  
  window.shCloseNote();
  window.toast('Note saved to library ✓', 'v');
};

/** ── 3. UNIVERSAL MODALS & UI ── **/

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

window.goPanel = function(panelId, navEl) {
  // 1. Hide all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  
  // 2. Show target panel
  const target = document.getElementById('panel-' + panelId);
  if (target) {
    target.classList.add('active');
    // Scroll to top of settings container
    const container = document.querySelector('.settings-main');
    if (container) container.scrollTop = 0;
  }
  
  // 3. Update Sidebar Nav highlight
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }
};

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

/** ── 5. AUTO-PATH NORMALIZER ── **/
// Automatically fixes links like "/effects" to "effects.html"
// This solves the [GHOST] pathing errors identified in the audit.

document.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link || !link.getAttribute('href')) return;
  
  const href = link.getAttribute('href');
  
  // If it's a root-style path (e.g. /effects) but not an external link
  if (href.startsWith('/') && !href.includes('.') && !href.includes('#') && href.length > 1) {
    e.preventDefault();
    const fileName = href.substring(1) + '.html';
    window.location.href = fileName;
  }
  
  // Fix "home.html" to "index.html"
  if (href === 'home.html') {
    e.preventDefault();
    window.location.href = 'index.html';
  }
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