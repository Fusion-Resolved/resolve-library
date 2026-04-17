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
      const { data: effect, error } = await window._supabase
        .from('effects')
        .select('*')
        .eq('id', effectId)
        .eq('is_public', true)
        .single();

      if (error || !effect) {
        console.log('[Effect Modal] Effect not found:', error);
        return;
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
    console.log('[effect-modal] Modal opened - node_code:', effect.node_code ? 'exists' : 'missing', '_graphData:', effect._graphData ? 'exists' : 'missing', 'NodeSystem:', window.NodeSystem ? 'loaded' : 'not loaded');
    var nodeSection = document.getElementById('modal-node-section');
    var nodeCountEl = document.getElementById('modal-node-count');
    var accordionEl = document.getElementById('modal-node-accordion');
    var canvasContainer = document.getElementById('modal-node-code');
    
    // Try to get node data - prefer _graphData (has positions), fall back to node_code
    var nodeData = null;
    var hasValidData = false;
    var usedGraphData = false;
    
    if (effect._graphData && window.NodeSystem) {
      try {
        // Use _graphData which has actual positions from nodegraph
        var graphData = typeof effect._graphData === 'string' ? JSON.parse(effect._graphData) : effect._graphData;
        if (graphData && graphData.nodes && graphData.nodes.length > 0) {
          console.log('[effect-modal] Using _graphData with', graphData.nodes.length, 'nodes (has positions)');
          nodeData = {
            nodes: graphData.nodes.map(function(n) { return {
              id: n.id,
              name: n.name,
              fusionName: n.label || n.name,
              category: n.cat || 'Custom',
              catColor: n.col || '#6c7bff',
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
    
    // Fall back to node_code parsing if _graphData not available
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
    
    // Render the node graph section
    if (hasValidData && nodeData && nodeSection) {
      nodeSection.style.display = 'block';
      
      // Store current effect ID for click handler
      window.currentEffectId = effect.id;
      
      // Update node count
      if (nodeCountEl) {
        nodeCountEl.textContent = nodeData.nodes.length + ' node' + (nodeData.nodes.length !== 1 ? 's' : '');
      }
      
      // Render canvas
      setTimeout(function() {
        var canvas = document.getElementById('modal-node-canvas');
        console.log('[effect-modal] Canvas element:', canvas ? 'found' : 'not found');
        if (canvas && canvas.parentElement) {
          canvas.width = canvas.parentElement.offsetWidth;
          canvas.height = 220;
          var ctx = canvas.getContext('2d');
          
          // Dynamic scale based on node count - larger trees get smaller scale
          var nodeCount = nodeData.nodes.length;
          var scale;
          if (nodeCount <= 2) {
            scale = 0.45; // Large for few nodes
          } else if (nodeCount <= 4) {
            scale = 0.32; // Medium for moderate nodes
          } else if (nodeCount <= 6) {
            scale = 0.22; // Smaller for more nodes
          } else {
            scale = 0.15; // Compact for many nodes
          }
          
          console.log('[effect-modal] Rendering graph with scale:', scale, 'for', nodeCount, 'nodes');
          console.log('[effect-modal] Used _graphData with positions:', usedGraphData);
          window.NodeSystem.renderGraph(ctx, nodeData.nodes, nodeData.edges, {
            width: canvas.width,
            height: 220,
            scale: scale,
            selectedId: null,
            clearColor: '#0f0f16'
          });
          console.log('[effect-modal] Graph rendered');
        } else {
          console.log('[effect-modal] Canvas or parent not found');
        }
      }, 50);
      
      // Build accordion
      if (accordionEl) {
        console.log('[effect-modal] Building accordion...');
        accordionEl.innerHTML = '';
        
        nodeData.nodes.forEach(function(node, idx) {
          console.log('[effect-modal] Processing node', idx, ':', node.name || node.fusionName);
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
        console.log('[effect-modal] Accordion built with', accordionEl.children.length, 'items');
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

    // Render node graph if graph_payload exists
    if (effect.graph_payload) {
      renderGraph(effect.graph_payload);
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
    if (!viewport) return;
    const vr = viewport.getBoundingClientRect();
    const pad = 36;
    const nodes = world?.querySelectorAll('.gn-card');
    if (!nodes || nodes.length === 0) return;

    let mnX = 9999, mnY = 9999, mxX = -9999, mxY = -9999;
    nodes.forEach(n => {
      const x = parseFloat(n.style.left);
      const y = parseFloat(n.style.top);
      if (x < mnX) mnX = x;
      if (y < mnY) mnY = y;
      if (x + NW > mxX) mxX = x + NW;
      if (y + NH > mxY) mxY = y + NH;
    });

    const gw = mxX - mnX;
    const gh = mxY - mnY;
    sc = clampScale(Math.min((vr.width - pad * 2) / gw, (vr.height - pad * 2) / gh));
    tx = (vr.width - gw * sc) / 2 - mnX * sc;
    ty = (vr.height - gh * sc) / 2 - mnY * sc;
    applyXform();
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

})();
