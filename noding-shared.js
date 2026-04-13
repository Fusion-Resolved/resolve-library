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