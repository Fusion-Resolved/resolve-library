/**
 * Noding Effect Modal
 * Shared module for opening effect detail sheets
 * Include this script and call openEffectModal(effectId)
 */

(function() {
  'use strict';

  // Category to color mapping (matches index.html recent effects)
  const catColors = {
    'Colour':      { primary: '#6c7bff', light: '#9ca8ff', bg: 'rgba(108,123,255,0.13)' },
    'Compositing': { primary: '#0fa888', light: '#0fa888', bg: 'rgba(15,168,136,0.13)' },
    'Lighting':    { primary: '#c95238', light: '#c95238', bg: 'rgba(201,82,56,0.13)' },
    'Particles':   { primary: '#b07118', light: '#b07118', bg: 'rgba(176,113,24,0.13)' },
    'Texture':     { primary: '#9ca8ff', light: '#9ca8ff', bg: 'rgba(156,168,255,0.13)' },
    'Blur':        { primary: '#0fa888', light: '#0fa888', bg: 'rgba(15,168,136,0.13)' },
    'Transform':   { primary: '#22d3ee', light: '#22d3ee', bg: 'rgba(34,211,238,0.13)' },
    'Masking':     { primary: '#9c78ff', light: '#9c78ff', bg: 'rgba(156,120,255,0.13)' },
    'Distort':     { primary: '#a855f7', light: '#a855f7', bg: 'rgba(168,85,247,0.13)' },
    'Stylize':     { primary: '#c9529c', light: '#c9529c', bg: 'rgba(201,82,156,0.13)' },
    'Source':      { primary: '#0fa888', light: '#0fa888', bg: 'rgba(15,168,136,0.13)' },
    'Analysis':    { primary: '#6c7bff', light: '#6c7bff', bg: 'rgba(108,123,255,0.13)' },
    'Time':        { primary: '#f59e0b', light: '#f59e0b', bg: 'rgba(245,158,11,0.13)' },
    'Color':       { primary: '#eab308', light: '#eab308', bg: 'rgba(234,179,8,0.13)' },
    'Filter':      { primary: '#ef4444', light: '#ef4444', bg: 'rgba(239,68,68,0.13)' },
    'Composite':   { primary: '#94a3b8', light: '#94a3b8', bg: 'rgba(148,163,184,0.13)' },
    'Mask':        { primary: '#fb923c', light: '#fb923c', bg: 'rgba(251,146,60,0.13)' },
    'Output':      { primary: '#4ade80', light: '#4ade80', bg: 'rgba(74,222,128,0.13)' }
  };

  function getCatColor(cat) {
    return catColors[cat] || catColors['Colour'];
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Open full node graph editor
  window.openNodeGraphModal = function(effectId) {
    window.open('nodegraph.html?id=' + encodeURIComponent(effectId), '_blank');
  };

  // Graph rendering variables
  var NW = 132, NH = 50;
  var tx = 0, ty = 0, sc = 1;
  var dragging = false, dragX = 0, dragY = 0;
  var lastTouches = null;
  var activeGnEl = null;
  var viewport, world, svgEl, zoomLbl;

  /* ═══════════════════════════════════════════════════════════════
     OPEN EFFECT MODAL
     ═══════════════════════════════════════════════════════════════ */
  window.openEffectModal = async function(effectId) {
    console.log('[Effect Modal] Opening effect:', effectId);
    if (!window._supabase) {
      console.log('[Effect Modal] Supabase not initialized');
      return;
    }

    try {
      // Force fresh fetch by adding a timestamp to bypass any caching
      const cacheBuster = Date.now();
      const { data: effect, error } = await window._supabase
        .from('effects')
        .select('*')
        .eq('id', effectId)
        .eq('is_public', true)
        .single()
        .abortSignal(AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined);

      if (error || !effect) {
        console.log('[Effect Modal] Effect not found:', error);
        return;
      }

      // Re-fetch to get fresh data
      const { data: freshEffect } = await window._supabase
        .from('effects')
        .select('id, nodes')
        .eq('id', effectId)
        .single();
      
      if (freshEffect && freshEffect.nodes) {
        effect.nodes = freshEffect.nodes;
      }

      populateModal(effect);
      showModal();
      console.log('[Effect Modal] Opened effect:', effect.name);

    } catch (err) {
      console.log('[Effect Modal] Error:', err);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     POPULATE MODAL WITH EFFECT DATA
     ═══════════════════════════════════════════════════════════════ */
  async function populateModal(effect) {
    // Store effect data globally for expanded view access
    window._currentEffectData = effect;
    
    const colors = getCatColor(effect.cat);
    const isOwner = window.CURRENT_USER_ID && window.CURRENT_USER_ID === effect.user_id;

    // Title and header
    document.getElementById('modal-sheet-title').textContent = effect.name;
    document.getElementById('modal-effect-title').textContent = effect.name;
    document.getElementById('modal-cat-badge').textContent = effect.cat;
    
    // Difficulty dot color
    const diffColors = {
      'Beginner': '#22d3ee',
      'Intermediate': '#f59e0b',
      'Advanced': '#ef4444'
    };
    const diffColor = diffColors[effect.difficulty] || colors.primary;
    document.getElementById('modal-difficulty').innerHTML = 
      `<span style="color:${diffColor}">&#x25cf;</span> ${escapeHtml(effect.difficulty)}`;

    // Date formatting
    const date = effect.date || effect.created_at;
    document.getElementById('modal-date').textContent = date ? 
      new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    // Description
    document.getElementById('modal-desc').textContent = effect.desc || effect.explanation || '';

    // Media (GIF/Video)
    populateMedia(effect);

    // Software/version info
    document.getElementById('modal-software').textContent = effect.tool || 'DaVinci Resolve';
    document.getElementById('modal-render-weight').textContent = effect.render_weight || 'Medium';
    document.getElementById('modal-self-contained').textContent = effect.self_contained || 'Needs media input';
    console.log('[effect-modal] self_contained value:', effect.self_contained);
    document.getElementById('modal-dependencies').textContent = effect.fusion_env || 'None';

    // Node graph visualization and accordion using Universal Node System
    var nodeSection = document.getElementById('modal-node-section');
    var nodeCountEl = document.getElementById('modal-node-count');
    var accordionEl = document.getElementById('modal-node-accordion');
    var canvasContainer = document.getElementById('modal-node-code');
    
    // Try to get node data - prefer _graphData (has positions), fall back to node_code
    var nodeData = null;
    var hasValidData = false;
    var usedGraphData = false;
    
    // Case 1: _graphData already transformed (from effects.html _rowToEffect)
    if (effect._graphData && window.NodeSystem) {
      try {
        var graphData = typeof effect._graphData === 'string' ? JSON.parse(effect._graphData) : effect._graphData;
        if (graphData && graphData.nodes && graphData.nodes.length > 0) {
          console.log('[effect-modal] Using _graphData with', graphData.nodes.length, 'nodes (has positions)');
          nodeData = {
            nodes: graphData.nodes.map(function(n) { return {
              id: n.id,
              name: n.name,
              fusionName: n.label || n.name,
              category: n.cat || 'Custom',
              catColor: n.catColor || n.col || '#6c7bff',
              x: n.x || 0,
              y: n.y || 0,
              params: n.fusionParams || {}
            };}),
            edges: (graphData.conns || []).map(function(c) { return {
              from: c.fromNode,
              to: c.toNode
            };})
          };
          hasValidData = true;
          usedGraphData = true;
        }
      } catch (e) {
        console.warn('[effect-modal] Failed to parse _graphData:', e);
      }
    }
    
    // Case 2: effect.nodes is the JSONB column from Supabase (raw graph data)
    if (!hasValidData && effect.nodes && window.NodeSystem) {
      try {
        var rawNodes = effect.nodes;
        // If nodes is a string, parse it (Supabase sometimes returns JSONB as string)
        if (typeof rawNodes === 'string') {
          try {
            rawNodes = JSON.parse(rawNodes);
          } catch (parseErr) {
            console.warn('[effect-modal] Failed to parse effect.nodes as JSON string:', parseErr);
          }
        }
        // Check if it's a full graph object (has schemaVersion or nodes array)
        if (rawNodes && typeof rawNodes === 'object' && !Array.isArray(rawNodes)
            && (rawNodes.nodes || rawNodes.schemaVersion)) {
          nodeData = {
            nodes: rawNodes.nodes.map(function(n) { return {
              id: n.id,
              name: n.name,
              fusionName: n.label || n.name,
              category: n.cat || 'Custom',
              catColor: n.catColor || n.col || '#6c7bff',
              x: n.x || 0,
              y: n.y || 0,
              params: n.fusionParams || {}
            };}),
            edges: (rawNodes.conns || []).map(function(c) { return {
              from: c.fromNode,
              to: c.toNode
            };})
          };
          hasValidData = true;
          usedGraphData = true;
        }
      } catch (e) {
        console.warn('[effect-modal] Failed to parse effect.nodes:', e);
      }
    }
    
    // Case 3: Parse graph_payload if available (has highest priority for visual graph)
    if (!hasValidData && effect.graph_payload && window.NodeSystem) {
      try {
        console.log('[effect-modal] Parsing graph_payload...');
        var parsed = window.NodeSystem.parse(effect.graph_payload);
        nodeData = window.NodeSystem.normalize(parsed);
        hasValidData = nodeData.nodes.length > 0;
        
        // Auto-layout since graph_payload doesn't have positions
        if (hasValidData && window.NodeSystem.autoLayout) {
          console.log('[effect-modal] Auto-layout for graph_payload...');
          window.NodeSystem.autoLayout(nodeData.nodes, { cols: 3, xGap: 50, yGap: 40 });
        }
      } catch (e) {
        console.warn('[effect-modal] Failed to parse graph_payload:', e);
      }
    }
    
    // Case 4: Fall back to node_code parsing if no graph data available
    if (!hasValidData && effect.node_code && window.NodeSystem) {
      try {
        console.log('[effect-modal] Falling back to node_code parsing...');
        var parsed = window.NodeSystem.parse(effect.node_code);
        nodeData = window.NodeSystem.normalize(parsed);
        hasValidData = nodeData.nodes.length > 0;
        
        // Auto-layout since we don't have positions
        if (hasValidData && window.NodeSystem.autoLayout) {
          console.log('[effect-modal] Auto-layout needed, positioning nodes...');
          window.NodeSystem.autoLayout(nodeData.nodes, { cols: 3, xGap: 50, yGap: 40 });
        }
      } catch (e) {
        console.warn('[effect-modal] Failed to parse node_code:', e);
      }
    }
    
    // Render the node graph section with full-page styling (DOM nodes + SVG edges)
    if (hasValidData && nodeData && nodeSection) {
      nodeSection.style.display = 'block';
      
      // Store current effect ID for click handler
      window.currentEffectId = effect.id;
      window.currentNodeData = nodeData; // Store for graph interactions
      
      // Update node count
      if (nodeCountEl) {
        nodeCountEl.textContent = nodeData.nodes.length + ' node' + (nodeData.nodes.length !== 1 ? 's' : '');
      }
      
      // Initialize DOM-based graph (like full-page)
      setTimeout(function() {
        initGraphViewport(nodeData);
      }, 50);
      
      // Build accordion
      if (accordionEl) {
        accordionEl.innerHTML = '';
        
        nodeData.nodes.forEach(function(node, idx) {
          var hasParams = Object.keys(node.params || {}).length > 0;
          var hasAnimation = hasParams && Object.values(node.params).some(function(p) {
            return p.keyframes && p.keyframes.length > 0;
          });
          
          // Accordion item
          var item = document.createElement('div');
          item.className = 'node-accordion-item';
          item.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.05);';
          
          // Header
          var header = document.createElement('div');
          header.className = 'node-accordion-header';
          header.style.cssText = 'padding:10px 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:background 0.15s;';
          header.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + (node.catColor || '#6c7bff') + ';"></span>' +
            '<span style="font-size:12px;color:var(--text);">' + (node.fusionName || node.name) + '</span>' +
            '<span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;">' + (node.category || 'Node') + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            (hasAnimation ? '<span style="font-size:8px;color:var(--violet);">◆</span>' : '') +
            '<span style="font-size:10px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">▾</span>' +
          '</div>';
          
          // Content (hidden by default)
          var content = document.createElement('div');
          content.className = 'node-accordion-content';
          content.style.cssText = 'display:none;padding:0 12px 12px 32px;';
          
          if (hasParams) {
            var paramsDiv = document.createElement('div');
            paramsDiv.style.cssText = 'background:rgba(0,0,0,0.3);border-radius:4px;padding:8px;';
            window.NodeSystem.renderParams(paramsDiv, node, {
              readOnly: true,
              showSplines: true
            });
            content.appendChild(paramsDiv);
          } else {
            content.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px;">No parameters</div>';
          }
          
          // Toggle handler
          var isOpen = false;
          header.onmouseenter = function() { header.style.background = 'rgba(255,255,255,0.03)'; };
          header.onmouseleave = function() { header.style.background = 'transparent'; };
          header.onclick = function() {
            isOpen = !isOpen;
            content.style.display = isOpen ? 'block' : 'none';
            var arrow = header.querySelector('.accordion-arrow');
            if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
          };
          
          item.appendChild(header);
          item.appendChild(content);
          accordionEl.appendChild(item);
        });
      } else {
        console.log('[effect-modal] accordionEl not found!');
      }
      
      // Update copy button
      var copyBtn = document.getElementById('btnCopy');
      if (copyBtn) {
        copyBtn.onclick = function() {
          navigator.clipboard.writeText(effect.node_code).then(function() {
            showToast('Node code copied!');
          });
        };
      }
      
    } else {
      console.log('[effect-modal] No valid node data found or NodeSystem not loaded');
      if (nodeSection) nodeSection.style.display = 'none';
    }

    // Steps (parse if JSON, or use as string)
    const stepsContainer = document.getElementById('modal-steps');
    stepsContainer.innerHTML = '';
    if (effect.steps) {
      const steps = typeof effect.steps === 'string' ? 
        effect.steps.split('\n').filter(s => s.trim()) : 
        effect.steps;
      
      steps.forEach((step, idx) => {
        const stepText = typeof step === 'string' ? step : step.text || step.description || '';
        if (stepText) {
          stepsContainer.innerHTML += `
            <li><span class="sn">${String(idx + 1).padStart(2, '0')}</span>
            <span>${escapeHtml(stepText)}</span></li>
          `;
        }
      });
    }

    // Tags
    const tagsContainer = document.getElementById('modal-tags');
    tagsContainer.innerHTML = '';
    if (effect.collections || effect.tags) {
      const tags = Array.isArray(effect.collections) ? effect.collections : 
                   Array.isArray(effect.tags) ? effect.tags : [];
      tags.forEach(tag => {
        tagsContainer.innerHTML += `
          <span class="modal-tag">${escapeHtml(tag)}</span>
        `;
      });
    }

    // Related effects (placeholder for now)
    document.getElementById('modal-related').innerHTML = `
      <button class="rel-chip">Similar ${escapeHtml(effect.cat)}</button>
      <button class="rel-chip">${escapeHtml(effect.tool || 'Resolve')} effects</button>
    `;

    // Footer buttons based on ownership
    const footer = document.getElementById('modal-footer');
    footer.innerHTML = '';
    
    if (isOwner) {
      footer.innerHTML = `
        <a href="effect-full-page.html?id=${effect.id}" class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--violet);color:var(--ink);border:none;border-radius:var(--radius);padding:9px 16px;font-size:13px;font-weight:600;font-family:var(--font-body);cursor:pointer;transition:var(--tr);white-space:nowrap;flex:1;text-decoration:none;">View full</a>
        <button class="btn-share" onclick="shareEffect('${effect.id}')" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--glass-bg);box-shadow:var(--glass-shine),var(--glass-shadow);border:1px solid var(--border-subtle);color:var(--text-secondary);border-radius:var(--radius-sm);padding:9px;width:40px;height:38px;font-family:var(--font-body);cursor:pointer;transition:var(--tr);"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
        <button class="btn-glass" onclick="editEffect('${effect.id}')" title="Edit settings - Owner" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);box-shadow:var(--glass-shine),var(--glass-shadow);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:9px 14px;font-size:13px;font-weight:500;font-family:var(--font-body);color:var(--text-secondary);cursor:pointer;transition:var(--tr);white-space:nowrap;">Edit settings</button>
        <button class="btn-glass btn-danger" onclick="deleteEffect('${effect.id}')" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);box-shadow:var(--glass-shine),var(--glass-shadow);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:9px;width:40px;height:38px;font-family:var(--font-body);color:var(--danger,#f06060);cursor:pointer;transition:var(--tr);"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
    } else {
      const isPinned = await isEffectPinned(effect.id);
      const pinStyle = isPinned ? 
        'box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(108,123,255,0.25);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);box-shadow:var(--glass-shine),var(--glass-shadow);border:1px solid rgba(108,123,255,0.6);border-radius:var(--radius);padding:0;width:40px;height:38px;font-family:var(--font-body);color:var(--violet-light,#9ca8ff);cursor:pointer;transition:var(--tr);flex-shrink:0;' :
        'box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);box-shadow:var(--glass-shine),var(--glass-shadow);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:0;width:40px;height:38px;font-family:var(--font-body);color:var(--text-secondary);cursor:pointer;transition:var(--tr);flex-shrink:0;';
      const pinSvg = isPinned ? 
        '<svg width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' :
        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
      const pinTitle = isPinned ? 'Remove from library' : 'Save to library';
      
      footer.innerHTML = `
        <a href="effect-full-page.html?id=${effect.id}" class="btn-primary" style="box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--violet);color:var(--ink);border:none;border-radius:var(--radius);padding:9px 16px;font-size:13px;font-weight:600;font-family:var(--font-body);cursor:pointer;transition:var(--tr);white-space:nowrap;flex:1;text-decoration:none;">View full</a>
        <button class="btn-glass" onclick="pinEffect('${effect.id}')" title="${pinTitle}" style="${pinStyle}">${pinSvg}</button>
        <button class="btn-share" onclick="shareEffect('${effect.id}')" style="box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--glass-bg);box-shadow:var(--glass-shine),var(--glass-shadow);border:1px solid var(--border-subtle);color:var(--text-secondary);border-radius:var(--radius-sm);padding:0;width:40px;height:38px;font-family:var(--font-body);cursor:pointer;transition:var(--tr);flex-shrink:0;"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
      `;
    }

  }

  /* ═══════════════════════════════════════════════════════════════
     SHOW/HIDE MODAL
     ═══════════════════════════════════════════════════════════════ */
  function showModal() {
    const modal = document.getElementById('effect-modal-overlay');
    if (modal) {
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(9,9,14,0.72);z-index:300;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:flex-end;justify-content:center;display:flex;opacity:1;pointer-events:auto;visibility:visible;';
      document.body.style.overflow = 'hidden';
      console.log('[Effect Modal] Modal opened with full inline styles');
    }
  }

  window.closeEffectModal = function() {
    const modal = document.getElementById('effect-modal-overlay');
    if (modal) {
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(9,9,14,0.72);z-index:300;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:flex-end;justify-content:center;display:none;opacity:0;pointer-events:none;visibility:hidden;';
      document.body.style.overflow = '';
    }
    closeNodePop();
  };

  /* ═══════════════════════════════════════════════════════════════
     MEDIA HANDLING (GIF/Video)
     ═══════════════════════════════════════════════════════════════ */
  let currentEffectMedia = null;
  let currentYouTubeUrl = null;

  function populateMedia(effect) {
    currentEffectMedia = effect;
    const mediaContent = document.getElementById('modal-media-content');
    const noMedia = document.getElementById('modal-no-media');
    const toggleBtns = document.querySelector('.media-toggle');
    const gifBtn = document.getElementById('mtb-gif');
    const videoBtn = document.getElementById('mtb-video');

    // Check what media is available
    const hasGif = effect.gif_url || effect.gifUrl;
    const hasVideo = effect.video_url || effect.videoUrl;
    
    // Store current video URL
    currentYouTubeUrl = effect.video_url || effect.videoUrl || '';

    if (!hasGif && !hasVideo) {
      // No media available
      mediaContent.style.display = 'none';
      if (toggleBtns) toggleBtns.style.display = 'none';
      if (noMedia) noMedia.style.display = 'flex';
      return;
    }

    // Show toggle if either media is available
    if (toggleBtns) {
      toggleBtns.style.display = (hasGif || hasVideo) ? 'flex' : 'none';
      // Disable button for missing media
      if (gifBtn) {
        gifBtn.style.opacity = hasGif ? '1' : '0.3';
        gifBtn.style.cursor = hasGif ? 'pointer' : 'not-allowed';
        gifBtn.disabled = !hasGif;
      }
      if (videoBtn) {
        videoBtn.style.opacity = hasVideo ? '1' : '0.3';
        videoBtn.style.cursor = hasVideo ? 'pointer' : 'not-allowed';
        videoBtn.disabled = !hasVideo;
      }
    }

    // Default to GIF if available, otherwise video
    if (hasGif) {
      showGif(effect.gif_url || effect.gifUrl);
      if (gifBtn) gifBtn.classList.add('active');
      if (videoBtn) videoBtn.classList.remove('active');
    } else if (hasVideo) {
      showVideo(effect.video_url || effect.videoUrl);
      if (gifBtn) gifBtn.classList.remove('active');
      if (videoBtn) videoBtn.classList.add('active');
    }

    if (noMedia) noMedia.style.display = 'none';
  }

  function showGif(url) {
    const mediaContent = document.getElementById('modal-media-content');
    if (mediaContent) {
      mediaContent.innerHTML = `<img src="${escapeHtml(url)}" alt="Effect preview" style="width:100%;height:100%;object-fit:cover;display:block">`;
      mediaContent.style.display = 'block';
    }
  }

  function showVideo(url) {
    const mediaContent = document.getElementById('modal-media-content');
    if (mediaContent) {
      let embedUrl = url;
      
      // If URL contains iframe HTML, extract the src attribute
      if (url.includes('<iframe') && url.includes('src=')) {
        const srcMatch = url.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
          embedUrl = srcMatch[1];
        }
      }
      
      // If it's already an embed URL, use it directly
      if (embedUrl.includes('youtube.com/embed/') || embedUrl.includes('youtube-nocookie.com/embed/')) {
        // Already an embed URL, use as-is
        mediaContent.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="width:100%;height:100%;border:none;display:block"></iframe>`;
        mediaContent.style.display = 'block';
        return;
      }
      
      // YouTube URL handling for watch URLs
      if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
        let videoId = '';
        
        // Extract video ID from various YouTube URL formats
        if (embedUrl.includes('youtube.com/watch?v=')) {
          const match = embedUrl.match(/[?&]v=([^&]+)/);
          videoId = match ? match[1] : '';
        } else if (embedUrl.includes('youtu.be/')) {
          const match = embedUrl.match(/youtu\.be\/([^?&]+)/);
          videoId = match ? match[1] : '';
        } else if (embedUrl.includes('youtube.com/embed/')) {
          const match = embedUrl.match(/embed\/([^?&]+)/);
          videoId = match ? match[1] : '';
        }
        
        // Build proper embed URL
        if (videoId) {
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      mediaContent.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="width:100%;height:100%;border:none;display:block"></iframe>`;
      mediaContent.style.display = 'block';
    }
  }

  window.switchMedia = function(type) {
    if (!currentEffectMedia) return;

    const gifBtn = document.getElementById('mtb-gif');
    const videoBtn = document.getElementById('mtb-video');

    if (type === 'gif') {
      showGif(currentEffectMedia.gif_url || currentEffectMedia.gifUrl);
      if (gifBtn) {
        gifBtn.classList.add('active');
        gifBtn.style.cssText = 'font-size:10px;font-family:var(--font-mono);padding:3px 11px;border-radius:var(--radius-pill);border:1px solid rgba(255,255,255,0.45);background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;transition:var(--tr);';
      }
      if (videoBtn) {
        videoBtn.classList.remove('active');
        videoBtn.style.cssText = 'font-size:10px;font-family:var(--font-mono);padding:3px 11px;border-radius:var(--radius-pill);border:1px solid rgba(255,255,255,0.18);background:transparent;color:rgba(255,255,255,0.55);cursor:pointer;transition:var(--tr);';
      }
    } else {
      showVideo(currentEffectMedia.video_url || currentEffectMedia.videoUrl);
      if (gifBtn) {
        gifBtn.classList.remove('active');
        gifBtn.style.cssText = 'font-size:10px;font-family:var(--font-mono);padding:3px 11px;border-radius:var(--radius-pill);border:1px solid rgba(255,255,255,0.18);background:transparent;color:rgba(255,255,255,0.55);cursor:pointer;transition:var(--tr);';
      }
      if (videoBtn) {
        videoBtn.classList.add('active');
        videoBtn.style.cssText = 'font-size:10px;font-family:var(--font-mono);padding:3px 11px;border-radius:var(--radius-pill);border:1px solid rgba(255,255,255,0.45);background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;transition:var(--tr);';
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     NODE GRAPH RENDERING
     ═══════════════════════════════════════════════════════════════ */
  function renderGraph(graphData) {
    viewport = document.getElementById('modal-graph-viewport');
    world = document.getElementById('modal-graph-world');
    svgEl = document.getElementById('modal-graph-svg');
    zoomLbl = document.getElementById('modal-graph-zoom');
    
    if (!viewport || !world || !svgEl || !graphData) return;

    // Clear previous
    world.innerHTML = '';
    world.appendChild(svgEl);
    svgEl.innerHTML = '';
    activeGnEl = null;

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    // World size
    let wW = 0, wH = 0;
    nodes.forEach(n => {
      if (n.x + NW + 50 > wW) wW = n.x + NW + 50;
      if (n.y + NH + 50 > wH) wH = n.y + NH + 50;
    });
    world.style.width = wW + 'px';
    world.style.height = wH + 'px';
    svgEl.setAttribute('width', wW);
    svgEl.setAttribute('height', wH);

    // Draw edges
    edges.forEach(edge => {
      const fn = nodes.find(n => n.id === edge.from);
      const tn = nodes.find(n => n.id === edge.to);
      if (!fn || !tn) return;

      const fp = { x: fn.x + NW, y: fn.y + NH / 2 };
      const tp = { 
        x: tn.x, 
        y: tn.y + (tn.ins === 1 ? NH / 2 : (NH / (tn.ins + 1)) * (edge.tp + 1))
      };
      
      const pull = Math.max(55, Math.abs(tp.x - fp.x) * 0.45);
      const d = `M ${fp.x} ${fp.y} C ${fp.x + pull} ${fp.y} ${tp.x - pull} ${tp.y} ${tp.x} ${tp.y}`;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(108,123,255,0.38)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
      svgEl.appendChild(path);
    });

    // Draw nodes
    nodes.forEach(node => {
      const col = getCatColor(node.type);
      const card = document.createElement('div');
      card.className = 'gn-card';
      card.style.cssText = `
        left: ${node.x}px;
        top: ${node.y}px;
        width: ${NW}px;
        height: ${NH}px;
        border-color: ${col.primary};
        background: ${col.bg};
      `;

      // Type dot
      const dot = document.createElement('div');
      dot.className = 'gn-typedot';
      dot.style.background = col.primary;
      card.appendChild(dot);

      // Labels
      const lw = document.createElement('div');
      lw.className = 'gn-labels';
      lw.innerHTML = `
        <div class="gn-type">${node.type}</div>
        <div class="gn-name">${escapeHtml(node.name)}</div>
      `;
      card.appendChild(lw);

      // Ports
      for (let i = 0; i < node.ins; i++) {
        const port = document.createElement('div');
        port.className = 'gn-port gn-port-in';
        port.style.cssText = `
          top: ${(NH / (node.ins + 1)) * (i + 1) - 4.5}px;
          border-color: ${col.primary};
        `;
        card.appendChild(port);
      }
      
      if (node.outs > 0) {
        const op = document.createElement('div');
        op.className = 'gn-port gn-port-out';
        op.style.cssText = `
          top: ${NH / 2 - 4.5}px;
          border-color: ${col.primary};
        `;
        card.appendChild(op);
      }

      // Click to inspect
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openNodePop(node, card);
      });

      world.appendChild(card);
    });

    // Wire events once
    if (!viewport._eventsWired) {
      viewport._eventsWired = true;
      viewport.addEventListener('mousedown', onMouseDown);
      viewport.addEventListener('wheel', onWheel, { passive: false });
      viewport.addEventListener('touchstart', onTouchStart, { passive: true });
      viewport.addEventListener('touchmove', onTouchMove, { passive: false });
      viewport.addEventListener('touchend', () => { lastTouches = null; dragging = false; });
      
      document.getElementById('modal-graph-zoom-in')?.addEventListener('click', () => {
        const vr = viewport.getBoundingClientRect();
        zoomAt(vr.width / 2, vr.height / 2, 1.25);
      });
      
      document.getElementById('modal-graph-zoom-out')?.addEventListener('click', () => {
        const vr = viewport.getBoundingClientRect();
        zoomAt(vr.width / 2, vr.height / 2, 0.8);
      });
      
      document.getElementById('modal-graph-fit')?.addEventListener('click', fitGraph);
    }

    fitGraph();
  }

  /* ═══════════════════════════════════════════════════════════════
     GRAPH PAN/ZOOM
     ═══════════════════════════════════════════════════════════════ */
  function applyXform() {
    if (world) {
      world.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
      if (zoomLbl) zoomLbl.textContent = Math.round(sc * 100) + '%';
    }
  }

  function clampScale(s) { return Math.max(0.15, Math.min(3, s)); }

  function zoomAt(cx, cy, factor) {
    const ns = clampScale(sc * factor);
    const wx = (cx - tx) / sc;
    const wy = (cy - ty) / sc;
    sc = ns;
    tx = cx - wx * sc;
    ty = cy - wy * sc;
    applyXform();
  }

  function fitGraph() {
    console.log('[fitGraph] ========== START ==========');
    
    // Use graphState if available, otherwise fall back to module-level variables
    var vp = graphState.vp || viewport;
    var wrld = graphState.world || world;
    
    console.log('[fitGraph] vp element:', vp ? (vp.id || 'no-id') : 'null');
    console.log('[fitGraph] world element:', wrld ? (wrld.id || 'no-id') : 'null');
    
    if (!vp || !wrld) {
      console.log('[fitGraph] ERROR: Missing elements');
      return;
    }
    
    // Reset any existing transform first
    wrld.style.transform = 'translate(0px, 0px) scale(1)';
    
    var vr = vp.getBoundingClientRect();
    console.log('[fitGraph] Viewport size:', vr.width.toFixed(0), 'x', vr.height.toFixed(0));
    
    // Reserve space at bottom for action buttons (Open in Editor, Expand)
    // Buttons are ~40px tall + 10px padding = 50px reserved
    var BUTTON_AREA_HEIGHT = 55;
    var pad = 10;
    
    var nodes = wrld.querySelectorAll('.gn-card');
    console.log('[fitGraph] Node count:', nodes.length);
    
    if (!nodes || nodes.length === 0) {
      console.log('[fitGraph] WARNING: No nodes found');
      return;
    }

    var mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
    nodes.forEach(function(n, i) {
      var x = parseFloat(n.style.left) || 0;
      var y = parseFloat(n.style.top) || 0;
      mnX = Math.min(mnX, x);
      mnY = Math.min(mnY, y);
      mxX = Math.max(mxX, x + NW);
      mxY = Math.max(mxY, y + NH);
      if (i < 3) console.log('[fitGraph] Node', i, 'at', x.toFixed(1), y.toFixed(1));
    });

    var gw = mxX - mnX;
    var gh = mxY - mnY;
    
    console.log('[fitGraph] Content bounds - min:', mnX.toFixed(1), mnY.toFixed(1), 'max:', mxX.toFixed(1), mxY.toFixed(1));
    console.log('[fitGraph] Content size:', gw.toFixed(1), 'x', gh.toFixed(1));
    
    // Ensure minimum dimensions
    gw = Math.max(gw, NW);
    gh = Math.max(gh, NH);
    
    // Calculate available space (reserve bottom area for buttons)
    var availW = Math.max(vr.width - pad * 2, 50);
    var availH = Math.max(vr.height - pad * 2 - BUTTON_AREA_HEIGHT, 50);
    
    console.log('[fitGraph] Available:', availW.toFixed(0), 'x', availH.toFixed(0), '(reserved', BUTTON_AREA_HEIGHT, 'px for buttons)');
    
    // Calculate scale to fit content in available space (above buttons)
    var scaleX = availW / gw;
    var scaleY = availH / gh;
    var newSc = Math.min(scaleX, scaleY, 1.5);
    
    // Clamp to reasonable limits
    newSc = clampScale(Math.max(newSc, 0.1));
    
    // Center horizontally
    var newTx = (vr.width - gw * newSc) / 2 - mnX * newSc;
    
    // Position vertically: center in available space (above buttons), then shift up
    // The available height is (vr.height - pad*2 - BUTTON_AREA_HEIGHT)
    // We want to center the content in that space, not the full viewport
    var contentTop = pad;
    var contentBottom = vr.height - pad - BUTTON_AREA_HEIGHT;
    var contentHeight = contentBottom - contentTop;
    var newTy = contentTop + (contentHeight - gh * newSc) / 2 - mnY * newSc;
    
    console.log('[fitGraph] Calculated scale:', newSc.toFixed(4));
    console.log('[fitGraph] Calculated translate:', newTx.toFixed(2), newTy.toFixed(2));
    
    // Update both states
    graphState.sc = newSc;
    graphState.tx = newTx;
    graphState.ty = newTy;
    sc = newSc;
    tx = newTx;
    ty = newTy;
    
    // Apply transform
    var transform = 'translate(' + newTx.toFixed(2) + 'px,' + newTy.toFixed(2) + 'px) scale(' + newSc.toFixed(4) + ')';
    console.log('[fitGraph] Applying transform:', transform);
    
    wrld.style.transform = transform;
    wrld.style.transformOrigin = '0 0';
    
    // Verify the transform was applied
    var applied = window.getComputedStyle(wrld).transform;
    console.log('[fitGraph] Applied transform (computed):', applied);
    
    // Update zoom label
    var zLbl = graphState.zLbl || zoomLbl;
    if (zLbl) {
      zLbl.textContent = Math.round(newSc * 100) + '%';
    }
    
    console.log('[fitGraph] ========== DONE ==========');
  }

  function onMouseDown(e) {
    if (e.target.closest('.gn-card')) return;
    dragging = true;
    dragX = e.clientX - tx;
    dragY = e.clientY - ty;
    viewport.classList.add('panning');
  }

  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const vr = viewport.getBoundingClientRect();
    zoomAt(e.clientX - vr.left, e.clientY - vr.top, e.deltaY < 0 ? 1.1 : 0.9);
  }

  function onTouchStart(e) { lastTouches = e.touches; }
  
  function onTouchMove(e) {
    e.preventDefault();
    if (!lastTouches) return;
    const vr = viewport.getBoundingClientRect();
    
    if (e.touches.length === 1 && lastTouches.length >= 1) {
      tx += e.touches[0].clientX - lastTouches[0].clientX;
      ty += e.touches[0].clientY - lastTouches[0].clientY;
      applyXform();
    } else if (e.touches.length === 2 && lastTouches.length === 2) {
      const d1 = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const d0 = Math.hypot(
        lastTouches[0].clientX - lastTouches[1].clientX,
        lastTouches[0].clientY - lastTouches[1].clientY
      );
      if (d0 > 0) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - vr.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - vr.top;
        zoomAt(cx, cy, d1 / d0);
      }
    }
    lastTouches = e.touches;
  }

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    tx = e.clientX - dragX;
    ty = e.clientY - dragY;
    applyXform();
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    viewport?.classList.remove('panning');
  });

  /* ═══════════════════════════════════════════════════════════════
     NODE POPOVER
     ═══════════════════════════════════════════════════════════════ */
  function openNodePop(node, el) {
    const pop = document.getElementById('modal-node-popover');
    if (!pop) return;
    
    if (activeGnEl) activeGnEl.classList.remove('g-active');
    activeGnEl = el;
    el.classList.add('g-active');

    const col = getCatColor(node.type);
    const ico = document.getElementById('modal-pop-ico');
    if (ico) {
      ico.textContent = node.type.slice(0, 2).toUpperCase();
      ico.style.cssText = `background: ${col.bg}; border: 1px solid ${col.primary}; color: ${col.primary};`;
    }

    document.getElementById('modal-pop-name').textContent = node.name;
    document.getElementById('modal-pop-cat').textContent = node.type + ' Node';
    document.getElementById('modal-pop-desc').textContent = node.desc || '';
    document.getElementById('modal-pop-tip').textContent = 'Tip: ' + (node.tip || 'Click parameters to edit values.');

    // Parameters
    const paramsWrap = document.getElementById('modal-pop-params-wrap');
    const paramsContainer = document.getElementById('modal-pop-params');
    if (node.params && node.params.length > 0) {
      paramsWrap.style.display = 'block';
      paramsContainer.innerHTML = node.params.map(p => `
        <div class="nql-row">
          <span class="nql-pname">${escapeHtml(p.name)}</span>
          <span class="nql-pval">${escapeHtml(p.val)}</span>
          <span class="nql-pdesc">${escapeHtml(p.desc)}</span>
        </div>
      `).join('');
    } else {
      paramsWrap.style.display = 'none';
    }

    // IO
    const ioWrap = document.getElementById('modal-pop-io-wrap');
    const ioContainer = document.getElementById('modal-pop-io');
    if (node.io && node.io.length > 0) {
      ioWrap.style.display = 'block';
      ioContainer.innerHTML = node.io.map(io => `
        <div class="nql-row">
          <span class="nql-port ${io.dir}">${escapeHtml(io.label)}</span>
          <span class="nql-pdesc">${escapeHtml(io.desc)}</span>
        </div>
      `).join('');
    } else {
      ioWrap.style.display = 'none';
    }

    pop.classList.add('open');

    // Position near card
    const rect = el.getBoundingClientRect();
    const pw = pop.offsetWidth || 320;
    const ph = pop.offsetHeight || 280;
    let top = rect.bottom + 8;
    let left = rect.left;
    
    if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
    if (left < 12) left = 12;
    if (top + ph > window.innerHeight - 12) top = rect.top - ph - 8;
    if (top < 12) top = 12;
    
    pop.style.cssText = `top: ${top}px; left: ${left}px;`;
  }

  function closeNodePop() {
    const pop = document.getElementById('modal-node-popover');
    if (pop) pop.classList.remove('open');
    if (activeGnEl) {
      activeGnEl.classList.remove('g-active');
      activeGnEl = null;
    }
  }

  window.closeNodePop = closeNodePop;

  /* ═══════════════════════════════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════════════════════════════ */
  window.copyNodeCode = function() {
    const code = document.getElementById('modal-node-code')?.textContent || '';
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {}
    
    const toast = document.getElementById('modal-toast');
    if (toast) {
      toast.classList.add('show');
      clearTimeout(toast._tid);
      toast._tid = setTimeout(() => toast.classList.remove('show'), 2200);
    }
  };

  // Close modal when clicking overlay
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('effect-modal-overlay');
    const pop = document.getElementById('modal-node-popover');
    
    if (modal && e.target === modal) {
      closeEffectModal();
    }
    
    if (pop && pop.classList.contains('open') && 
        !pop.contains(e.target) && !e.target.closest('.gn-card')) {
      closeNodePop();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Check if expanded graph modal is open - close it first
      var expandedModal = document.getElementById('expanded-graph-modal');
      if (expandedModal && expandedModal.style.display === 'flex') {
        expandedModal.style.display = 'none';
        // Reset main expand button text
        var gcExpand = document.getElementById('gcExpand');
        if (gcExpand) {
          gcExpand.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Expand';
        }
        return;
      }
      
      const pop = document.getElementById('modal-node-popover');
      if (pop?.classList.contains('open')) {
        closeNodePop();
      } else {
        closeEffectModal();
      }
    }
  });

  // Simple toast notification
  function showToast(msg) {
    let t = document.getElementById('effect-modal-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'effect-modal-toast';
      t.style.cssText = 'position:fixed;top:72px;right:1.5rem;background:rgba(15,168,136,0.15);backdrop-filter:blur(12px);border:1px solid rgba(15,168,136,0.3);color:#f4f4fb;padding:10px 18px;border-radius:14px;font-size:13px;opacity:0;transform:translateY(-6px);transition:all 240ms ease-out;pointer-events:none;z-index:9999;font-family:var(--font-body, sans-serif);';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-6px)';
    }, 2400);
  }

  // Share effect function
  window.shareEffect = function(effectId) {
    const url = `${window.location.origin}${window.location.pathname}?effect=${effectId}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard');
    }).catch(() => {
      showToast('Failed to copy link');
    });
  };

  // Edit effect function
  // Edit effect function - opens edit modal if available, otherwise navigates to edit page
  // Edit effect function - opens edit-effect-owner.html in seamless iframe
  window.editEffect = function(effectId) {
    // Close the effect detail modal first
    closeEffectModal();
    
    // Open seamless iframe with edit-effect-owner.html
    if (typeof window.openEditIframe === 'function') {
      window.openEditIframe(effectId);
    } else {
      // Fallback: navigate to standalone page
      window.location.href = `edit-effect-owner.html?id=${effectId}`;
    }
  };
  window.deleteEffect = function(effectId) {
    if (confirm('Are you sure you want to delete this effect?')) {
      // Get effects from localStorage
      let effects = JSON.parse(localStorage.getItem('effects') || '[]');
      effects = effects.filter(e => e.id !== effectId);
      localStorage.setItem('effects', JSON.stringify(effects));
      showToast('Effect deleted');
      closeEffectModal();
      // Refresh the page if we're on effects list
      if (window.location.pathname.includes('effects') || window.location.pathname.includes('community')) {
        window.location.reload();
      }
    }
  };

  // Check if effect is pinned (Supabase only - requires login)
  async function isEffectPinned(effectId) {
    if (!window._supabase || !window.CURRENT_USER_ID) return false;
    
    const { data } = await window._supabase
      .from('saved_effects')
      .select('id')
      .eq('user_id', window.CURRENT_USER_ID)
      .eq('effect_id', effectId)
      .single();
    return !!data;
  }

  // Get all pinned effects (Supabase only - requires login)
  async function getPinnedEffects() {
    console.log('[Effect Modal] getPinnedEffects called, CURRENT_USER_ID:', window.CURRENT_USER_ID);
    if (!window._supabase || !window.CURRENT_USER_ID) return [];
    
    // Query saved_effects with effects data using foreign key relationship
    const { data, error } = await window._supabase
      .from('saved_effects')
      .select('effect_id, created_at, effects(*)')
      .eq('user_id', window.CURRENT_USER_ID);
    
    if (error) {
      console.error('[Effect Modal] Error fetching saved effects:', error.message || error);
      return [];
    }
    
    console.log('[Effect Modal] Raw saved_effects data:', data);
    
    if (!data || !data.length) {
      console.log('[Effect Modal] No saved effects found');
      return [];
    }
    
    // Map the data - effects(*) returns an array, take first item
    const result = data.map(d => {
      console.log('[Effect Modal] Raw effect data:', d.effects);
      const effect = d.effects?.[0] || d.effects || {};
      // Handle possible field name variations
      return {
        id: d.effect_id,
        saved_at: d.created_at,
        ...effect,
        gifUrl: effect.gifUrl || effect.gif_url || effect.gifurl || ''
      };
    }).filter(e => e.id); // Filter out any empty entries
    
    console.log('[Effect Modal] Processed saved effects:', result.length, result.map(e => ({id: e.id, name: e.name, gifUrl: e.gifUrl})));
    return result;
  }

  // Show login prompt modal
  function showLoginPrompt() {
    const modal = document.createElement('div');
    modal.id = 'login-prompt-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(9,9,14,0.85);z-index:1000;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:var(--glass-bg,#0f0f16);border:1px solid var(--border-subtle);border-radius:18px;padding:2rem;max-width:360px;width:90%;text-align:center;box-shadow:var(--glass-shine),0 20px 60px rgba(0,0,0,0.5);">
        <div style="width:48px;height:48px;background:rgba(108,123,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
          <svg width="24" height="24" fill="none" stroke="#6c7bff" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-primary);">Save to Your Library</h3>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:1.5rem;">Sign in to save effects and access them from any device.</p>
        <div style="display:flex;gap:10px;">
          <button onclick="window.location.href='login.html'" style="flex:1;background:var(--violet);color:var(--ink);border:none;border-radius:var(--radius);padding:10px 16px;font-size:13px;font-weight:600;font-family:var(--font-body);cursor:pointer;transition:var(--tr);">Sign In</button>
          <button id="close-login-prompt" style="flex:1;background:var(--glass-bg);border:1px solid var(--border-subtle);color:var(--text-secondary);border-radius:var(--radius);padding:10px 16px;font-size:13px;font-family:var(--font-body);cursor:pointer;transition:var(--tr);">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close handlers
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'close-login-prompt') {
        modal.remove();
      }
    });
  }

  // Pin effect function - requires login
  window.pinEffect = async function(effectId) {
    // Check if logged in
    if (!window.CURRENT_USER_ID) {
      showLoginPrompt();
      return;
    }
    
    const isPinned = await isEffectPinned(effectId);
    
    if (isPinned) {
      // Unpin
      const { error } = await window._supabase
        .from('saved_effects')
        .delete()
        .eq('user_id', window.CURRENT_USER_ID)
        .eq('effect_id', effectId);
      if (error) {
        console.error('[Pin] Error removing:', error);
        showToast('Error removing from library');
        return;
      }
      showToast('Removed from your library');
      updatePinButtonUI(effectId, false);
      // Refresh saved effects tab if visible
      if (typeof renderSavedEffects === 'function') {
        renderSavedEffects();
      }
    } else {
      // Pin - save to Supabase
      console.log('[Pin] Saving effect:', effectId, 'for user:', window.CURRENT_USER_ID);
      const { error } = await window._supabase.from('saved_effects').insert({
        user_id: window.CURRENT_USER_ID,
        effect_id: effectId
      });
      if (error) {
        console.error('[Pin] Error saving:', error);
        showToast('Error saving to library');
        return;
      }
      console.log('[Pin] Saved successfully');
      showToast('Saved to your library');
      updatePinButtonUI(effectId, true);
      // Refresh saved effects tab if visible
      if (typeof renderSavedEffects === 'function') {
        renderSavedEffects();
      }
    }
  };

  // Update pin button appearance
  function updatePinButtonUI(effectId, isPinned) {
    const btn = document.querySelector(`button[onclick="pinEffect('${effectId}')"]`);
    if (btn) {
      if (isPinned) {
        btn.style.background = 'rgba(108,123,255,0.25)';
        btn.style.borderColor = 'rgba(108,123,255,0.6)';
        btn.style.color = 'var(--violet-light,#9ca8ff)';
        btn.innerHTML = '<svg width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
        btn.title = 'Remove from library';
      } else {
        btn.style.background = 'var(--glass-bg)';
        btn.style.borderColor = 'var(--border-subtle)';
        btn.style.color = 'var(--text-secondary)';
        btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
        btn.title = window.CURRENT_USER_ID ? 'Save to library' : 'Sign in to save';
      }
    }
  }

  // Expose utility to get saved effects for other pages
  window.getSavedEffects = getPinnedEffects;
  
  // Expose utility to check if effect is saved
  window.isEffectSaved = isEffectPinned;

  /* ═══════════════════════════════════════════════════════════════
     NODE GRAPH VIEWPORT (Full-page style pan/zoom)
     ═══════════════════════════════════════════════════════════════ */
  var graphState = {
    tx: 0, ty: 0, sc: 1,
    dragging: false, dX: 0, dY: 0,
    selNodeEl: null,
    vp: null, world: null, svgEl: null, zLbl: null,
    nodes: [], edges: []
  };
  
  var NW = 132, NH = 50;

  function initGraphViewport(nodeData) {
    graphState.nodes = nodeData.nodes || [];
    graphState.edges = nodeData.edges || [];
    
    // Try to find existing elements first
    graphState.vp = document.getElementById('graphVp');
    graphState.world = document.getElementById('graphWorld');
    graphState.svgEl = document.getElementById('graphSvg');
    graphState.zLbl = document.getElementById('gZoomLbl');
    
    // If elements don't exist, create them dynamically
    if (!graphState.vp) {
      console.log('[effect-modal] Creating graph container dynamically...');
      createGraphContainer();
      
      // Re-fetch after creation
      graphState.vp = document.getElementById('graphVp');
      graphState.world = document.getElementById('graphWorld');
      graphState.svgEl = document.getElementById('graphSvg');
      graphState.zLbl = document.getElementById('gZoomLbl');
    }
    
    if (!graphState.vp || !graphState.world || !graphState.svgEl) {
      console.error('[effect-modal] Failed to create graph elements');
      return;
    }
    
    buildGraphDOM();
    wireGraphEvents();
    
    // Multiple delayed calls to fitGraph to ensure proper positioning
    // First call after short delay for DOM
    setTimeout(function() {
      console.log('[initGraphViewport] First fit call');
      fitGraph();
    }, 50);
    
    // Second call after longer delay for any async rendering
    setTimeout(function() {
      console.log('[initGraphViewport] Second fit call');
      fitGraph();
    }, 200);
    
    // Third call as safety net
    setTimeout(function() {
      console.log('[initGraphViewport] Third fit call (safety)');
      fitGraph();
    }, 500);
  }

  function createGraphContainer() {
    // Find the node section to insert the graph
    var nodeSection = document.getElementById('modal-node-section');
    if (!nodeSection) {
      console.error('[effect-modal] modal-node-section not found');
      return;
    }
    
    // Find the accordion to insert before it
    var accordion = document.getElementById('modal-node-accordion');
    
    // Create graph container HTML with action buttons
    var graphHTML = 
      '<div class="graph-outer" style="border-radius:var(--radius,14px);overflow:hidden;border:1px solid rgba(255,255,255,0.06);position:relative;margin-bottom:12px;">' +
        '<div class="graph-viewport" id="graphVp" style="height:280px;background:#06060d;background-image:radial-gradient(circle,rgba(108,123,255,0.11) 1px,transparent 1px);background-size:22px 22px;overflow:hidden;cursor:grab;position:relative;">' +
          '<div class="graph-world" id="graphWorld" style="position:absolute;top:0;left:0;transform-origin:0 0;">' +
            '<svg class="graph-svg" id="graphSvg" style="position:absolute;top:0;left:0;pointer-events:none;overflow:visible;"></svg>' +
          '</div>' +
        '</div>' +
        '<div class="graph-controls" style="position:absolute;top:10px;right:10px;z-index:10;display:flex;gap:5px;">' +
          '<button class="gc-btn" id="gcIn" style="font-size:15px;width:32px;height:32px;border-radius:7px;">+</button>' +
          '<button class="gc-btn" id="gcOut" style="font-size:15px;width:32px;height:32px;border-radius:7px;">&minus;</button>' +
          '<button class="gc-btn gc-fit" id="gcFit" style="font-size:9px;width:auto;padding:6px 12px;letter-spacing:0.07em;border-radius:7px;">FIT</button>' +
        '</div>' +
        '<div class="graph-action-btns" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);z-index:10;display:flex;gap:8px;">' +
          '<button id="gcOpenEditor" style="background:rgba(6,6,13,0.85);backdrop-filter:blur(8px);border:1px solid rgba(108,123,255,0.3);border-radius:6px;color:var(--violet-light);font-family:var(--font-mono);font-size:10px;padding:6px 12px;letter-spacing:0.06em;cursor:pointer;transition:all 0.13s;display:flex;align-items:center;gap:6px;">' +
            '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
            'Open in Editor' +
          '</button>' +
          '<button id="gcExpand" style="background:rgba(6,6,13,0.85);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:rgba(255,255,255,0.8);font-family:var(--font-mono);font-size:10px;padding:6px 12px;letter-spacing:0.06em;cursor:pointer;transition:all 0.13s;display:flex;align-items:center;gap:6px;">' +
            '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>' +
            'Expand' +
          '</button>' +
        '</div>' +
         '<div class="graph-zoom-lbl" id="gZoomLbl" style="position:absolute;bottom:10px;left:12px;font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.22);letter-spacing:0.07em;pointer-events:none;z-index:10;">100%</div>' +
      '</div>';
    
    // Create a container div
    var container = document.createElement('div');
    container.innerHTML = graphHTML;
    
    // Insert before accordion if it exists, otherwise append to node section
    if (accordion && accordion.parentNode === nodeSection) {
      nodeSection.insertBefore(container.firstElementChild, accordion);
    } else {
      // Find the node count label and insert after it
      var nodeCount = document.getElementById('modal-node-count');
      if (nodeCount && nodeCount.parentNode && nodeCount.parentNode.parentNode === nodeSection) {
        nodeSection.insertBefore(container.firstElementChild, nodeCount.parentNode.nextSibling);
      } else {
        // Just insert at the beginning of the section after the first label
        var firstLabel = nodeSection.querySelector('.sec-lbl');
        if (firstLabel) {
          nodeSection.insertBefore(container.firstElementChild, firstLabel.nextSibling);
        } else {
          nodeSection.appendChild(container.firstElementChild);
        }
      }
    }
    
    console.log('[effect-modal] Graph container created dynamically');
  }

  function buildGraphDOM() {
    var vp = graphState.vp;
    var world = graphState.world;
    var svgEl = graphState.svgEl;
    var nodes = graphState.nodes;
    var edges = graphState.edges;
    
    // Calculate world bounds including min/max for proper canvas sizing
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function(n) {
      var nx = n.x || 0;
      var ny = n.y || 0;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + NW > maxX) maxX = nx + NW;
      if (ny + NH > maxY) maxY = ny + NH;
    });
    
    // Apply offset so all coordinates are positive
    var PAD = 50;
    var offsetX = minX < 0 ? -minX + PAD : PAD;
    var offsetY = minY < 0 ? -minY + PAD : PAD;
    
    // Store offset for animation use
    window._modalRenderOffsetX = offsetX;
    window._modalRenderOffsetY = offsetY;
    
    var wW = Math.max(maxX + offsetX + PAD, 800);
    var wH = Math.max(maxY + offsetY + PAD, 600);
    
    world.style.width = wW + 'px';
    world.style.height = wH + 'px';
    svgEl.setAttribute('width', wW);
    svgEl.setAttribute('height', wH);
    
    // Clear existing
    svgEl.innerHTML = '';
    var prevCards = world.querySelectorAll('.gn-card');
    prevCards.forEach(function(c) { world.removeChild(c); });
    
    // Map for edge drawing
    var nodeMap = {};
    nodes.forEach(function(n) { nodeMap[n.id] = n; });
    
    // Draw edges (SVG) with offset
    edges.forEach(function(e) {
      var fn = nodeMap[e.from];
      var tn = nodeMap[e.to];
      if (!fn || !tn) return;
      
      var fx = (fn.x || 0) + NW + offsetX;
      var fy = (fn.y || 0) + NH / 2 + offsetY;
      var tx = (tn.x || 0) + offsetX;
      var ty = (tn.y || 0) + NH / 2 + offsetY;
      var pull = Math.max(55, Math.abs(tx - fx) * 0.45);
      var d = 'M' + fx + ' ' + fy + ' C' + (fx + pull) + ' ' + fy + ' ' + (tx - pull) + ' ' + ty + ' ' + tx + ' ' + ty;
      
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(108,123,255,0.38)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
      svgEl.appendChild(path);
    });
    
    // Create or clear flow animation canvas INSIDE world element
    var flowCanvas = document.getElementById('flow-canvas');
    var worldW = parseInt(world.style.width) || 1200;
    var worldH = parseInt(world.style.height) || 800;
    
    if (!flowCanvas) {
      flowCanvas = document.createElement('canvas');
      flowCanvas.id = 'flow-canvas';
      flowCanvas.width = worldW;
      flowCanvas.height = worldH;
      flowCanvas.style.cssText = 'position:absolute;top:0;left:0;width:' + worldW + 'px;height:' + worldH + 'px;pointer-events:none;z-index:5;';
      world.appendChild(flowCanvas);
    } else {
      // Ensure canvas matches current world size
      if (flowCanvas.width !== worldW || flowCanvas.height !== worldH) {
        flowCanvas.width = worldW;
        flowCanvas.height = worldH;
        flowCanvas.style.width = worldW + 'px';
        flowCanvas.style.height = worldH + 'px';
      }
    }
    
    // Start flow animation
    startFlowAnimation(flowCanvas, nodes, edges);
    
    // Draw node cards with offset
    var cardOffsetX = window._modalRenderOffsetX || 0;
    var cardOffsetY = window._modalRenderOffsetY || 0;
    
    nodes.forEach(function(n) {
      var card = document.createElement('div');
      card.className = 'gn-card';
      card.dataset.id = n.id;
      card.style.left = ((n.x || 0) + cardOffsetX) + 'px';
      card.style.top = ((n.y || 0) + cardOffsetY) + 'px';
      card.style.width = NW + 'px';
      card.style.height = NH + 'px';
      card.style.borderColor = (n.catColor || '#6c7bff') + '55';
      // Convert hex to rgba with 0.13 opacity for background
      var hex = n.catColor || '#6c7bff';
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      card.style.background = 'rgba(' + r + ',' + g + ',' + b + ',0.13)';
      
      // Type dot
      var dot = document.createElement('div');
      dot.style.cssText = 'width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + (n.catColor || '#6c7bff') + ';';
      
      // Labels
      var labels = document.createElement('div');
      labels.style.cssText = 'min-width:0;flex:1;';
      var typeLabel = document.createElement('div');
      typeLabel.style.cssText = 'font-family:var(--font-mono, monospace);font-size:7.5px;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);line-height:1;margin-bottom:3px;';
      typeLabel.textContent = n.category || 'Custom';
      var nameLabel = document.createElement('div');
      nameLabel.style.cssText = 'font-family:var(--font-display, sans-serif);font-size:11px;font-weight:700;color:rgba(255,255,255,0.88);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;';
      nameLabel.textContent = n.fusionName || n.name;
      labels.appendChild(typeLabel);
      labels.appendChild(nameLabel);
      
      card.appendChild(dot);
      card.appendChild(labels);
      
      // Input port indicator (left side) - count based on incoming edges
      var inputCount = edges.filter(function(e) { return e.to === n.id; }).length;
      if (inputCount === 0 && n.category !== 'Source' && n.category !== 'Output') {
        inputCount = 1; // Default to 1 input for most nodes
      }
      for (var pi = 0; pi < inputCount; pi++) {
        var inPort = document.createElement('div');
        var portY = inputCount === 1 ? NH / 2 : (NH / (inputCount + 1)) * (pi + 1);
        inPort.style.cssText = 'position:absolute;width:9px;height:9px;border-radius:50%;border:1.5px solid ' + (n.catColor || '#6c7bff') + ';background:#06060d;left:-5px;top:' + (portY - 4.5) + 'px;';
        card.appendChild(inPort);
      }
      
      // Output port indicator (right side)
      var outputCount = edges.filter(function(e) { return e.from === n.id; }).length;
      if (outputCount > 0 || n.category === 'Source' || n.category !== 'Output') {
        var outPort = document.createElement('div');
        outPort.style.cssText = 'position:absolute;width:9px;height:9px;border-radius:50%;border:1.5px solid ' + (n.catColor || '#6c7bff') + ';background:#06060d;right:-5px;top:' + (NH / 2 - 4.5) + 'px;';
        card.appendChild(outPort);
      }
      
      // Click handler
      card.addEventListener('click', function(ev) {
        ev.stopPropagation();
        openNodeDetail(n, card);
      });
      
      world.appendChild(card);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     FLOW ANIMATION — Animated dashed lines on canvas overlay
     Canvas is INSIDE world element, so it inherits CSS transform automatically
     Draws in world coordinates directly (no manual transform calculations needed)
     Technique: ctx.setLineDash([DASH, GAP]) + animated lineDashOffset
     ══════════════════════════════════════════════════════════════════ */
  var flowAnimId = null;
  function startFlowAnimation(canvas, nodes, edges) {
    if (flowAnimId) cancelAnimationFrame(flowAnimId);
    
    var ctx = canvas.getContext('2d');
    var SPEED = 36;
    var DASH_LEN = 7;
    var DASH_GAP = 18;
    var PATTERN = DASH_LEN + DASH_GAP;
    var startTime = performance.now();
    
    var nodeMap = {};
    nodes.forEach(function(n) { nodeMap[n.id] = n; });
    
    var NW = 132, NH = 50;
    
    // Get render offset (same as nodes and SVG)
    var offX = window._modalRenderOffsetX || 0;
    var offY = window._modalRenderOffsetY || 0;
    
    function drawFlow(ts) {
      var elapsed = (ts - startTime) / 1000;
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      
      var dashOffset = -(elapsed * SPEED) % PATTERN;
      ctx.setLineDash([DASH_LEN, DASH_GAP]);
      ctx.lineDashOffset = dashOffset;
      
      // Canvas is INSIDE world element - draw in world coordinates directly
      // Apply offset to handle negative coordinates
      edges.forEach(function(e) {
        var fn = nodeMap[e.from];
        var tn = nodeMap[e.to];
        if (!fn || !tn) return;
        
        // World coordinates with offset (same as SVG paths and node cards)
        var fx = (fn.x || 0) + NW + offX;
        var fy = (fn.y || 0) + NH / 2 + offY;
        var tx2 = (tn.x || 0) + offX;
        var ty2 = (tn.y || 0) + NH / 2 + offY;
        
        var pull = Math.abs(tx2 - fx) * 0.45;
        var c1x = fx + pull, c1y = fy;
        var c2x = tx2 - pull, c2y = ty2;
        
        ctx.strokeStyle = 'rgba(108,123,255,0.55)';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = 'rgba(108,123,255,0.35)';
        ctx.shadowBlur = 4;
        
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tx2, ty2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      });
      
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      flowAnimId = requestAnimationFrame(drawFlow);
    }
    
    flowAnimId = requestAnimationFrame(drawFlow);
  }

  function wireGraphEvents() {
    var vp = graphState.vp;
    if (!vp || vp._wired) return;
    vp._wired = true;
    
    // Pan start
    vp.addEventListener('mousedown', function(e) {
      if (e.target.closest('.gn-card')) return;
      graphState.dragging = true;
      graphState.dX = e.clientX - graphState.tx;
      graphState.dY = e.clientY - graphState.ty;
      vp.classList.add('panning');
    });
    
    // Pan move
    document.addEventListener('mousemove', function(e) {
      if (!graphState.dragging) return;
      graphState.tx = e.clientX - graphState.dX;
      graphState.ty = e.clientY - graphState.dY;
      applyGraphTransform();
    });
    
    // Pan end
    document.addEventListener('mouseup', function() {
      graphState.dragging = false;
      vp.classList.remove('panning');
    });
    
    // Zoom with ctrl+scroll
    vp.addEventListener('wheel', function(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var r = vp.getBoundingClientRect();
      zoomGraphAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.1 : 0.9);
    }, { passive: false });
    
    // Zoom buttons
    var gcIn = document.getElementById('gcIn');
    var gcOut = document.getElementById('gcOut');
    var gcFit = document.getElementById('gcFit');
    
    if (gcIn) gcIn.addEventListener('click', function() {
      var r = vp.getBoundingClientRect();
      zoomGraphAt(r.width / 2, r.height / 2, 1.25);
    });
    
    if (gcOut) gcOut.addEventListener('click', function() {
      var r = vp.getBoundingClientRect();
      zoomGraphAt(r.width / 2, r.height / 2, 0.8);
    });
    
    if (gcFit) gcFit.addEventListener('click', fitGraph);
    
    // Action buttons
    var gcOpenEditor = document.getElementById('gcOpenEditor');
    var gcExpand = document.getElementById('gcExpand');
    
    if (gcOpenEditor) gcOpenEditor.addEventListener('click', function() {
      if (window.currentEffectId) {
        window.location.href = 'nodegraph.html?id=' + window.currentEffectId;
      }
    });
    
    if (gcExpand) gcExpand.addEventListener('click', function() {
      var existingModal = document.getElementById('expanded-graph-modal');
      if (existingModal && existingModal.style.display === 'flex') {
        // Toggle off - hide the modal
        existingModal.style.display = 'none';
        gcExpand.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Expand';
      } else {
        // Show or create the modal
        openExpandedGraphModal();
        gcExpand.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Close Expanded';
      }
    });
  }

  function openExpandedGraphModal() {
    // Create expanded graph modal if it doesn't exist
    var existingModal = document.getElementById('expanded-graph-modal');
    if (existingModal) {
      existingModal.style.display = 'flex';
      // Hide side panel and fit graph on reopen
      setTimeout(function() {
        hideSidePanelAndFitGraph();
      }, 50);
      return;
    }
    
    var modal = document.createElement('div');
    modal.id = 'expanded-graph-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(9,9,14,0.9);z-index:400;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;';
    
    var container = document.createElement('div');
    container.style.cssText = 'width:100%;max-width:95vw;height:92vh;background:#06060d;border-radius:var(--radius,14px);border:1px solid rgba(255,255,255,0.1);position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);';
    
    // Header
    var header = document.createElement('div');
    header.style.cssText = 'position:absolute;top:0;left:0;right:0;height:50px;background:rgba(6,6,13,0.8);border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;padding:0 20px;z-index:30;';
    header.innerHTML = '<span style="font-family:var(--font-display);font-size:14px;color:var(--text-primary);">Node Graph Preview</span>';
    
    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:5px 10px;transition:color 0.15s;';
    closeBtn.onmouseenter = function() { closeBtn.style.color = '#fff'; };
    closeBtn.onmouseleave = function() { closeBtn.style.color = 'rgba(255,255,255,0.6)'; };
    closeBtn.onclick = function() { 
      modal.style.display = 'none'; 
      // Reset main expand button text
      var gcExpand = document.getElementById('gcExpand');
      if (gcExpand) {
        gcExpand.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Expand';
      }
    };
    header.appendChild(closeBtn);
    
    // Graph viewport (clone of main graph) - bottom adjusts for compact step bar (40px)
    var viewport = document.createElement('div');
    viewport.id = 'expanded-graph-vp';
    viewport.style.cssText = 'position:absolute;top:50px;left:0;right:0;bottom:40px;background:#06060d;background-image:radial-gradient(circle,rgba(108,123,255,0.11) 1px,transparent 1px);background-size:22px 22px;overflow:hidden;cursor:grab;';
    
    var world = document.createElement('div');
    world.id = 'expanded-graph-world';
    world.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;transition:transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);';
    
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'expanded-graph-svg';
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;';
    
    world.appendChild(svg);
    viewport.appendChild(world);
    
    // Controls (start with video button in "off" state and controls at right edge)
    var controls = document.createElement('div');
    controls.id = 'expanded-controls';
    controls.style.cssText = 'position:absolute;top:70px;right:20px;z-index:20;display:flex;gap:4px;transition:right 0.25s ease;';
    controls.innerHTML = 
      '<button id="exp-zoom-in" style="background:rgba(6,6,13,0.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(255,255,255,0.55);font-family:var(--font-mono);font-size:14px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.13s;">+</button>' +
      '<button id="exp-zoom-out" style="background:rgba(6,6,13,0.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(255,255,255,0.55);font-family:var(--font-mono);font-size:14px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.13s;">&minus;</button>' +
      '<button id="exp-fit" style="background:rgba(6,6,13,0.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(255,255,255,0.55);font-family:var(--font-mono);font-size:9px;width:auto;padding:0 10px;letter-spacing:0.06em;cursor:pointer;transition:all 0.13s;">FIT</button>' +
      '<button id="exp-toggle-video" style="background:rgba(6,6,13,0.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(255,255,255,0.55);font-family:var(--font-mono);font-size:9px;width:auto;padding:0 10px;letter-spacing:0.06em;cursor:pointer;transition:all 0.13s;display:flex;align-items:center;gap:4px;"><svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>Video</button>';
    
    var zoomLbl = document.createElement('div');
    zoomLbl.id = 'exp-zoom-lbl';
    zoomLbl.style.cssText = 'position:absolute;bottom:20px;left:20px;font-family:var(--font-mono);font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.07em;pointer-events:none;z-index:10;';
    zoomLbl.textContent = '100%';
    
    container.appendChild(header);
    container.appendChild(viewport);
    container.appendChild(controls);
    container.appendChild(zoomLbl);
    
    // Floating video with invisible edge resize + free center for interaction
    var videoContainer = document.createElement('div');
    videoContainer.id = 'exp-video-section';
    videoContainer.style.cssText = 'position:absolute;top:110px;right:20px;width:320px;display:none;z-index:25;border-radius:8px;overflow:visible;background:#000;box-shadow:0 10px 40px rgba(0,0,0,0.5);';
    videoContainer.innerHTML = 
      '<div id="exp-video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">' +
        '<div id="exp-video-inner" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>' +
      '</div>' +
      // Close button (top-right inside video area)
      '<button id="exp-video-close" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.5);border:none;border-radius:4px;color:rgba(255,255,255,0.7);font-size:12px;cursor:pointer;padding:4px 8px;opacity:0;transition:opacity 0.2s;z-index:30;">&#x2715;</button>' +
      // Invisible edge zones for resize (10px each)
      '<div id="exp-edge-top" style="position:absolute;top:-5px;left:10px;right:10px;height:10px;cursor:ns-resize;z-index:20;background:transparent;"></div>' +
      '<div id="exp-edge-bottom" style="position:absolute;bottom:-5px;left:10px;right:10px;height:10px;cursor:ns-resize;z-index:20;background:transparent;"></div>' +
      '<div id="exp-edge-left" style="position:absolute;top:10px;bottom:10px;left:-5px;width:10px;cursor:ew-resize;z-index:20;background:transparent;"></div>' +
      '<div id="exp-edge-right" style="position:absolute;top:10px;bottom:10px;right:-5px;width:10px;cursor:ew-resize;z-index:20;background:transparent;"></div>' +
      // Invisible corners for diagonal resize (10x10px each)
      '<div id="exp-corner-tl" style="position:absolute;top:-5px;left:-5px;width:15px;height:15px;cursor:nwse-resize;z-index:21;background:transparent;"></div>' +
      '<div id="exp-corner-tr" style="position:absolute;top:-5px;right:-5px;width:15px;height:15px;cursor:nesw-resize;z-index:21;background:transparent;"></div>' +
      '<div id="exp-corner-bl" style="position:absolute;bottom:-5px;left:-5px;width:15px;height:15px;cursor:nesw-resize;z-index:21;background:transparent;"></div>' +
      '<div id="exp-corner-br" style="position:absolute;bottom:-5px;right:-5px;width:15px;height:15px;cursor:nwse-resize;z-index:21;background:transparent;"></div>' +
      // Invisible drag zone (center area, 20px strip at top of video)
      '<div id="exp-drag-zone" style="position:absolute;top:0;left:40px;right:40px;height:30px;cursor:grab;z-index:20;background:transparent;"></div>';
    
    // Node details panel (only shows when node selected)
    var nodePanel = document.createElement('div');
    nodePanel.id = 'exp-node-panel';
    nodePanel.style.cssText = 'position:absolute;top:50px;right:0;bottom:80px;width:360px;background:rgba(15,15,22,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,0.08);z-index:24;overflow-y:auto;display:none;';
    nodePanel.innerHTML = '<div id="exp-node-content" style="padding:16px;"><div style="font-size:11px;color:rgba(255,255,255,0.4);font-family:var(--font-mono);">Select a node to view parameters</div></div>';
    
    // Bottom bar for step navigation (collapsible, compact, full width)
    var bottomBar = document.createElement('div');
    bottomBar.id = 'expanded-bottom-bar';
    bottomBar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(15,15,22,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,0.08);z-index:26;display:flex;flex-direction:column;transition:height 0.3s ease;';
    
    // Header (clickable to toggle) - compact 40px height
    var bottomBarHeader = document.createElement('div');
    bottomBarHeader.id = 'exp-bottom-bar-header';
    bottomBarHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 16px;cursor:pointer;user-select:none;height:40px;box-sizing:border-box;';
    bottomBarHeader.innerHTML = 
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<svg class="exp-bottom-chevron" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:rgba(255,255,255,0.5);transition:transform 0.2s;"><polyline points="18 15 12 9 6 15"/></svg>' +
        '<span style="font-size:11px;color:var(--text-primary);font-weight:500;">Steps</span>' +
        '<span style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.5);"><span id="exp-step-current-header">1</span>/<span id="exp-step-total-header">5</span></span>' +
      '</div>' +
      '<div id="exp-step-preview" style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;">Loading...</div>';
    
    // Content (collapsible) - compact 80px height
    var bottomBarContent = document.createElement('div');
    bottomBarContent.id = 'exp-bottom-bar-content';
    bottomBarContent.style.cssText = 'overflow:hidden;transition:max-height 0.3s ease;';
    bottomBarContent.innerHTML = 
      '<div style="display:flex;align-items:center;padding:0 16px 12px;gap:12px;">' +
        '<button id="exp-step-prev-bottom" style="background:rgba(6,6,13,0.75);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:rgba(255,255,255,0.7);font-family:var(--font-mono);font-size:12px;width:28px;height:28px;cursor:pointer;flex-shrink:0;">&#x2190;</button>' +
        '<div style="flex:1;min-width:0;">' +
          '<div id="exp-step-content-bottom" style="font-size:12px;color:var(--text-secondary);line-height:1.5;max-height:60px;overflow-y:auto;">Loading...</div>' +
        '</div>' +
        '<button id="exp-step-next-bottom" style="background:rgba(6,6,13,0.75);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:rgba(255,255,255,0.7);font-family:var(--font-mono);font-size:12px;width:28px;height:28px;cursor:pointer;flex-shrink:0;">&#x2192;</button>' +
        '<div id="exp-step-dots-bottom" style="display:flex;gap:3px;flex-shrink:0;"></div>' +
      '</div>';
    
    bottomBar.appendChild(bottomBarHeader);
    bottomBar.appendChild(bottomBarContent);
    
    // Add elements to container
    container.appendChild(videoContainer);
    container.appendChild(nodePanel);
    container.appendChild(bottomBar);
    
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    // Store references for later use
    window.expandedVideoContainer = videoContainer;
    window.expandedNodePanel = nodePanel;
    window.expandedBottomBar = bottomBar;
    window.expandedBottomBarContent = bottomBarContent;
    window.expandedBottomBarHeader = bottomBarHeader;
    
    // Setup video: drag via top strip, resize via invisible edges/corners
    var videoCloseBtn = document.getElementById('exp-video-close');
    var dragZone = document.getElementById('exp-drag-zone');
    var edges = {
      top: document.getElementById('exp-edge-top'),
      bottom: document.getElementById('exp-edge-bottom'),
      left: document.getElementById('exp-edge-left'),
      right: document.getElementById('exp-edge-right')
    };
    var corners = {
      tl: document.getElementById('exp-corner-tl'),
      tr: document.getElementById('exp-corner-tr'),
      bl: document.getElementById('exp-corner-bl'),
      br: document.getElementById('exp-corner-br')
    };
    
    // Show/hide close button on hover
    videoContainer.addEventListener('mouseenter', function() {
      if (videoCloseBtn) videoCloseBtn.style.opacity = '1';
    });
    videoContainer.addEventListener('mouseleave', function() {
      if (videoCloseBtn) videoCloseBtn.style.opacity = '0';
    });
    
    // Drag and resize state
    var isDragging = false;
    var isResizing = false;
    var resizeDirection = '';
    var startX = 0, startY = 0;
    var startRect = {};
    var resizeOverlay = null; // Overlay to capture events during resize
    
    // MIN/MAX sizes
    var MIN_W = 200, MAX_W = 700;
    var MIN_H = 120, MAX_H = 500;
    
    // Helper: get current rect
    function getVideoRect() {
      var r = container.getBoundingClientRect();
      var w = parseInt(videoContainer.style.width) || 320;
      var right = parseInt(videoContainer.style.right) || 20;
      var top = parseInt(videoContainer.style.top) || 110;
      return {
        width: w,
        height: w * 0.5625, // 16:9
        right: right,
        top: top,
        left: r.width - right - w,
        bottom: top + w * 0.5625
      };
    }
    
    // Create resize overlay to capture mouse events during drag
    function createResizeOverlay() {
      if (resizeOverlay) return;
      resizeOverlay = document.createElement('div');
      resizeOverlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:inherit;user-select:none;-webkit-user-select:none;';
      document.body.appendChild(resizeOverlay);
      document.body.style.userSelect = 'none'; // Prevent text selection
    }
    
    function removeResizeOverlay() {
      if (resizeOverlay) {
        resizeOverlay.remove();
        resizeOverlay = null;
      }
      document.body.style.userSelect = ''; // Restore text selection
    }
    
    // Setup drag (top strip)
    if (dragZone) {
      dragZone.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isDragging = true;
        createResizeOverlay();
        dragZone.style.cursor = 'grabbing';
        if (resizeOverlay) resizeOverlay.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        var rect = getVideoRect();
        startRect = { right: rect.right, top: rect.top };
      });
    }
    
    // Setup edge resize
    Object.keys(edges).forEach(function(edge) {
      var el = edges[edge];
      if (!el) return;
      el.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isResizing = true;
        createResizeOverlay();
        if (resizeOverlay) resizeOverlay.style.cursor = el.style.cursor;
        resizeDirection = edge;
        startX = e.clientX;
        startY = e.clientY;
        var rect = getVideoRect();
        startRect = { width: rect.width, height: rect.height, right: rect.right, top: rect.top, left: rect.left };
      });
    });
    
    // Setup corner resize
    Object.keys(corners).forEach(function(corner) {
      var el = corners[corner];
      if (!el) return;
      el.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isResizing = true;
        createResizeOverlay();
        if (resizeOverlay) resizeOverlay.style.cursor = el.style.cursor;
        resizeDirection = corner; // 'tl', 'tr', 'bl', 'br'
        startX = e.clientX;
        startY = e.clientY;
        var rect = getVideoRect();
        startRect = { width: rect.width, height: rect.height, right: rect.right, top: rect.top, left: rect.left };
      });
    });
    
    // Global mousemove
    window.addEventListener('mousemove', function(e) {
      if (isDragging) {
        var dx = startX - e.clientX;
        var dy = e.clientY - startY;
        var containerRect = container.getBoundingClientRect();
        var w = parseInt(videoContainer.style.width) || 320;
        var newRight = Math.max(0, Math.min(containerRect.width - w, startRect.right + dx));
        var newTop = Math.max(50, Math.min(containerRect.height - 150, startRect.top + dy));
        videoContainer.style.right = newRight + 'px';
        videoContainer.style.top = newTop + 'px';
      } else if (isResizing) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var newW = startRect.width;
        var newRight = startRect.right;
        var newTop = startRect.top;
        var containerRect = container.getBoundingClientRect();
        
        // Resize logic: expand in the direction of the drag
        switch (resizeDirection) {
          case 'right':
            // Drag right = expand right (left edge stays)
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width + dx));
            newRight = startRect.right - (newW - startRect.width); // Keep left stationary
            break;
            
          case 'left':
            // Drag left = expand left (right edge stays)
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width - dx));
            // right stays same, width increases, so left moves left
            break;
            
          case 'bottom':
            // Just adjust height via width (maintain aspect by scaling width)
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width + dx));
            newRight = startRect.right - (newW - startRect.width) / 2; // Center expand
            break;
            
          case 'top':
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width - dy * 1.78)); // approximate 16:9 ratio
            newTop = startRect.top + (startRect.height - newW * 0.5625);
            break;
            
          case 'br': // bottom-right: expand right and down
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width + dx));
            newRight = startRect.right - (newW - startRect.width); // Keep left edge, expand right
            // Height auto-adjusts via 16:9 ratio, top stays same
            break;
            
          case 'bl': // bottom-left: expand left and down  
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width - dx));
            // Right edge stays same, left edge moves left
            newRight = startRect.right;
            break;
            
          case 'tr': // top-right: expand right and up
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width + dx));
            newRight = startRect.right - (newW - startRect.width); // Keep left edge
            newTop = startRect.top - (newW - startRect.width) * 0.5625; // Move top up proportionally
            break;
            
          case 'tl': // top-left: expand left and up
            newW = Math.max(MIN_W, Math.min(MAX_W, startRect.width - dx));
            newRight = startRect.right; // Right edge stays
            newTop = startRect.top - (newW - startRect.width) * 0.5625; // Move top up
            break;
        }
        
        // Clamp position to keep video in bounds
        newRight = Math.max(0, Math.min(containerRect.width - newW, newRight));
        newTop = Math.max(50, newTop);
        
        videoContainer.style.width = newW + 'px';
        videoContainer.style.right = newRight + 'px';
        videoContainer.style.top = newTop + 'px';
      }
    });
    
    // Global mouseup - always clean up
    window.addEventListener('mouseup', function() {
      if (isDragging && dragZone) {
        dragZone.style.cursor = 'grab';
      }
      isDragging = false;
      isResizing = false;
      resizeDirection = '';
      removeResizeOverlay();
    });
    
    // Video close button - pause and save timestamp to localStorage
    if (videoCloseBtn) {
      videoCloseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Pause video and save current time to localStorage
        if (window.expandedYTPlayer && window.expandedYTPlayer.pauseVideo) {
          var currentTime = window.expandedYTPlayer.getCurrentTime();
          var videoId = window._expandedVideoId;
          if (videoId) {
            localStorage.setItem('yt_video_time_' + videoId, currentTime.toString());
          }
          window.expandedYTPlayer.pauseVideo();
        }
        
        videoContainer.style.display = 'none';
        var toggleBtn = document.getElementById('exp-toggle-video');
        if (toggleBtn) {
          toggleBtn.style.background = 'rgba(6,6,13,0.75)';
          toggleBtn.style.borderColor = 'rgba(255,255,255,0.1)';
          toggleBtn.style.color = 'rgba(255,255,255,0.55)';
        }
      });
    }
    
    // Setup bottom bar toggle (compact: 40px collapsed, 120px expanded)
    var bottomBarExpanded = true;
    bottomBarHeader.addEventListener('click', function() {
      bottomBarExpanded = !bottomBarExpanded;
      var viewport = document.getElementById('expanded-graph-vp');
      if (bottomBarExpanded) {
        bottomBarContent.style.maxHeight = '80px';
        bottomBarHeader.querySelector('.exp-bottom-chevron').style.transform = 'rotate(180deg)';
        if (viewport) viewport.style.bottom = '120px';
      } else {
        bottomBarContent.style.maxHeight = '0';
        bottomBarHeader.querySelector('.exp-bottom-chevron').style.transform = 'rotate(0deg)';
        if (viewport) viewport.style.bottom = '40px';
      }
      // Recalculate fit after toggle
      var fitBtn = document.getElementById('exp-fit');
      if (fitBtn) setTimeout(function() { fitBtn.click(); }, 310);
    });
    // Start collapsed by default
    bottomBarContent.style.maxHeight = '0';
    bottomBarHeader.querySelector('.exp-bottom-chevron').style.transform = 'rotate(0deg)';
    bottomBarExpanded = false;
    
    // Setup toggle functionality
    setupExpandedToggles();
    
    // Populate data if available
    populateExpandedPanelData();
    
    // Render the graph in expanded view
    renderExpandedGraph(world, svg, zoomLbl);
    
    // Wire up expanded controls
    wireExpandedGraphEvents(viewport, world, svg, zoomLbl);
    
    // Hide side panel and fit graph to full screen on initial open
    setTimeout(function() {
      hideSidePanelAndFitGraph();
    }, 100);
  }
  
  function hideSidePanelAndFitGraph() {
    var panel = document.getElementById('expanded-node-panel');
    var controls = document.getElementById('expanded-controls');
    var toggleBtn = document.getElementById('exp-toggle-video');
    var fitBtn = document.getElementById('exp-fit');
    var sections = window.expandedSections;
    
    // Hide side panel
    if (panel) {
      panel.style.display = 'none';
    }
    
    // Move controls to right edge (no panel)
    if (controls) {
      controls.style.right = '20px';
    }
    
    // Update toggle button to "off" state and hide video container
    if (toggleBtn) {
      toggleBtn.style.background = 'rgba(6,6,13,0.75)';
      toggleBtn.style.borderColor = 'rgba(255,255,255,0.1)';
      toggleBtn.style.color = 'rgba(255,255,255,0.55)';
    }
    var videoContainer = document.getElementById('exp-video-section');
    if (videoContainer) {
      videoContainer.style.display = 'none';
    }
    
    // Auto-fit graph to use full screen width
    if (fitBtn) {
      fitBtn.click();
    }
  }

  function renderExpandedGraph(world, svg, zoomLbl) {
    var nodes = window.currentNodeData ? window.currentNodeData.nodes : [];
    var edges = window.currentNodeData ? window.currentNodeData.edges : [];
    
    if (!nodes.length) return;
    
    var NW = 132, NH = 50;
    
    // Calculate world bounds - find actual min/max of all nodes
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function(n) {
      var nx = n.x || 0;
      var ny = n.y || 0;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + NW > maxX) maxX = nx + NW;
      if (ny + NH > maxY) maxY = ny + NH;
    });
    
    // Ensure padding and minimum size, allow up to 12k for large graphs
    var PAD = 100;
    var MIN_SIZE = 800;
    var MAX_SIZE = 12000;
    var wW = Math.min(Math.max(maxX - minX + PAD * 2, MIN_SIZE), MAX_SIZE);
    var wH = Math.min(Math.max(maxY - minY + PAD * 2, MIN_SIZE), MAX_SIZE);
    
    // Store bounds for animation use
    window._expandedWorldBounds = { minX: minX, minY: minY, maxX: maxX, maxY: maxY, pad: PAD };
    
    // Apply offset so all coordinates are positive within the world
    var offsetX = minX < 0 ? -minX + PAD : PAD;
    var offsetY = minY < 0 ? -minY + PAD : PAD;
    window._expandedRenderOffsetX = offsetX;
    window._expandedRenderOffsetY = offsetY;
    
    // Adjust world size to include offset
    wW = Math.min(Math.max(maxX + offsetX + PAD, MIN_SIZE), MAX_SIZE);
    wH = Math.min(Math.max(maxY + offsetY + PAD, MIN_SIZE), MAX_SIZE);
    
    world.style.width = wW + 'px';
    world.style.height = wH + 'px';
    svg.setAttribute('width', wW);
    svg.setAttribute('height', wH);
    
    // Clear existing
    svg.innerHTML = '';
    world.innerHTML = '';
    world.appendChild(svg);
    
    // Draw edges with offset
    var nodeMap = {};
    var edgeOffX = window._expandedRenderOffsetX || 0;
    var edgeOffY = window._expandedRenderOffsetY || 0;
    nodes.forEach(function(n) { nodeMap[n.id] = n; });
    
    edges.forEach(function(e) {
      var fn = nodeMap[e.from];
      var tn = nodeMap[e.to];
      if (!fn || !tn) return;
      
      var fx = (fn.x || 0) + NW + edgeOffX;
      var fy = (fn.y || 0) + NH / 2 + edgeOffY;
      var tx = (tn.x || 0) + edgeOffX;
      var ty = (tn.y || 0) + NH / 2 + edgeOffY;
      var pull = Math.max(55, Math.abs(tx - fx) * 0.45);
      var d = 'M' + fx + ' ' + fy + ' C' + (fx + pull) + ' ' + fy + ' ' + (tx - pull) + ' ' + ty + ' ' + tx + ' ' + ty;
      
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(108,123,255,0.38)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
    });
    
    // Draw nodes (same styling as main graph) - with offset for proper positioning
    var offX = window._expandedRenderOffsetX || 0;
    var offY = window._expandedRenderOffsetY || 0;
    
    nodes.forEach(function(n) {
      var card = document.createElement('div');
      var nx = (n.x || 0) + offX;
      var ny = (n.y || 0) + offY;
      card.style.cssText = 'position:absolute;left:' + nx + 'px;top:' + ny + 'px;width:' + NW + 'px;height:' + NH + 'px;display:flex;align-items:center;gap:7px;border-radius:6px;border:1px solid ' + (n.catColor || '#6c7bff') + '55;cursor:pointer;padding:0 10px;transition:filter 0.12s,box-shadow 0.12s;background:rgba(' + parseInt((n.catColor || '#6c7bff').slice(1,3),16) + ',' + parseInt((n.catColor || '#6c7bff').slice(3,5),16) + ',' + parseInt((n.catColor || '#6c7bff').slice(5,7),16) + ',0.13);';
      
      var dot = document.createElement('div');
      dot.style.cssText = 'width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + (n.catColor || '#6c7bff') + ';';
      
      var labels = document.createElement('div');
      labels.style.cssText = 'min-width:0;flex:1;';
      var typeLabel = document.createElement('div');
      typeLabel.style.cssText = 'font-family:var(--font-mono,monospace);font-size:7.5px;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);line-height:1;margin-bottom:3px;';
      typeLabel.textContent = n.category || 'Custom';
      var nameLabel = document.createElement('div');
      nameLabel.style.cssText = 'font-family:var(--font-display,sans-serif);font-size:11px;font-weight:700;color:rgba(255,255,255,0.88);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;';
      nameLabel.textContent = n.fusionName || n.name;
      labels.appendChild(typeLabel);
      labels.appendChild(nameLabel);
      
      card.appendChild(dot);
      card.appendChild(labels);
      
      // Click handler to show node details in side panel
      card.addEventListener('click', function(ev) {
        ev.stopPropagation();
        showNodeInSidePanel(n);
      });
      
      world.appendChild(card);
    });
    
    // Add flow animation canvas INSIDE world element (inherits CSS transform)
    if (world) {
      var flowCanvas = document.createElement('canvas');
      flowCanvas.id = 'expanded-flow-canvas';
      // Match world dimensions, positioned absolutely within world
      var wW = parseInt(world.style.width) || 1200;
      var wH = parseInt(world.style.height) || 800;
      flowCanvas.width = wW;
      flowCanvas.height = wH;
      flowCanvas.style.cssText = 'position:absolute;top:0;left:0;width:' + wW + 'px;height:' + wH + 'px;pointer-events:none;z-index:5;';
      world.appendChild(flowCanvas);
      
      // Start flow animation for expanded view
      startExpandedFlowAnimation(flowCanvas, nodes, edges);
    }
    
    // Auto-fit
    var vp = document.getElementById('expanded-graph-vp');
    if (vp) {
      var r = vp.getBoundingClientRect();
      var pad = 40;
      var vW = r.width - pad * 2;
      var vH = r.height - pad * 2;
      
      var mnX = 9999, mnY = 9999, mxX = -9999, mxY = -9999;
      nodes.forEach(function(n) {
        var nx = n.x || 0;
        var ny = n.y || 0;
        if (nx < mnX) mnX = nx;
        if (ny < mnY) mnY = ny;
        if (nx + NW > mxX) mxX = nx + NW;
        if (ny + NH > mxY) mxY = ny + NH;
      });
      
      var contentW = mxX - mnX;
      var contentH = mxY - mnY;
      var sc = Math.max(0.15, Math.min(3, Math.min(vW / contentW, vH / contentH)));
      var tx = (r.width - contentW * sc) / 2 - mnX * sc;
      var ty = (r.height - contentH * sc) / 2 - mnY * sc;
      
      world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
      zoomLbl.textContent = Math.round(sc * 100) + '%';
    }
  }

  function showNodeInSidePanel(node) {
    var nodePanel = document.getElementById('exp-node-panel');
    var nodeContent = document.getElementById('exp-node-content');
    var controls = document.getElementById('expanded-controls');
    if (!nodePanel || !nodeContent) return;
    
    // Get animation range for this node - handle nested structure
    var frameRange = { start: 0, end: 100 };
    var allKeyframes = [];
    var params = node.params || {};
    var hasAnimation = false;
    var hasParams = false;
    
    // Traverse nested structure: params[tableKey] = { table: "Transform", params: { ... } }
    Object.values(params).forEach(function(tableGroup) {
      if (tableGroup && typeof tableGroup === 'object' && tableGroup.params) {
        hasParams = true;
        var nestedParams = tableGroup.params;
        Object.values(nestedParams).forEach(function(param) {
          if (param.keyframes && param.keyframes.length > 0) {
            hasAnimation = true;
            param.keyframes.forEach(function(kf) {
              allKeyframes.push(kf.frame);
              frameRange.start = Math.min(frameRange.start, kf.frame);
              frameRange.end = Math.max(frameRange.end, kf.frame);
            });
          }
        });
      } else {
        // Flat structure fallback
        hasParams = true;
        var param = tableGroup;
        if (param.keyframes && param.keyframes.length > 0) {
          hasAnimation = true;
          param.keyframes.forEach(function(kf) {
            allKeyframes.push(kf.frame);
            frameRange.start = Math.min(frameRange.start, kf.frame);
            frameRange.end = Math.max(frameRange.end, kf.frame);
          });
        }
      }
    });
    
    // Build node details content with timeline integration
    var html = 
      '<div style="padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:12px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:' + (node.catColor || '#6c7bff') + ';flex-shrink:0;"></div>' +
          '<div style="min-width:0;flex:1;">' +
            '<div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (node.fusionName || node.name) + '</div>' +
            '<div style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.07em;margin-top:2px;">' + (node.category || 'Custom') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    
    // Always show value display container (works for animated and static)
    html += '<div id="value-display-' + node.id + '" style="margin-bottom:16px;"></div>';
    
    // Add timeline only if animation exists
    if (hasAnimation) {
      html += '<div id="timeline-container-' + node.id + '" style="margin-bottom:16px;"></div>';
    }
    
    // Show the panel
    nodePanel.style.display = 'block';
    
    // Update content
    nodeContent.innerHTML = html;
    
    // Position controls to accommodate panel
    if (controls) {
      controls.style.right = '380px';
    }
    
    // Initialize value display component (works with or without animation)
    if (window.ParameterValueDisplay) {
      var valueContainer = document.getElementById('value-display-' + node.id);
      
      if (valueContainer) {
        var valueDisplay = new window.ParameterValueDisplay(valueContainer, {
          node: node,
          currentFrame: hasAnimation ? Math.floor(frameRange.start) : 0,
          onParamClick: function(key, param) {
            // Show detailed spline view for clicked parameter
            if (window.showParamDetail) {
              window.showParamDetail(node, key, param);
            } else {
              console.warn('[EffectModal] showParamDetail not available');
            }
          }
        });
        
        // Store reference for cleanup
        nodePanel._valueDisplay = valueDisplay;
      }
    }
    
    // Initialize timeline if animation exists
    if (hasAnimation && window.TimelineScrubber) {
      var timelineContainer = document.getElementById('timeline-container-' + node.id);
      
      if (timelineContainer && nodePanel._valueDisplay) {
        var timeline = new window.TimelineScrubber(timelineContainer, {
          startFrame: Math.floor(frameRange.start),
          endFrame: Math.ceil(frameRange.end),
          currentFrame: Math.floor(frameRange.start),
          keyframes: allKeyframes,
          onFrameChange: function(frame) {
            // Update value display when frame changes
            nodePanel._valueDisplay.setFrame(frame);
          }
        });
        
        // Store reference for cleanup
        nodePanel._timeline = timeline;
      }
    }
  }

  function drawMiniSpline(canvas, param) {
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    
    var kfs = param.keyframes.slice().sort(function(a, b) { return a.frame - b.frame; });
    if (!kfs.length) return;
    
    var PAD = { l: 8, r: 8, t: 8, b: 20 };
    var gW = w - PAD.l - PAD.r, gH = h - PAD.t - PAD.b;
    
    var minF = kfs[0].frame, maxF = kfs[kfs.length - 1].frame;
    var minV = Infinity, maxV = -Infinity;
    kfs.forEach(function(k) {
      var v = parseFloat(k.value !== undefined ? k.value : k.val || 0);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    });
    
    if (minF === maxF) { minF -= 1; maxF += 1; }
    if (minV === maxV) { minV -= 0.1; maxV += 0.1; }
    
    var tx = function(f) { return PAD.l + (f - minF) / (maxF - minF) * gW; };
    var ty = function(v) { return PAD.t + (1 - (v - minV) / (maxV - minV)) * gH; };
    
    // Clear
    ctx.fillStyle = '#0d0d10';
    ctx.fillRect(0, 0, w, h);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, h - PAD.b);
    ctx.lineTo(w - PAD.r, h - PAD.b);
    ctx.stroke();
    
    // Curve
    ctx.strokeStyle = '#f0c060';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < kfs.length - 1; i++) {
      var k0 = kfs[i], k1 = kfs[i+1];
      var v0 = parseFloat(k0.value !== undefined ? k0.value : k0.val || 0);
      var v1 = parseFloat(k1.value !== undefined ? k1.value : k1.val || 0);
      var x0 = tx(k0.frame), y0 = ty(v0), x3 = tx(k1.frame), y3 = ty(v1);
      var cp1x = x0 + (x3 - x0) / 3, cp1y = y0;
      var cp2x = x3 - (x3 - x0) / 3, cp2y = y3;
      if (i === 0) ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
    }
    ctx.stroke();
    
    // Keyframe diamonds
    kfs.forEach(function(k) {
      var v = parseFloat(k.value !== undefined ? k.value : k.val || 0);
      var px = tx(k.frame), py = ty(v);
      ctx.fillStyle = '#f0c060';
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px + 4, py);
      ctx.lineTo(px, py + 4);
      ctx.lineTo(px - 4, py);
      ctx.closePath();
      ctx.fill();
    });
    
    // Frame labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px DM Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(minF), PAD.l, h - 6);
    ctx.fillText(Math.round(maxF), w - PAD.r, h - 6);
  }

  function closeSidePanel() {
    // Hide the node panel and reset controls
    var nodePanel = document.getElementById('exp-node-panel');
    var controls = document.getElementById('expanded-controls');
    if (nodePanel) {
      nodePanel.style.display = 'none';
    }
    if (controls) {
      controls.style.right = '20px';
    }
  }
  window.closeSidePanel = closeSidePanel;

  /**
   * Show detailed spline editor for a specific parameter
   * Opens a modal with full spline view and keyframe editing
   */
  function showParamDetail(node, paramKey, param) {
    console.log('[showParamDetail] Opening detail for', paramKey, param);
    
    // Remove any existing param detail modal
    var existing = document.getElementById('param-detail-modal');
    if (existing) existing.remove();

    // Create modal overlay
    var overlay = document.createElement('div');
    overlay.id = 'param-detail-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(9,9,14,0.85);z-index:400;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';

    // Modal container
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#141419;border:1px solid rgba(108,123,255,0.3);border-radius:12px;width:90%;max-width:700px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.5);';

    // Header
    var isConnected = param.v === '—' && param.sourceOp;
    var isPolyline = param.type === 'polyline' || (typeof param.value === 'string' && param.value.includes('points'));
    var paramTypeLabel = param.keyframes ? (param.keyframes.length + ' keyframes') : 
                         isConnected ? 'Connected' : 
                         isPolyline ? 'Polyline' : 'Static';
    
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);';
    header.innerHTML = 
      '<div>' +
        '<div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:#fff;">' + escapeHtml(paramKey) + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">' + 
          (node.fusionName || node.name) + ' • ' + paramTypeLabel + 
        '</div>' +
      '</div>' +
      '<button id="param-detail-close" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:20px;padding:4px 8px;border-radius:4px;transition:all 0.15s;">&#x2715;</button>';

    // Content area with spline canvas
    var content = document.createElement('div');
    content.style.cssText = 'padding:20px;flex:1;overflow:hidden;';

    if (param.keyframes && param.keyframes.length > 0) {
      // Canvas container
      var canvasContainer = document.createElement('div');
      canvasContainer.style.cssText = 'background:#0d0d10;border-radius:8px;border:1px solid rgba(255,255,255,0.08);height:300px;position:relative;';
      
      var canvas = document.createElement('canvas');
      canvas.id = 'param-detail-canvas';
      canvas.style.cssText = 'width:100%;height:100%;display:block;';
      canvasContainer.appendChild(canvas);
      content.appendChild(canvasContainer);

      // Keyframe list
      var kfList = document.createElement('div');
      kfList.style.cssText = 'margin-top:16px;max-height:150px;overflow-y:auto;font-family:var(--font-mono);font-size:11px;';
      
      var sortedKfs = param.keyframes.slice().sort(function(a, b) { return a.frame - b.frame; });
      var kfHtml = '<div style="display:grid;grid-template-columns:80px 1fr 100px;gap:8px;padding:8px 12px;background:rgba(108,123,255,0.1);border-radius:6px;margin-bottom:8px;font-weight:600;color:var(--violet-light);">' +
        '<div>Frame</div><div>Value</div><div>Type</div></div>';
      
      sortedKfs.forEach(function(kf, i) {
        var val = parseFloat(kf.value !== undefined ? kf.value : kf.val || 0);
        var type = kf.hold ? 'Hold' : (kf.rh || kf.lh ? 'Bezier' : 'Linear');
        kfHtml += '<div style="display:grid;grid-template-columns:80px 1fr 100px;gap:8px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:4px;color:rgba(255,255,255,0.8);">' +
          '<div>' + kf.frame + '</div>' +
          '<div>' + val.toFixed(4) + '</div>' +
          '<div style="color:' + (type === 'Bezier' ? '#f0c060' : type === 'Hold' ? '#ef4444' : '#22d3ee') + ';">' + type + '</div>' +
        '</div>';
      });
      
      kfList.innerHTML = kfHtml;
      content.appendChild(kfList);

      // Draw the spline after DOM insertion
      setTimeout(function() {
        drawParamDetailSpline(canvas, sortedKfs);
      }, 10);
      } else {
        // Check if this is a connected parameter
        var isConnected = param.v === '—' && param.sourceOp;
        var isPolyline = param.type === 'polyline' || (typeof param.value === 'string' && param.value.includes('points'));
        
        if (isConnected) {
          content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.5);">' +
            '<div style="font-size:48px;margin-bottom:16px;">&#x2190;</div>' +
            '<div style="font-family:var(--font-display);font-size:16px;margin-bottom:8px;">Connected Parameter</div>' +
            '<div style="font-size:13px;">This parameter receives its value from another node.</div>' +
            '<div style="font-family:var(--font-mono);font-size:14px;margin-top:16px;padding:12px 20px;background:rgba(108,123,255,0.1);border-radius:6px;display:inline-block;color:#fff;">' +
              'Source: <span style="color:var(--violet-light);">' + escapeHtml(param.sourceOp) + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:12px;">' +
              'Click on the <strong>' + escapeHtml(param.sourceOp) + '</strong> node to see its output values.' +
            '</div>' +
          '</div>';
        } else if (isPolyline) {
          content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.5);">' +
            '<div style="font-size:48px;margin-bottom:16px;">&#x27F3;</div>' +
            '<div style="font-family:var(--font-display);font-size:16px;margin-bottom:8px;">Polyline Path</div>' +
            '<div style="font-size:13px;">This parameter contains a path with control points.</div>' +
            '<div style="font-family:var(--font-mono);font-size:14px;margin-top:16px;padding:12px 20px;background:rgba(160,174,255,0.15);border-radius:6px;display:inline-block;color:#fff;">' +
              escapeHtml(param.value) +
            '</div>' +
            '<div style="margin-top:16px;padding:12px 16px;background:rgba(255,255,255,0.05);border-radius:6px;max-width:400px;margin-left:auto;margin-right:auto;">' +
              '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">Raw Data:</div>' +
              '<pre style="font-family:var(--font-mono);font-size:10px;color:rgba(255,255,255,0.4);margin:0;white-space:pre-wrap;word-break:break-all;text-align:left;max-height:150px;overflow-y:auto;">' + escapeHtml(param.raw || 'N/A') + '</pre>' +
            '</div>' +
          '</div>';
        } else {
          content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.5);">' +
            '<div style="font-size:48px;margin-bottom:16px;">&#x23F8;</div>' +
            '<div style="font-family:var(--font-display);font-size:16px;margin-bottom:8px;">Static Parameter</div>' +
            '<div style="font-size:13px;">This parameter has no animation keyframes.</div>' +
            '<div style="font-family:var(--font-mono);font-size:14px;margin-top:16px;padding:12px 20px;background:rgba(108,123,255,0.1);border-radius:6px;display:inline-block;color:#fff;">' +
              'Value: ' + (param.v !== undefined ? param.v : param.value !== undefined ? param.value : 'N/A') +
            '</div>' +
          '</div>';
        }
      }

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Close handlers
    var closeBtn = document.getElementById('param-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeParamDetail);
      closeBtn.addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.1)'; this.style.color = '#fff'; });
      closeBtn.addEventListener('mouseleave', function() { this.style.background = 'none'; this.style.color = 'rgba(255,255,255,0.6)'; });
    }
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeParamDetail();
    });
  }
  window.showParamDetail = showParamDetail;

  function closeParamDetail() {
    var modal = document.getElementById('param-detail-modal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  }
  window.closeParamDetail = closeParamDetail;

  /**
   * Draw detailed spline view for param detail modal
   */
  function drawParamDetailSpline(canvas, keyframes) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    var w = rect.width, h = rect.height;
    var PAD = { l: 50, r: 20, t: 30, b: 40 };
    var gW = w - PAD.l - PAD.r, gH = h - PAD.t - PAD.b;

    // Calculate ranges
    var minF = keyframes[0].frame, maxF = keyframes[keyframes.length - 1].frame;
    var minV = Infinity, maxV = -Infinity;
    keyframes.forEach(function(k) {
      var v = parseFloat(k.value !== undefined ? k.value : k.val || 0);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    });

    if (minF === maxF) { minF -= 1; maxF += 1; }
    if (minV === maxV) { minV -= 0.1; maxV += 0.1; }

    var tx = function(f) { return PAD.l + (f - minF) / (maxF - minF) * gW; };
    var ty = function(v) { return PAD.t + (1 - (v - minV) / (maxV - minV)) * gH; };

    // Clear
    ctx.fillStyle = '#0d0d10';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 5; i++) {
      var y = PAD.t + (gH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(PAD.l, y);
      ctx.lineTo(w - PAD.r, y);
      ctx.stroke();
    }
    for (var i = 0; i <= 5; i++) {
      var x = PAD.l + (gW / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, PAD.t);
      ctx.lineTo(x, h - PAD.b);
      ctx.stroke();
    }

    // Frame axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px DM Mono, monospace';
    ctx.textAlign = 'center';
    for (var i = 0; i <= 5; i++) {
      var f = Math.round(minF + (maxF - minF) * (i / 5));
      var x = PAD.l + (gW / 5) * i;
      ctx.fillText(f, x, h - 15);
    }

    // Value axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var i = 0; i <= 5; i++) {
      var v = minV + (maxV - minV) * (1 - i / 5);
      var y = PAD.t + (gH / 5) * i;
      ctx.fillText(v.toFixed(2), PAD.l - 8, y);
    }

    // Axis titles
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Value', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillText('Frame', w / 2 + PAD.l / 2, h - 5);

    // Spline curve
    ctx.strokeStyle = '#f0c060';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < keyframes.length - 1; i++) {
      var k0 = keyframes[i], k1 = keyframes[i + 1];
      var v0 = parseFloat(k0.value !== undefined ? k0.value : k0.val || 0);
      var v1 = parseFloat(k1.value !== undefined ? k1.value : k1.val || 0);
      var x0 = tx(k0.frame), y0 = ty(v0), x3 = tx(k1.frame), y3 = ty(v1);
      
      if (i === 0) ctx.moveTo(x0, y0);

      if (k0.hold) {
        // Hold interpolation - flat line then jump
        ctx.lineTo(x3, y0);
        ctx.lineTo(x3, y3);
      } else if (k0.rh || k1.lh) {
        // Bezier with handles
        var cp1x = k0.rh ? tx(k0.rh.x) : x0 + (x3 - x0) / 3;
        var cp1y = k0.rh ? ty(k0.rh.y) : y0;
        var cp2x = k1.lh ? tx(k1.lh.x) : x3 - (x3 - x0) / 3;
        var cp2y = k1.lh ? ty(k1.lh.y) : y3;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
      } else {
        // Linear
        ctx.lineTo(x3, y3);
      }
    }
    ctx.stroke();

    // Keyframe diamonds
    keyframes.forEach(function(k) {
      var v = parseFloat(k.value !== undefined ? k.value : k.val || 0);
      var px = tx(k.frame), py = ty(v);
      ctx.fillStyle = k.hold ? '#ef4444' : (k.rh || k.lh ? '#f0c060' : '#22d3ee');
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px + 6, py);
      ctx.lineTo(px, py + 6);
      ctx.lineTo(px - 6, py);
      ctx.closePath();
      ctx.fill();
    });
  }

  function wireExpandedGraphEvents(vp, world, svg, zoomLbl) {
    var tx = 0, ty = 0, sc = 1, dragging = false, dX = 0, dY = 0;
    var dragStartX = 0, dragStartY = 0, hasDragged = false;
    
    // Click to close panel when clicking empty canvas (but not when clicking panel itself)
    vp.addEventListener('click', function(e) {
      if (e.target.closest('div[style*="position:absolute;left:"]')) return;
      if (e.target.closest('#expanded-node-panel')) return;
      // Only close if it wasn't a drag (mouse didn't move much)
      if (!hasDragged) {
        closeSidePanel();
      }
    });
    
    vp.addEventListener('mousedown', function(e) {
      if (e.target.closest('div[style*="position:absolute;left:"]')) return;
      dragging = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dX = e.clientX - tx;
      dY = e.clientY - ty;
      vp.style.cursor = 'grabbing';
      // Disable transition during drag for responsive feel
      world.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      // Check if mouse has moved enough to count as a drag
      if (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3) {
        hasDragged = true;
      }
      tx = e.clientX - dX;
      ty = e.clientY - dY;
      world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
    });
    
    document.addEventListener('mouseup', function() {
      dragging = false;
      vp.style.cursor = 'grab';
      // Re-enable smooth transition after drag
      world.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });
    
    vp.addEventListener('wheel', function(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // Disable transition for smooth zooming
      world.style.transition = 'none';
      // Clear any existing restore timer
      if (window._wheelTransitionTimer) {
        clearTimeout(window._wheelTransitionTimer);
      }
      var r = vp.getBoundingClientRect();
      var cx = e.clientX - r.left;
      var cy = e.clientY - r.top;
      var ns = Math.max(0.15, Math.min(3, sc * (e.deltaY < 0 ? 1.1 : 0.9)));
      var wx = (cx - tx) / sc;
      var wy = (cy - ty) / sc;
      sc = ns;
      tx = cx - wx * ns;
      ty = cy - wy * ns;
      world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
      zoomLbl.textContent = Math.round(sc * 100) + '%';
      // Restore transition after zooming stops
      window._wheelTransitionTimer = setTimeout(function() {
        world.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      }, 150);
    }, { passive: false });
    
    document.getElementById('exp-zoom-in').addEventListener('click', function() {
      var r = vp.getBoundingClientRect();
      var ns = Math.max(0.15, Math.min(3, sc * 1.25));
      var wx = (r.width / 2 - tx) / sc;
      var wy = (r.height / 2 - ty) / sc;
      sc = ns;
      tx = r.width / 2 - wx * ns;
      ty = r.height / 2 - wy * ns;
      world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
      zoomLbl.textContent = Math.round(sc * 100) + '%';
    });
    
    document.getElementById('exp-zoom-out').addEventListener('click', function() {
      var r = vp.getBoundingClientRect();
      var ns = Math.max(0.15, Math.min(3, sc * 0.8));
      var wx = (r.width / 2 - tx) / sc;
      var wy = (r.height / 2 - ty) / sc;
      sc = ns;
      tx = r.width / 2 - wx * ns;
      ty = r.height / 2 - wy * ns;
      world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
      zoomLbl.textContent = Math.round(sc * 100) + '%';
    });
    
    document.getElementById('exp-fit').addEventListener('click', function() {
      var r = vp.getBoundingClientRect();
      var pad = 40;
      var nodes = window.currentNodeData ? window.currentNodeData.nodes : [];
      if (!nodes.length) return;
      
      // Get the offset that was applied during rendering
      var offX = window._expandedRenderOffsetX || 0;
      var offY = window._expandedRenderOffsetY || 0;
      
      // Check if side panel is open and adjust available width
      var panel = document.getElementById('expanded-node-panel');
      var isPanelOpen = panel && panel.style.display !== 'none';
      var panelWidth = isPanelOpen ? 360 : 0;
      var availableWidth = r.width - panelWidth;
      
      var NW = 132, NH = 50;
      var mnX = 9999, mnY = 9999, mxX = -9999, mxY = -9999;
      nodes.forEach(function(n) {
        // Apply same offset as rendering
        var nx = (n.x || 0) + offX;
        var ny = (n.y || 0) + offY;
        if (nx < mnX) mnX = nx;
        if (ny < mnY) mnY = ny;
        if (nx + NW > mxX) mxX = nx + NW;
        if (ny + NH > mxY) mxY = ny + NH;
      });
      
      var contentW = mxX - mnX;
      var contentH = mxY - mnY;
      
      // Ensure minimum dimensions
      contentW = Math.max(contentW, NW);
      contentH = Math.max(contentH, NH);
      
      var newSc = Math.max(0.15, Math.min(3, Math.min((availableWidth - pad * 2) / contentW, (r.height - pad * 2) / contentH)));
      var newTx = (availableWidth - contentW * newSc) / 2 - mnX * newSc + (isPanelOpen ? 0 : panelWidth / 2);
      var newTy = (r.height - contentH * newSc) / 2 - mnY * newSc;
      
      console.log('[exp-fit] Scale:', newSc, 'Translate:', newTx, newTy, 'Content:', contentW, contentH);
      
      world.style.transform = 'translate(' + newTx.toFixed(2) + 'px,' + newTy.toFixed(2) + 'px) scale(' + newSc.toFixed(4) + ')';
      zoomLbl.textContent = Math.round(newSc * 100) + '%';
    });
    
    // Toggle Video button - pause/resume with localStorage persistence
    var toggleVideoBtn = document.getElementById('exp-toggle-video');
    if (toggleVideoBtn) {
      toggleVideoBtn.addEventListener('click', function() {
        var videoContainer = document.getElementById('exp-video-section');
        if (!videoContainer) return;
        
        // Toggle video container visibility
        var isHidden = videoContainer.style.display === 'none';
        
        if (isHidden) {
          videoContainer.style.display = 'block';
          toggleVideoBtn.style.background = 'rgba(108,123,255,0.25)';
          toggleVideoBtn.style.borderColor = 'rgba(108,123,255,0.5)';
          toggleVideoBtn.style.color = 'var(--violet-light)';
          
          // Resume from localStorage saved timestamp
          var videoId = window._expandedVideoId;
          var savedTime = 0;
          if (videoId) {
            var stored = localStorage.getItem('yt_video_time_' + videoId);
            if (stored) savedTime = parseFloat(stored);
          }
          
          if (window.expandedYTPlayer && window.expandedYTPlayer.seekTo) {
            window.expandedYTPlayer.seekTo(savedTime, true);
            window.expandedYTPlayer.playVideo();
          }
        } else {
          // Pause and save timestamp to localStorage before hiding
          if (window.expandedYTPlayer && window.expandedYTPlayer.pauseVideo) {
            var currentTime = window.expandedYTPlayer.getCurrentTime();
            var videoId = window._expandedVideoId;
            if (videoId) {
              localStorage.setItem('yt_video_time_' + videoId, currentTime.toString());
            }
            window.expandedYTPlayer.pauseVideo();
          }
          
          videoContainer.style.display = 'none';
          toggleVideoBtn.style.background = 'rgba(6,6,13,0.75)';
          toggleVideoBtn.style.borderColor = 'rgba(255,255,255,0.1)';
          toggleVideoBtn.style.color = 'rgba(255,255,255,0.55)';
        }
      });
    }
  }

  // YouTube IFrame API callback - called when API is ready
  window.onYouTubeIframeAPIReady = function() {
    // Small delay to ensure DOM is ready
    setTimeout(createExpandedPlayer, 50);
  };
  
  // Create YouTube player for expanded view
  function createExpandedPlayer() {
    var videoId = window._expandedVideoId;
    console.log('Creating player, videoId:', videoId);
    if (!videoId || !window.YT || !window.YT.Player) {
      console.log('Missing videoId or YT API:', { videoId: videoId, YT: !!window.YT });
      return;
    }
    
    // Validate video ID format (YouTube IDs are 11 characters, alphanumeric, -, _)
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      console.error('Invalid video ID format:', videoId);
      return;
    }
    
    // Destroy existing player if any
    if (window.expandedYTPlayer && window.expandedYTPlayer.destroy) {
      window.expandedYTPlayer.destroy();
    }
    
    // Load saved time from localStorage
    var savedTime = 0;
    var storedTime = localStorage.getItem('yt_video_time_' + videoId);
    if (storedTime) {
      savedTime = parseFloat(storedTime);
    }
    
    // Check if player div exists
    var playerDiv = document.getElementById('exp-yt-player');
    if (!playerDiv) {
      console.error('YouTube player div not found');
      return;
    }
    
    window.expandedYTPlayer = new YT.Player('exp-yt-player', {
      videoId: videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        start: Math.floor(savedTime),
        autoplay: 0,
        playsinline: 1
      },
      events: {
        onReady: function(event) {
          // Player is ready - seek to saved position if needed
          if (savedTime > 0) {
            event.target.seekTo(savedTime, true);
          }
        },
        onError: function(event) {
          console.error('YouTube player error:', event.data);
        }
      }
    });
  }

  // Expanded panel toggle functionality
  var _expandedCurrentPanel = 'nodes';
  var _expandedCurrentStep = 0;
  var _expandedStepsData = [];
  
  // Helper function to create a collapsible section
  // flexGrow: true = fills available space, false = fixed/natural height (for video)
  function createCollapsibleSection(id, title, iconSvg, defaultExpanded, flexGrow) {
    var section = document.createElement('div');
    section.id = 'exp-section-' + id;
    // Video: no flex (natural height), Steps/Nodes: flex to fill space
    var flexStyle = flexGrow ? 'flex:1 1 auto;min-height:0;' : 'flex:0 0 auto;';
    section.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;' + flexStyle;
    
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;transition:background 0.15s;user-select:none;flex-shrink:0;';
    header.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-primary);font-weight:500;">' + iconSvg + '<span>' + title + '</span></div><svg class="exp-chevron" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:rgba(255,255,255,0.5);transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>';
    
    var content = document.createElement('div');
    content.id = 'exp-content-' + id;
    // Flex sections get flex:1 to fill vertical space, content scrolls internally
    var contentFlex = flexGrow ? 'flex:1;min-height:0;' : '';
    content.style.cssText = contentFlex + 'overflow:hidden;' + (defaultExpanded ? '' : 'max-height:0;');
    
    // Store state
    section._expanded = defaultExpanded;
    section._flexGrow = flexGrow;
    
    header.addEventListener('click', function() {
      section._expanded = !section._expanded;
      if (section._expanded) {
        content.style.maxHeight = flexGrow ? 'none' : 'none';
        if (!flexGrow) {
          // For non-flex (video), restore natural height behavior
          content.style.padding = '0 16px 16px';
        }
        header.querySelector('.exp-chevron').style.transform = 'rotate(180deg)';
      } else {
        content.style.maxHeight = '0';
        if (!flexGrow) {
          content.style.padding = '0 16px';
        }
        header.querySelector('.exp-chevron').style.transform = 'rotate(0deg)';
      }
      // Recalculate fit immediately (will animate smoothly)
      var fitBtn = document.getElementById('exp-fit');
      if (fitBtn) fitBtn.click();
    });
    
    section.appendChild(header);
    section.appendChild(content);
    
    return { section: section, header: header, content: content, id: id };
  }
  
  function setupExpandedToggles() {
    // Step navigation for bottom bar
    var prevBtn = document.getElementById('exp-step-prev-bottom');
    var nextBtn = document.getElementById('exp-step-next-bottom');
    var dots = document.getElementById('exp-step-dots-bottom');
    
    // Prevent step navigation clicks from toggling the bar
    if (dots) {
      dots.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (_expandedCurrentStep > 0) {
          _expandedCurrentStep--;
          renderExpandedStep(_expandedCurrentStep);
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (_expandedCurrentStep < _expandedStepsData.length - 1) {
          _expandedCurrentStep++;
          renderExpandedStep(_expandedCurrentStep);
        }
      });
    }
  }
  
  function populateExpandedPanelData() {
    var effect = window._currentEffectData;
    if (!effect) return;
    
    // Video container - use YouTube IFrame API for control
    if (effect.video_url) {
      var ytId = extractYouTubeId(effect.video_url);
      console.log('Extracted YouTube ID:', ytId, 'from URL:', effect.video_url);
      if (ytId) {
        // Store video ID FIRST (before any player creation)
        window._expandedVideoId = ytId;
        
        var videoInner = document.getElementById('exp-video-inner');
        if (videoInner) {
          // Clear any existing player
          videoInner.innerHTML = '<div id="exp-yt-player" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>';
          
          // Load YouTube API if not already loaded
          if (!window.YT || !window.YT.Player) {
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          } else {
            // API already loaded, create player after brief delay to ensure DOM ready
            setTimeout(createExpandedPlayer, 50);
          }
        }
      } else {
        // No valid YouTube ID - hide the video container
        var videoContainer = document.getElementById('exp-video-section');
        if (videoContainer) videoContainer.style.display = 'none';
      }
    } else {
      // No video URL - hide the video container entirely
      var videoContainer = document.getElementById('exp-video-section');
      if (videoContainer) videoContainer.style.display = 'none';
    }
    
    // Steps - populate bottom bar
    var bottomBar = document.getElementById('expanded-bottom-bar');
    if (effect.steps && bottomBar) {
      _expandedStepsData = Array.isArray(effect.steps) ? effect.steps : effect.steps.split('\n').filter(function(s) { return s.trim(); });
      if (_expandedStepsData.length > 0) {
        renderExpandedStep(0);
        bottomBar.style.display = 'flex';
      } else {
        bottomBar.style.display = 'none';
      }
    } else if (bottomBar) {
      bottomBar.style.display = 'none';
    }
    
    // Update Video button state (video hidden by default)
    var toggleBtn = document.getElementById('exp-toggle-video');
    if (toggleBtn) {
      toggleBtn.style.background = 'rgba(6,6,13,0.75)';
      toggleBtn.style.borderColor = 'rgba(255,255,255,0.1)';
      toggleBtn.style.color = 'rgba(255,255,255,0.55)';
    }
    
    // Adjust node panel position based on bottom bar state (if visible)
    var nodePanel = document.getElementById('exp-node-panel');
    if (bottomBar && nodePanel && nodePanel.style.display !== 'none') {
      if (bottomBar.style.display === 'none') {
        nodePanel.style.bottom = '0';
      } else {
        // Calculate bottom bar height based on collapsed/expanded state (40px or 120px)
        var barHeight = bottomBarContent && bottomBarContent.style.maxHeight !== '0' ? 120 : 40;
        nodePanel.style.bottom = barHeight + 'px';
      }
    }
  }
  
  function renderExpandedStep(idx) {
    if (!_expandedStepsData.length || idx < 0 || idx >= _expandedStepsData.length) {
      return;
    }
    
    var content = document.getElementById('exp-step-content-bottom');
    var currentHeader = document.getElementById('exp-step-current-header');
    var totalHeader = document.getElementById('exp-step-total-header');
    var preview = document.getElementById('exp-step-preview');
    var dots = document.getElementById('exp-step-dots-bottom');
    
    if (content) content.textContent = _expandedStepsData[idx];
    if (currentHeader) currentHeader.textContent = idx + 1;
    if (totalHeader) totalHeader.textContent = _expandedStepsData.length;
    if (preview) preview.textContent = _expandedStepsData[idx];
    
    if (dots) {
      // Sliding window approach - show max 7 dots centered around current step
      var totalSteps = _expandedStepsData.length;
      var maxVisible = 7;
      var dotsHtml = '';
      
      if (totalSteps <= maxVisible) {
        // Show all dots if fewer than max (compact 5px dots)
        dotsHtml = _expandedStepsData.map(function(_, i) {
          return '<span style="width:5px;height:5px;border-radius:50%;background:' + (i === idx ? 'var(--violet)' : 'rgba(255,255,255,0.2)') + ';transition:background 0.15s;flex-shrink:0;"></span>';
        }).join('');
      } else {
        // Show sliding window with ellipses
        var start = Math.max(0, Math.min(idx - 3, totalSteps - maxVisible));
        var end = Math.min(totalSteps, start + maxVisible);
        
        // Adjust start if we're near the end
        if (end - start < maxVisible) {
          start = Math.max(0, end - maxVisible);
        }
        
        // Leading ellipsis
        if (start > 0) {
          dotsHtml += '<span style="font-size:9px;color:rgba(255,255,255,0.3);margin:0 2px;">…</span>';
        }
        
        // Visible dots (compact 5px)
        for (var i = start; i < end; i++) {
          dotsHtml += '<span style="width:5px;height:5px;border-radius:50%;background:' + (i === idx ? 'var(--violet)' : 'rgba(255,255,255,0.2)') + ';transition:background 0.15s;flex-shrink:0;"></span>';
        }
        
        // Trailing ellipsis
        if (end < totalSteps) {
          dotsHtml += '<span style="font-size:9px;color:rgba(255,255,255,0.3);margin:0 2px;">…</span>';
        }
      }
      
      dots.innerHTML = dotsHtml;
    }
    
    // Update button states
    var prevBtn = document.getElementById('exp-step-prev-bottom');
    var nextBtn = document.getElementById('exp-step-next-bottom');
    if (prevBtn) prevBtn.style.opacity = idx === 0 ? '0.4' : '1';
    if (nextBtn) nextBtn.style.opacity = idx === _expandedStepsData.length - 1 ? '0.4' : '1';
  }
  
  function extractYouTubeId(url) {
    if (!url) return null;
    var cleanUrl = url.trim();
    var match = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?\/]+)/);
    if (match && match[1]) {
      var id = match[1];
      // Validate ID is 11 characters
      if (id.length >= 11) {
        return id.substring(0, 11);
      }
    }
    return null;
  }

  var expandedFlowAnimId = null;
  function startExpandedFlowAnimation(canvas, nodes, edges) {
    if (expandedFlowAnimId) cancelAnimationFrame(expandedFlowAnimId);
    
    var ctx = canvas.getContext('2d');
    var SPEED = 30; // pixels per second
    var DASH_LEN = 6;
    var GAP_LEN = 14;
    var PATTERN = DASH_LEN + GAP_LEN;
    var startTime = performance.now();
    
    var NW = 132, NH = 50;
    
    // Helper to resize canvas to fit all nodes - ensures all node positions are covered
    function resizeCanvasToFit() {
      var currentNodes = window.currentNodeData ? window.currentNodeData.nodes : nodes;
      if (!currentNodes.length) return;
      
      // Find actual bounds including all node positions
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      currentNodes.forEach(function(n) {
        var nx = n.x || 0;
        var ny = n.y || 0;
        if (nx < minX) minX = nx;
        if (ny < minY) minY = ny;
        if (nx + NW > maxX) maxX = nx + NW;
        if (ny + NH > maxY) maxY = ny + NH;
      });
      
      // Add padding for edges and animation
      minX = Math.max(0, minX - 50);
      minY = Math.max(0, minY - 50);
      maxX = maxX + 100;
      maxY = maxY + 100;
      
      var neededWidth = Math.max(maxX, 1200);
      var neededHeight = Math.max(maxY, 800);
      
      // Always resize if canvas is too small in either dimension
      var needsResize = canvas.width < neededWidth || canvas.height < neededHeight;
      
      if (needsResize) {
        canvas.width = Math.max(canvas.width, neededWidth);
        canvas.height = Math.max(canvas.height, neededHeight);
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
      }
      
      // Update world container to match
      var world = canvas.parentElement;
      if (world) {
        var worldW = parseInt(world.style.width) || 0;
        var worldH = parseInt(world.style.height) || 0;
        if (worldW < neededWidth || worldH < neededHeight) {
          var newW = Math.max(worldW, neededWidth);
          var newH = Math.max(worldH, neededHeight);
          world.style.width = newW + 'px';
          world.style.height = newH + 'px';
          var svg = world.querySelector('svg');
          if (svg) {
            svg.setAttribute('width', newW);
            svg.setAttribute('height', newH);
          }
        }
      }
    }
    
    function drawFlow(ts) {
      // Resize canvas to fit current node positions
      resizeCanvasToFit();
      
      var elapsed = (ts - startTime) / 1000;
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      
      // Get current node/edge data
      var currentNodes = window.currentNodeData ? window.currentNodeData.nodes : nodes;
      var currentEdges = window.currentNodeData ? window.currentNodeData.edges : edges;
      
      var nodeMap = {};
      currentNodes.forEach(function(n) { nodeMap[n.id] = n; });
      
      // Get render offset (same as nodes and SVG)
      var animOffX = window._expandedRenderOffsetX || 0;
      var animOffY = window._expandedRenderOffsetY || 0;
      
      // Global dash offset - same for all edges so they animate in sync
      var dashOffset = -(elapsed * SPEED) % PATTERN;
      
      ctx.setLineDash([DASH_LEN, GAP_LEN]);
      ctx.lineDashOffset = dashOffset;
      
      // Draw all edges with the SAME dash pattern - this creates continuous flow effect
      currentEdges.forEach(function(e) {
        var fn = nodeMap[e.from];
        var tn = nodeMap[e.to];
        if (!fn || !tn) return;
        
        var fx = (fn.x || 0) + NW + animOffX;
        var fy = (fn.y || 0) + NH / 2 + animOffY;
        var tx = (tn.x || 0) + animOffX;
        var ty = (tn.y || 0) + NH / 2 + animOffY;
        
        var pull = Math.max(55, Math.abs(tx - fx) * 0.45);
        var c1x = fx + pull, c1y = fy;
        var c2x = tx - pull, c2y = ty;
        
        ctx.strokeStyle = 'rgba(108,123,255,0.55)';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = 'rgba(108,123,255,0.35)';
        ctx.shadowBlur = 4;
        
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tx, ty);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      });
      
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      expandedFlowAnimId = requestAnimationFrame(drawFlow);
    }
    
    expandedFlowAnimId = requestAnimationFrame(drawFlow);
  }

  function applyGraphTransform() {
    if (graphState.world) {
      graphState.world.style.transform = 'translate(' + graphState.tx + 'px,' + graphState.ty + 'px) scale(' + graphState.sc + ')';
    }
    if (graphState.zLbl) {
      graphState.zLbl.textContent = Math.round(graphState.sc * 100) + '%';
    }
  }

  function clampGraphScale(s) {
    return Math.max(0.15, Math.min(3, s));
  }

  function zoomGraphAt(cx, cy, factor) {
    var ns = clampGraphScale(graphState.sc * factor);
    var wx = (cx - graphState.tx) / graphState.sc;
    var wy = (cy - graphState.ty) / graphState.sc;
    graphState.sc = ns;
    graphState.tx = cx - wx * ns;
    graphState.ty = cy - wy * ns;
    applyGraphTransform();
  }

  function fitExpandedGraph() {
    var vp = graphState.vp;
    if (!vp) return;
    var r = vp.getBoundingClientRect();
    var pad = 30;
    var vW = r.width - pad * 2;
    var vH = r.height - pad * 2;
    
    var nodes = graphState.nodes;
    if (!nodes.length) return;
    
    // Get the offset that was applied during rendering
    var offX = window._expandedRenderOffsetX || 0;
    var offY = window._expandedRenderOffsetY || 0;
    
    var mnX = 9999, mnY = 9999, mxX = -9999, mxY = -9999;
    nodes.forEach(function(n) {
      // Apply same offset as rendering
      var nx = (n.x || 0) + offX;
      var ny = (n.y || 0) + offY;
      if (nx < mnX) mnX = nx;
      if (ny < mnY) mnY = ny;
      if (nx + NW > mxX) mxX = nx + NW;
      if (ny + NH > mxY) mxY = ny + NH;
    });
    
    var contentW = mxX - mnX;
    var contentH = mxY - mnY;
    
    graphState.sc = clampGraphScale(Math.min(vW / contentW, vH / contentH));
    graphState.tx = (r.width - contentW * graphState.sc) / 2 - mnX * graphState.sc;
    graphState.ty = (r.height - contentH * graphState.sc) / 2 - mnY * graphState.sc;
    applyGraphTransform();
  }

  function openNodeDetail(node, cardEl) {
    // Highlight selected node
    if (graphState.selNodeEl) graphState.selNodeEl.classList.remove('g-active');
    graphState.selNodeEl = cardEl;
    cardEl.classList.add('g-active');
    
    // Open accordion for this node
    var accordionEl = document.getElementById('modal-node-accordion');
    if (accordionEl) {
      var items = accordionEl.querySelectorAll('.node-accordion-item');
      items.forEach(function(item, idx) {
        var content = item.querySelector('.node-accordion-content');
        var arrow = item.querySelector('.accordion-arrow');
        if (graphState.nodes[idx] && graphState.nodes[idx].id === node.id) {
          content.style.display = 'block';
          if (arrow) arrow.style.transform = 'rotate(180deg)';
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          content.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
      });
    }
  }
  
  // Expose graph control functions
  window.fitModalGraph = fitGraph;

})();
