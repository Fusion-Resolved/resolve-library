/**
 * Edit Effect Modal Component
 * 
 * A reusable, portable edit modal for effect settings.
 * Works on any page (effects.html, community.html, etc.)
 * Clean API for easy React migration: openEditModal(effectId, options)
 * 
 * Usage:
 *   EditModal.open(effectId, {
 *     mode: 'owner', // or 'admin'
 *     onSave: (data) => console.log('Saved:', data),
 *     onClose: () => console.log('Closed'),
 *     onDelete: () => console.log('Deleted')
 *   });
 * 
 * React migration path:
 *   const [isOpen, setIsOpen] = useState(false);
 *   <EditModal 
 *     effectId={id} 
 *     isOpen={isOpen} 
 *     mode="owner"
 *     onSave={handleSave}
 *     onClose={() => setIsOpen(false)}
 *   />
 */

(function (global) {
  'use strict';

  // Prevent duplicate initialization
  if (global.EditModal) {
    console.log('[EditModal] Already initialized');
    return;
  }

  // Configuration
  const CONFIG = {
    maxWidth: '720px',
    maxHeight: '90vh',
    animationDuration: 240,
    backdropBlur: '8px',
    zIndex: 500
  };

  // State
  let isOpen = false;
  let currentEffectId = null;
  let currentMode = 'owner'; // 'owner' or 'admin'
  let callbacks = {};
  let effectData = null;

  // CSS Styles (injected once)
  const STYLES = `
    .edit-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(9,9,14,0.85);
      z-index: ${CONFIG.zIndex};
      backdrop-filter: blur(${CONFIG.backdropBlur});
      -webkit-backdrop-filter: blur(${CONFIG.backdropBlur});
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity ${CONFIG.animationDuration}ms ease;
    }
    .edit-modal-overlay.open {
      display: flex;
      opacity: 1;
    }
    .edit-modal-container {
      background: var(--glass-bg, rgba(14,14,20,0.72));
      backdrop-filter: blur(18px) saturate(180%);
      -webkit-backdrop-filter: blur(18px) saturate(180%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.055), 0 24px 80px rgba(0,0,0,0.65);
      border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
      border-radius: 18px;
      width: 100%;
      max-width: ${CONFIG.maxWidth};
      max-height: ${CONFIG.maxHeight};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(20px) scale(0.98);
      opacity: 0;
      transition: transform ${CONFIG.animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1),
                  opacity ${CONFIG.animationDuration}ms ease;
    }
    .edit-modal-overlay.open .edit-modal-container {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .edit-modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-surface, rgba(255,255,255,0.06));
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      background: var(--glass-bg, rgba(14,14,20,0.72));
    }
    .edit-modal-header-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--violet, #6c7bff);
      flex-shrink: 0;
    }
    .edit-modal-header-title {
      flex: 1;
      min-width: 0;
      font-family: var(--font-display, 'Syne', sans-serif);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary, #f4f4fb);
      margin: 0;
    }
    .edit-modal-close {
      background: var(--glass-bg-2, rgba(22,22,31,0.84));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
      border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      color: var(--text-secondary, #8f8fa8);
      transition: all 150ms ease;
    }
    .edit-modal-close:hover {
      color: var(--text-primary, #f4f4fb);
      border-color: var(--border-color, #1e1e2a);
    }
    .edit-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      scrollbar-width: thin;
      scrollbar-color: var(--border-color, #1e1e2a) transparent;
    }
    .edit-modal-body::-webkit-scrollbar {
      width: 6px;
    }
    .edit-modal-body::-webkit-scrollbar-thumb {
      background: var(--border-color, #1e1e2a);
      border-radius: 999px;
    }
    .edit-modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-surface, rgba(255,255,255,0.06));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
      background: var(--glass-bg, rgba(14,14,20,0.72));
    }
    .edit-modal-btn {
      padding: 10px 18px;
      border-radius: 14px;
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
      border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
      background: var(--glass-bg, rgba(14,14,20,0.72));
      color: var(--text-secondary, #8f8fa8);
    }
    .edit-modal-btn:hover {
      background: var(--glass-bg-2, rgba(22,22,31,0.84));
      color: var(--text-primary, #f4f4fb);
    }
    .edit-modal-btn-primary {
      background: var(--violet, #6c7bff);
      color: var(--ink, #09090e);
      border-color: transparent;
      font-weight: 600;
    }
    .edit-modal-btn-primary:hover {
      background: var(--violet-light, #9ca8ff);
    }
    .edit-modal-btn-danger {
      color: var(--danger, #f06060);
      border-color: rgba(240, 96, 96, 0.3);
    }
    .edit-modal-btn-danger:hover {
      background: rgba(240, 96, 96, 0.1);
    }
    .edit-modal-section {
      margin-bottom: 1.5rem;
    }
    .edit-modal-section-title {
      font-family: var(--font-mono, 'DM Mono', monospace);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted, #585870);
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-surface, rgba(255,255,255,0.06));
    }
    .edit-modal-field {
      margin-bottom: 16px;
    }
    .edit-modal-label {
      display: block;
      font-family: var(--font-mono, 'DM Mono', monospace);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-secondary, #8f8fa8);
      margin-bottom: 6px;
    }
    .edit-modal-input,
    .edit-modal-textarea,
    .edit-modal-select {
      width: 100%;
      background: var(--glass-bg-2, rgba(22,22,31,0.84));
      border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
      border-radius: 10px;
      padding: 11px 14px;
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 14px;
      color: var(--text-primary, #f4f4fb);
      outline: none;
      transition: border-color 150ms ease;
    }
    .edit-modal-input:focus,
    .edit-modal-textarea:focus,
    .edit-modal-select:focus {
      border-color: rgba(108, 123, 255, 0.5);
    }
    .edit-modal-textarea {
      resize: vertical;
      min-height: 100px;
    }
    .edit-modal-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .edit-modal-row {
        grid-template-columns: 1fr;
      }
      .edit-modal-overlay {
        padding: 10px;
      }
      .edit-modal-container {
        max-height: 95vh;
        border-radius: 14px;
      }
    }
  `;

  // Inject styles
  function injectStyles() {
    if (document.getElementById('edit-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'edit-modal-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // Create modal DOM
  function createModalDOM() {
    if (document.getElementById('edit-modal-overlay')) {
      return document.getElementById('edit-modal-overlay');
    }

    const overlay = document.createElement('div');
    overlay.id = 'edit-modal-overlay';
    overlay.className = 'edit-modal-overlay';
    overlay.innerHTML = `
      <div class="edit-modal-container">
        <div class="edit-modal-header">
          <span class="edit-modal-header-dot"></span>
          <h3 class="edit-modal-header-title">Edit Effect Settings</h3>
          <button class="edit-modal-close" title="Close">&#x2715;</button>
        </div>
        <div class="edit-modal-body" id="edit-modal-body">
          <!-- Form content injected here -->
        </div>
        <div class="edit-modal-footer">
          <button class="edit-modal-btn edit-modal-btn-danger" id="edit-modal-delete" style="display:none;">Delete</button>
          <div style="display:flex;gap:10px;margin-left:auto;">
            <button class="edit-modal-btn" id="edit-modal-cancel">Cancel</button>
            <button class="edit-modal-btn edit-modal-btn-primary" id="edit-modal-save">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    attachEventListeners(overlay);
    return overlay;
  }

  // Build form HTML based on mode
  function buildFormHTML(mode) {
    const isAdmin = mode === 'admin';
    
    return `
      <div class="edit-modal-section">
        <div class="edit-modal-section-title">Basics</div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Effect Name</label>
          <input type="text" class="edit-modal-input" id="em-name" placeholder="Enter effect name">
        </div>
        <div class="edit-modal-row">
          <div class="edit-modal-field">
            <label class="edit-modal-label">Category</label>
            <select class="edit-modal-select" id="em-cat">
              <option value="">Select category</option>
              <option value="Colour">Colour</option>
              <option value="Compositing">Compositing</option>
              <option value="Lighting">Lighting</option>
              <option value="Particles">Particles</option>
              <option value="Texture">Texture</option>
              <option value="Blur">Blur</option>
              <option value="Distort">Distort</option>
              <option value="Stylize">Stylize</option>
              <option value="Transform">Transform</option>
              <option value="Masking">Masking</option>
            </select>
          </div>
          <div class="edit-modal-field">
            <label class="edit-modal-label">Difficulty</label>
            <select class="edit-modal-select" id="em-difficulty">
              <option value="">Select difficulty</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Short Description</label>
          <textarea class="edit-modal-textarea" id="em-desc" placeholder="Brief description of what this effect does"></textarea>
        </div>
      </div>

      <div class="edit-modal-section">
        <div class="edit-modal-section-title">Media</div>
        <div class="edit-modal-row">
          <div class="edit-modal-field">
            <label class="edit-modal-label">Preview GIF URL</label>
            <input type="url" class="edit-modal-input" id="em-gif" placeholder="https://example.com/preview.gif">
          </div>
          <div class="edit-modal-field">
            <label class="edit-modal-label">Video URL</label>
            <input type="url" class="edit-modal-input" id="em-video" placeholder="YouTube or Vimeo URL">
          </div>
        </div>
      </div>

      <div class="edit-modal-section">
        <div class="edit-modal-section-title">Details</div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Full Explanation</label>
          <textarea class="edit-modal-textarea" id="em-explanation" placeholder="Detailed explanation of how the effect works"></textarea>
        </div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Step-by-Step (one per line)</label>
          <textarea class="edit-modal-textarea" id="em-steps" placeholder="1. First step&#10;2. Second step&#10;3. Third step"></textarea>
        </div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Node Tree Code</label>
          <textarea class="edit-modal-textarea" id="em-nodecode" placeholder="Paste node tree code here"></textarea>
        </div>
      </div>

      <div class="edit-modal-section">
        <div class="edit-modal-section-title">Metadata</div>
        <div class="edit-modal-row">
          <div class="edit-modal-field">
            <label class="edit-modal-label">Tags (comma-separated)</label>
            <input type="text" class="edit-modal-input" id="em-tags" placeholder="glow, blur, color">
          </div>
          <div class="edit-modal-field">
            <label class="edit-modal-label">.setting File Name</label>
            <input type="text" class="edit-modal-input" id="em-setting" placeholder="my-effect.setting">
          </div>
        </div>
        <div class="edit-modal-row">
          <div class="edit-modal-field">
            <label class="edit-modal-label">DR Version</label>
            <input type="text" class="edit-modal-input" id="em-version" placeholder="e.g., 18.6">
          </div>
          <div class="edit-modal-field">
            <label class="edit-modal-label">Status</label>
            <select class="edit-modal-select" id="em-status">
              <option value="">None</option>
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>
      </div>

      ${isAdmin ? `
      <div class="edit-modal-section">
        <div class="edit-modal-section-title">Admin Controls</div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Visibility</label>
          <select class="edit-modal-select" id="em-visibility">
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
            <option value="review">Pending Review</option>
          </select>
        </div>
        <div class="edit-modal-field">
          <label class="edit-modal-label">Featured</label>
          <input type="checkbox" id="em-featured" style="margin-right:8px;">
          <span style="color:var(--text-secondary);">Show in featured section</span>
        </div>
      </div>
      ` : ''}

      <div class="edit-modal-section">
        <div class="edit-modal-section-title">Share Settings</div>
        <div class="edit-modal-row">
          <div class="edit-modal-field">
            <label class="edit-modal-label">Share Limit (optional)</label>
            <input type="number" class="edit-modal-input" id="em-share-limit" placeholder="Unlimited" min="0">
          </div>
          <div class="edit-modal-field">
            <label class="edit-modal-label">Share Password (optional)</label>
            <input type="text" class="edit-modal-input" id="em-share-password" placeholder="Leave blank for no password">
          </div>
        </div>
      </div>
    `;
  }

  // Attach event listeners
  function attachEventListeners(overlay) {
    // Close button
    overlay.querySelector('.edit-modal-close').addEventListener('click', close);
    
    // Cancel button
    overlay.querySelector('#edit-modal-cancel').addEventListener('click', close);
    
    // Save button
    overlay.querySelector('#edit-modal-save').addEventListener('click', save);
    
    // Delete button
    const deleteBtn = overlay.querySelector('#edit-modal-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', confirmDelete);
    }
    
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  // Load effect data from Supabase
  async function loadEffectData(effectId) {
    if (!window._supabase) {
      console.error('[EditModal] Supabase not initialized');
      return null;
    }
    
    try {
      const { data, error } = await window._supabase
        .from('effects')
        .select('*')
        .eq('id', effectId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[EditModal] Error loading effect:', err);
      return null;
    }
  }

  // Populate form with data
  function populateForm(data) {
    const fields = {
      'em-name': data.name || '',
      'em-cat': data.cat || '',
      'em-difficulty': data.difficulty || '',
      'em-desc': data.desc || '',
      'em-gif': data.gifUrl || '',
      'em-video': data.videoUrl || '',
      'em-explanation': data.explanation || '',
      'em-steps': Array.isArray(data.steps) ? data.steps.join('\n') : (data.steps || ''),
      'em-nodecode': data.nodeCode || '',
      'em-tags': Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
      'em-setting': data.settingFile || '',
      'em-version': data.version || '',
      'em-status': data.status || '',
      'em-share-limit': data.share_limit || '',
      'em-share-password': data.share_password || ''
    };
    
    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
    
    // Admin fields
    if (currentMode === 'admin') {
      const visibility = document.getElementById('em-visibility');
      if (visibility) {
        if (data.is_public === false) visibility.value = 'private';
        else if (data.is_public === true) visibility.value = 'public';
        else visibility.value = 'unlisted';
      }
      
      const featured = document.getElementById('em-featured');
      if (featured) featured.checked = !!data.featured;
    }
  }

  // Gather form data
  function gatherFormData() {
    const data = {
      name: document.getElementById('em-name')?.value || '',
      cat: document.getElementById('em-cat')?.value || '',
      difficulty: document.getElementById('em-difficulty')?.value || '',
      desc: document.getElementById('em-desc')?.value || '',
      gifUrl: document.getElementById('em-gif')?.value || '',
      videoUrl: document.getElementById('em-video')?.value || '',
      explanation: document.getElementById('em-explanation')?.value || '',
      steps: document.getElementById('em-steps')?.value?.split('\n').filter(s => s.trim()) || [],
      nodeCode: document.getElementById('em-nodecode')?.value || '',
      tags: document.getElementById('em-tags')?.value?.split(',').map(t => t.trim()).filter(t => t) || [],
      settingFile: document.getElementById('em-setting')?.value || '',
      version: document.getElementById('em-version')?.value || '',
      status: document.getElementById('em-status')?.value || '',
      share_limit: document.getElementById('em-share-limit')?.value || null,
      share_password: document.getElementById('em-share-password')?.value || ''
    };
    
    // Admin fields
    if (currentMode === 'admin') {
      const visibility = document.getElementById('em-visibility')?.value;
      data.is_public = visibility === 'public';
      data.is_unlisted = visibility === 'unlisted';
      data.featured = document.getElementById('em-featured')?.checked || false;
    }
    
    return data;
  }

  // Save changes
  async function save() {
    if (!window._supabase || !currentEffectId) return;
    
    const data = gatherFormData();
    
    try {
      const { error } = await window._supabase
        .from('effects')
        .update(data)
        .eq('id', currentEffectId);
      
      if (error) throw error;
      
      if (callbacks.onSave) {
        callbacks.onSave({ id: currentEffectId, ...data });
      }
      
      showToast('Changes saved successfully');
      close();
    } catch (err) {
      console.error('[EditModal] Save error:', err);
      showToast('Error saving changes: ' + err.message);
    }
  }

  // Confirm delete
  function confirmDelete() {
    if (!confirm('Are you sure you want to delete this effect? This cannot be undone.')) return;
    
    if (callbacks.onDelete) {
      callbacks.onDelete(currentEffectId);
    }
    close();
  }

  // Show toast notification
  function showToast(message) {
    // Try to use existing toast from effects.html
    if (typeof window.showToast === 'function') {
      window.showToast(message);
      return;
    }
    
    // Fallback: create temporary toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 72px;
      right: 1.5rem;
      background: rgba(15, 168, 136, 0.15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(15, 168, 136, 0.3);
      color: #f4f4fb;
      padding: 10px 18px;
      border-radius: 14px;
      font-size: 13px;
      z-index: 9999;
      font-family: var(--font-body, 'DM Sans', sans-serif);
      animation: fadeIn 240ms ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      toast.style.transition = 'all 240ms ease-out';
      setTimeout(() => toast.remove(), 240);
    }, 2200);
  }

  // Open modal
  async function open(effectId, options = {}) {
    if (isOpen) close();
    
    currentEffectId = effectId;
    currentMode = options.mode || 'owner';
    callbacks = {
      onSave: options.onSave || null,
      onClose: options.onClose || null,
      onDelete: options.onDelete || null
    };
    
    // Inject styles and create DOM
    injectStyles();
    const overlay = createModalDOM();
    
    // Build form
    const body = overlay.querySelector('#edit-modal-body');
    body.innerHTML = buildFormHTML(currentMode);
    
    // Show/hide delete button for owners
    const deleteBtn = overlay.querySelector('#edit-modal-delete');
    if (deleteBtn) {
      deleteBtn.style.display = currentMode === 'owner' ? 'block' : 'none';
    }
    
    // Update title based on mode
    const title = overlay.querySelector('.edit-modal-header-title');
    title.textContent = currentMode === 'admin' ? 'Edit Effect (Admin)' : 'Edit Effect Settings';
    
    // Load data
    effectData = await loadEffectData(effectId);
    if (effectData) {
      populateForm(effectData);
    }
    
    // Show modal
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    isOpen = true;
    
    console.log('[EditModal] Opened for effect:', effectId, 'mode:', currentMode);
  }

  // Close modal
  function close() {
    const overlay = document.getElementById('edit-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
    document.body.style.overflow = '';
    isOpen = false;
    
    if (callbacks.onClose) {
      callbacks.onClose();
    }
    
    console.log('[EditModal] Closed');
  }

  // Public API
  const EditModal = {
    open,
    close,
    isOpen: () => isOpen,
    getEffectId: () => currentEffectId,
    version: '1.0.0'
  };

  // Expose globally
  global.EditModal = EditModal;
  
  // Also expose as window.openEditModal for legacy compatibility
  global.openEditModal = open;
  global.closeEditModal = close;

  console.log('[EditModal] Initialized v1.0.0');

})(window);
