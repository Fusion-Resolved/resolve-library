/**
 * Noding Effect Modal
 * Shared module for opening effect detail sheets
 * Include this script and call openEffectModal(effectId)
 */

(function() {
  console.log('[Effect Modal] Module loading...');
  
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
  function populateModal(effect) {
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
    document.getElementById('modal-self-contained').textContent = effect.compatability || 'Needs media input';
    document.getElementById('modal-dependencies').textContent = effect.fusion_env || 'None';

    // Node code
    document.getElementById('modal-node-code').textContent = 
      effect.node_code || effect.node || 'No node tree available';

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
        <button class="btn-glass" onclick="editEffect('${effect.id}')">Edit Settings</button>
        <button class="btn-share" onclick="shareEffect('${effect.id}')">Share link</button>
        <button class="btn-glass btn-danger" onclick="deleteEffect('${effect.id}')">Delete</button>
        <a href="effect-full-page.html?id=${effect.id}" class="btn-primary">View full</a>
      `;
    } else {
      footer.innerHTML = `
        <button class="btn-glass" onclick="pinEffect('${effect.id}')">Pin</button>
        <button class="btn-share" onclick="shareEffect('${effect.id}')">Share link</button>
        <a href="effect-full-page.html?id=${effect.id}" class="btn-primary">View full</a>
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
        
        // Build proper embed URL (include original query params for session/share IDs)
        if (videoId) {
          // Extract any existing params from original URL
          const urlObj = new URL(url);
          const existingParams = urlObj.searchParams;
          const si = existingParams.get('si'); // session/share ID
          
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
          if (si) {
            embedUrl += `?si=${si}`;
          }
          console.log('[Effect Modal] YouTube embed URL:', embedUrl);
        }
      }
      
      console.log('[Effect Modal] Loading video iframe with URL:', embedUrl);
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

  console.log('[Effect Modal] Module loaded successfully. openEffectModal is ready.');

})();
