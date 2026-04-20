/**
 * node-visualizer.js
 * 
 * Node parameter visualization and UI rendering module
 * Renders parameter panels, keyframe scrubbers, spline graphs, and bottom drawer
 * 
 * Source: nodegraph_legacy.html (most complete implementation)
 */

(function(global) {
  'use strict';

  // ============================================================================
  // STATE - Keyframe scrubber and bottom drawer state
  // ============================================================================
  
  let _kfScrubFrame = null; // currently selected frame, null = first available
  let _bdSelParam = null;   // currently selected param key in bottom drawer

  // ============================================================================
  // HELPER FUNCTIONS - Internal utilities
  // ============================================================================

  /**
   * Format a numeric value to 5 significant digits
   * @param {string} s - Input string
   * @returns {string} - Formatted number
   */
  function fmtNum(s) {
    const n = parseFloat(s);
    if (isNaN(n)) return s;
    const r = parseFloat(n.toPrecision(5));
    return String(r);
  }

  /**
   * Get interpolated value at a specific frame for a keyframed param
   * @param {Object} param - Parameter object with keyframes
   * @param {number} frame - Frame number
   * @returns {string} - Formatted value at frame
   */
  function _getValueAtFrame(param, frame) {
    if (param.keyframes && param.keyframes.length) {
      const kfs = param.keyframes;
      const exact = kfs.find(k => k.frame === frame);
      if (exact) return fmtNum(String(exact.value));
      
      // Linear interpolation between surrounding keyframes
      let lo = null, hi = null;
      for (const k of kfs) {
        if (k.frame <= frame) lo = k;
        if (k.frame > frame && !hi) hi = k;
      }
      if (lo && hi) {
        const t = (frame - lo.frame) / (hi.frame - lo.frame);
        return fmtNum(String(lo.value + (hi.value - lo.value) * t));
      }
      if (lo) return fmtNum(String(lo.value));
      if (hi) return fmtNum(String(hi.value));
    }
    return param.v;
  }

  /**
   * Check if a parameter key is UI noise
   * @param {string} key - Parameter name
   * @returns {boolean} - True if UI noise
   */
  function isNoise(key) {
    const PARAM_NOISE = new Set([
      'Number','NumberSize','NumberExpression',
      'NumberShader','NumberValue','NumberScale','NumberOffset',
      'NumberActive','NumberBlend','NumberZOffset','NumberZBlend',
      'NumberXOffset','NumberYOffset','NumberXScale','NumberYScale',
      'Input','Inputs','ViewInfo','OperatorInfo','Flags','Comments',
      'NameSet','CtrlWZoom','CtrlWShown',
      'MainInput1','EffectMask','Comments','NameSet','UserControls',
      'Hide1_1','Hide1_2','Hide2_1','Hide2_2','Hide3_1','Hide3_2',
      'Hide4_1','Hide4_2','Hide5_1','Hide5_2','Hide6_1','Hide6_2',
      'Hide7_1','Hide7_2',
    ]);
    if (PARAM_NOISE.has(key)) return true;
    if (key.endsWith('.Nest')) return true;
    if (/\.(Nest|CtrlWZoom|CtrlWShown|NameSet|Comments)$/.test(key)) return true;
    return false;
  }

  /**
   * Format a parameter label from camelCase to readable text
   * @param {string} k - Parameter key
   * @returns {string} - Human-readable label
   */
  function fmtParamLabel(k) {
    const _LABEL_OVERRIDES = {
      XBlurSize:'Blur Width', YBlurSize:'Blur Height', BlurSize:'Blur Size',
      XGlowSize:'Glow Width', YGlowSize:'Glow Height',
      FgAddSub:'Fg Add / Sub', BgAddSub:'Bg Add / Sub',
      ApplyMode:'Apply Mode', ApplyModeControls:'Apply Mode Controls',
      FlipHoriz:'Flip Horizontal', FlipVert:'Flip Vertical',
      XOffset:'X Offset', YOffset:'Y Offset',
      FLength:'Focal Length', ApertureW:'Aperture W', ApertureH:'Aperture H',
      PlaneOfFocus:'Plane of Focus',
      StyledText:'Styled Text', LayoutStyle:'Layout Style',
      SeetheRate:'Seethe Rate', DetailLevel:'Detail Level',
    };
    const _NS_STRIP = {
      'Transform3DOp':'', 'ShadowLightInputs3D':'Shadow',
      'MaterialInputs3D':'Material', 'LightInputs3D':'Light',
      'PhongInputs3D':'Material', 'BlinnInputs3D':'Material',
      'CookTorranceInputs3D':'Material', 'WardInputs3D':'Material',
      'Stereo3D':'Stereo',
    };
    
    if (_LABEL_OVERRIDES[k]) return _LABEL_OVERRIDES[k];
    if (k.includes('.')) {
      const parts = k.split('.');
      const ns = parts[0];
      const rest = parts.slice(1).join(' ');
      const prefix = ns in _NS_STRIP ? _NS_STRIP[ns] : ns.replace(/Inputs3D|3DOp|Op$/,'');
      const seg = rest.replace(/\./g,' ');
      const label = (prefix ? prefix + ' ' : '') + seg;
      return label.replace(/([a-z])([A-Z])/g,'$1 $2').trim();
    }
    return k.replace(/([a-z])([A-Z])/g,'$1 $2')
             .replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2')
             .trim();
  }

  /**
   * Get the group category for a parameter
   * @param {string} key - Parameter name
   * @param {Object} param - Parameter object
   * @returns {string} - Group name
   */
  function getParamGroup(key, param) {
    const PARAM_GROUP_PATTERNS = [
      { name:'Transform',       re:/^Transform3DOp\./i },
      { name:'Shadow',          re:/^ShadowLightInputs3D\./i },
      { name:'Material',        re:/^(MaterialInputs3D|PhongInputs3D|BlinnInputs3D|CookTorranceInputs3D|WardInputs3D|CarpaintInputs3D|GlassInputs3D|HairInputs3D|SkinInputs3D)\./i },
      { name:'Light',           re:/^LightInputs3D\./i },
      { name:'Transform',       re:/^(Center|Size$|Angle$|Aspect|Pivot|[XY]Offset|Flip[HV]|Width$|Height$|XScale|YScale|Tilt|Skew|Corner[A-Z])/i },
      { name:'Opacity / Blend', re:/^(Blend$|Alpha|Opacity|ApplyMode|FgAddSub|BgAddSub|BurnIn|Dissolve)/i },
      { name:'Color',           re:/^(Gain|Gamma|Lift|Saturation|Hue|Brightness|Contrast|Red$|Green$|Blue$|RGB|Luma|ColorSpace|Tint|Temperature|WhiteBalance|Midtone|Highlight|Shadow$|LowR|HighR|LowG|HighG|LowB|HighB|SplineColor|ColorRange|Colorize|ColorCurve)/i },
      { name:'Light',           re:/^(Intensity|ConeAngle|ConeEdge|Attenuation|Decay|Ambient|Diffuse|Specular)/i },
      { name:'Blur / Glow',     re:/^(.+Blur|.+Glow|.+Defocus|.+Sharpen|.+Soften|Passes$|Clippings|Filter$|Deband)/i },
      { name:'Text',            re:/^(StyledText|Font|Size|Tracking|Leading|LineSpacing|CharSpacing|LayoutStyle|HorizAlign|VertAlign|Italic|Bold|LineWidth|Text[A-Z])/i },
      { name:'Path / Spline',   re:/^(PolyLine|DrawMode|KeyFrames|Keyframe|Stroke|Displacement|Offset$)/i },
      { name:'Camera',          re:/^(FLength|Aperture[WH]|PlaneOfFocus|Near|Far|Stereo|PerspNearClip|PerspFarClip|AoV)/i },
      { name:'Animation',       re:/^(TimeOffset|Speed|Hold|Rate|Duration|Frame|Loop|Reverse|MotionBlur|ShutterAngle)/i },
      { name:'Noise / Texture', re:/^(Noise|Phase|Amplitude|Frequency|SeetheRate|Seethe|Detail|Roughness|Falloff|Scale|Lacunarity|Octave|Cellular|Voronoi|Perlin|Turbulence|Warp|Ripple|Twist|Vortex)/i },
      { name:'Particles',       re:/^(pEmit|pRender|Life|Mass|Velocity|Direction|Region|Spread|Lock|Follow|Gravity|Bounce|pMerge)/i },
      { name:'Mask / Edge',     re:/^(Soft$|Softness|Edge|Inner|Outer|Matte|Mask|Threshold|Low$|High$|Erode|Dilate|InvertMask|ClipBlack|ClipWhite)/i },
      { name:'3D',              re:/^(Stereo|Depth$|ZDepth|ConvergeDist|EyeSep|Parallax)/i },
    ];
    
    if (param && param.isConnection) return 'Connections';
    if (param && (param.isPath || param.isKeyframe)) {
      for (const g of PARAM_GROUP_PATTERNS) { if (g.re.test(key)) return g.name; }
      return 'Path / Spline';
    }
    for (const g of PARAM_GROUP_PATTERNS) { if (g.re.test(key)) return g.name; }
    return 'Parameters';
  }

  // ============================================================================
  // MAIN RENDERING FUNCTIONS
  // ============================================================================

  /**
   * Render the params panel for the selected node
   * @param {Object} node - Node object
   * @param {Function} findNode - Function to find a node by ID
   * @param {Object} options - Options including callbacks
   */
  function renderParamsPanel(node, findNode, options = {}) {
    const { 
      onRenderDisplay, 
      onShowDrawer,
      autoSaveParams 
    } = options;
    
    if (!node) return;
    
    // Update node name and category in panel
    const nameEl = document.getElementById('params-node-name');
    const catEl = document.getElementById('params-node-cat');
    if (nameEl) nameEl.textContent = node.name;
    if (catEl) catEl.textContent = node.cat;

    // Show badge if params already stored
    const badge = document.getElementById('params-badge-lbl');
    if (badge) {
      if (node.fusionParams && node.fusionParams.length) {
        const total = node.fusionParams.reduce((s,t) => s + Object.keys(t.params).length, 0);
        badge.innerHTML = `<span class="params-badge">${total} params</span>`;
      } else {
        badge.innerHTML = '';
      }
    }

    // Show instance information banner
    const paramsSec = document.getElementById('params-sec');
    if (paramsSec) {
      paramsSec.querySelector('.instance-info-bar')?.remove();
      if (node.instanceOf) {
        const master = findNode(node.instanceOf);
        const deinstancedParams = node.fusionParams
          ? node.fusionParams.reduce((s, t) =>
              s + Object.values(t.params).filter(p => p.deinstanced).length, 0)
          : 0;
        const bar = document.createElement('div');
        bar.className = 'instance-info-bar';
        bar.innerHTML = `
          <span>⬡ Instance of</span>
          <span class="iib-master">${master?.name || '?'}</span>
          ${deinstancedParams
            ? `<span class="iib-deinstanced">${deinstancedParams} deinstanced param${deinstancedParams!==1?'s':''}</span>`
            : `<span style="margin-left:auto;color:var(--muted);font-size:8px">fully linked</span>`}`;
        const lbl = paramsSec.querySelector('.rp-lbl');
        if (lbl) lbl.after(bar);
      }
    }

    // Pre-fill paste area if raw is stored
    const ta = document.getElementById('params-paste');
    if (ta) ta.value = node._rawSetting || '';

    // Render parsed params if present
    if (onRenderDisplay) {
      onRenderDisplay(node);
    }
  }

  /**
   * Render the parameter display for a node
   * @param {Object} node - Node object with fusionParams
   * @param {number|null} scrubFrame - Current scrub frame
   * @param {Object} options - Options including callbacks
   */
  function renderParamsDisplay(node, scrubFrame, options = {}) {
    const {
      findNode,
      selectedNodeId,
      onSelectNode,
      onShowDrawer,
      autoSaveParams,
      openSplineModal,
      resolveEnum,
      fmtNum: fmtNumFn
    } = options;
    
    const fmt = fmtNumFn || fmtNum;
    const disp = document.getElementById('params-display');
    if (!disp) return;
    
    disp.innerHTML = '';
    
    if (!node.fusionParams || !node.fusionParams.length) {
      // If this node is an instance of a master, show master's params
      if (node.instanceOf) {
        const master = findNode(node.instanceOf);
        if (master && master.fusionParams && master.fusionParams.length) {
          const inhBar = document.createElement('div');
          inhBar.style.cssText = 'font-size:9px;font-family:var(--font-mono);color:var(--accent);background:rgba(200,240,96,.07);border:1px solid rgba(200,240,96,.18);border-radius:5px;padding:5px 9px;margin-bottom:8px;';
          inhBar.innerHTML = `⬡ All params inherited from <strong>${master.name}</strong>`;
          disp.appendChild(inhBar);
          
          // Temporarily render master's params
          const masterNode = { ...node, fusionParams: master.fusionParams };
          renderParamsDisplay(masterNode, scrubFrame, options);
          return;
        }
      }
      
      // No Fusion params — still show the custom param editor
      _renderCustomParamEditor(disp, node, autoSaveParams);
      return;
    }

    // Collect all unique keyframe numbers
    const allFrames = [];
    node.fusionParams.forEach(tool => {
      Object.entries(tool.params).forEach(([k, p]) => {
        if (p.keyframes) {
          p.keyframes.forEach(kf => { 
            if (!allFrames.includes(kf.frame)) allFrames.push(kf.frame); 
          });
        }
        // Also collect keyframes from animated paths
        if (p.isPath && p.isAnimatedPath && p.keyframes) {
          p.keyframes.forEach(kf => { 
            if (!allFrames.includes(kf.frame)) allFrames.push(kf.frame); 
          });
        }
      });
    });
    allFrames.sort((a,b) => a-b);

    // Determine active frame
    if (allFrames.length) {
      if (scrubFrame === undefined || scrubFrame === null) {
        scrubFrame = (_kfScrubFrame !== null && allFrames.includes(_kfScrubFrame)) ? _kfScrubFrame : allFrames[0];
      }
      _kfScrubFrame = scrubFrame;
    }

    // ── KEYFRAME SCRUBBER ──
    if (allFrames.length > 0) {
      const scrubWrap = document.createElement('div');
      scrubWrap.style.cssText = 'margin-bottom:10px;background:#0d0d10;border:1px solid var(--border);border-radius:5px;padding:6px 8px;';

      const scrubLabel = document.createElement('div');
      scrubLabel.style.cssText = 'font-size:10px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;';
      scrubLabel.innerHTML = `<span>Keyframes</span><span style="color:var(--accent);font-size:12px;" id="kf-frame-lbl">Frame ${scrubFrame}</span>`;
      scrubWrap.appendChild(scrubLabel);

      const chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
      allFrames.forEach(fr => {
        const chip = document.createElement('button');
        chip.style.cssText = `font-size:12px;font-family:var(--font-mono);padding:4px 10px;border-radius:4px;border:1px solid ${fr === scrubFrame ? 'rgba(200,240,96,.6)' : 'var(--border)'};background:${fr === scrubFrame ? 'rgba(200,240,96,.12)' : 'rgba(255,255,255,.03)'};color:${fr === scrubFrame ? 'var(--accent)' : 'var(--text2)'};cursor:pointer;transition:all .1s;`;
        chip.textContent = fr;
        chip.title = `Frame ${fr}`;
        chip.addEventListener('click', () => {
          _kfScrubFrame = fr;
          renderParamsDisplay(node, fr, options);
          if (onShowDrawer) onShowDrawer(node, fr);
        });
        chips.appendChild(chip);
      });
      scrubWrap.appendChild(chips);

      // Prev/Next arrows
      const nav = document.createElement('div');
      nav.style.cssText = 'display:flex;gap:4px;margin-top:5px;';
      const curIdx = allFrames.indexOf(scrubFrame);
      
      const prevBtn = document.createElement('button');
      prevBtn.style.cssText = 'flex:1;font-size:12px;font-family:var(--font-mono);padding:5px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;transition:all .1s;';
      prevBtn.textContent = '◂ Prev';
      prevBtn.disabled = curIdx <= 0;
      if (curIdx > 0) {
        prevBtn.addEventListener('click', () => {
          _kfScrubFrame = allFrames[curIdx-1];
          renderParamsDisplay(node, allFrames[curIdx-1], options);
          if (onShowDrawer) onShowDrawer(node, allFrames[curIdx-1]);
        });
      }
      
      const nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'flex:1;font-size:12px;font-family:var(--font-mono);padding:5px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;transition:all .1s;';
      nextBtn.textContent = 'Next ▸';
      nextBtn.disabled = curIdx >= allFrames.length - 1;
      if (curIdx < allFrames.length - 1) {
        nextBtn.addEventListener('click', () => {
          _kfScrubFrame = allFrames[curIdx+1];
          renderParamsDisplay(node, allFrames[curIdx+1], options);
          if (onShowDrawer) onShowDrawer(node, allFrames[curIdx+1]);
        });
      }
      
      nav.appendChild(prevBtn);
      nav.appendChild(nextBtn);
      scrubWrap.appendChild(nav);
      disp.appendChild(scrubWrap);
    }

    // Render each tool's parameters
    const PARAM_GROUP_ORDER = ['Transform','Opacity / Blend','Color','Shadow','Light','Material',
      'Blur / Glow','Text','Path / Spline','Camera','Animation','Noise / Texture',
      'Particles','Mask / Edge','3D','Connections','Parameters'];

    // Filter tools to only show those matching the current node name
    // If node.name is "Transform", only show "Transform3" tool, not "Background5", "Merge3", etc.
    const nodeNameLower = node.name.toLowerCase();
    const relevantTools = node.fusionParams.filter(tool => {
      if (!tool || !tool.toolName) return false;
      const toolNameLower = tool.toolName.toLowerCase();
      // Match if tool name contains node name OR node name contains tool name
      return toolNameLower.includes(nodeNameLower) || 
             nodeNameLower.includes(toolNameLower.replace(/\d+$/, '')) || // Remove trailing numbers
             (nodeNameLower === 'transform' && tool.toolType === 'Transform');
    });
    
    // If no specific match found, show all (fallback)
    const toolsToShow = relevantTools.length > 0 ? relevantTools : node.fusionParams;

    toolsToShow.forEach(tool => {
      if (toolsToShow.length > 1 || node.fusionParams.length > 1) {
        const th = document.createElement('div');
        th.style.cssText = 'font-size:9px;font-family:var(--font-head);font-weight:600;color:var(--text);margin-bottom:4px;margin-top:6px;padding-bottom:4px;border-bottom:1px solid var(--border);';
        th.textContent = `${tool.toolName} (${tool.toolType})`;
        disp.appendChild(th);
      }

      const params = tool.params;
      const keys = Object.keys(params).filter(k => params[k].isInstanceParam || !isNoise(k));
      
      if (!keys.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:9px;font-family:var(--font-mono);color:var(--muted);';
        empty.textContent = 'No parameter values found';
        disp.appendChild(empty);
        return;
      }

      // Group all params
      const grouped = {};
      keys.forEach(k => {
        const g = getParamGroup(k, params[k]);
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(k);
      });

      // Build a single param row element
      function buildProw(k) {
        const p = params[k];
        const row = document.createElement('div');
        const isSel = k === _bdSelParam;
        row.className = 'prow' + (isSel ? ' selected' : '');
        row.title = 'Click to select & view spline/keyframes';
        row.addEventListener('click', () => {
          _bdSelParam = k;
          renderParamsDisplay(node, _kfScrubFrame, options);
          if (onShowDrawer) onShowDrawer(node, _kfScrubFrame);
        });
        
        const label = fmtParamLabel(k);
        let displayVal = p.v;
        let cls = p.isExpr ? ' expr' : p.isConnection ? ' conn' : p.isPath ? ' path' : p.isKeyframe ? ' kf' : p.isInstanceParam ? ' inst' : '';

        if (p.isKeyframe && p.keyframes && allFrames.length) {
          displayVal = _getValueAtFrame(p, scrubFrame);
          cls = ' kf';
        }
        if (!p.isExpr && !p.isConnection && !p.isPath && resolveEnum) {
          displayVal = resolveEnum(label, displayVal, tool.toolType);
        }

        if (p.isPath && p.pathPoints && p.pathPoints.length) {
          const pt = p.pathPoints[0];
          displayVal = `${fmt(String(pt.x))}, ${fmt(String(pt.y))}`;
          row.innerHTML = `<span class="pkey" title="${k}">${label}</span><span class="pval path" title="${displayVal}">${displayVal}</span>`;
          const frag = document.createDocumentFragment();
          frag.appendChild(row);
          return frag;
        }

        row.innerHTML = `<span class="pkey" title="${k}">${label}</span><span class="pval${cls}" title="${displayVal}">${displayVal}</span>`;
        return row;
      }

      PARAM_GROUP_ORDER.forEach(gname => {
        const ks = grouped[gname];
        if (!ks || !ks.length) return;
        const g = document.createElement('div');
        g.className = 'pgroup';
        g.innerHTML = `<div class="pgroup-title">${gname}</div>`;
        ks.forEach(k => g.appendChild(buildProw(k)));
        disp.appendChild(g);
      });

      // Raw dump toggle
      if (tool.raw) {
        const tog = document.createElement('button');
        tog.className = 'raw-toggle';
        tog.innerHTML = `<span>Raw .setting</span><span>▸</span>`;
        const dump = document.createElement('div');
        dump.className = 'raw-dump';
        dump.textContent = tool.raw.trim();
        tog.addEventListener('click', () => {
          dump.classList.toggle('open');
          tog.querySelector('span:last-child').textContent = dump.classList.contains('open') ? '▾' : '▸';
        });
        disp.appendChild(tog);
        disp.appendChild(dump);
      }
    });

    // Spline button
    const rawForSpline = node._rawSetting || (node.fusionParams && node.fusionParams[0]?.raw) || '';
    if (rawForSpline && /BezierSpline\s*\{/.test(rawForSpline)) {
      const splineBtn = document.createElement('button');
      splineBtn.style.cssText = 'width:100%;margin-top:8px;font-size:9px;font-family:var(--font-mono);padding:6px;border-radius:var(--radius-sm);border:1px solid rgba(255,0,255,0.4);background:rgba(255,0,255,0.07);color:#ff88ff;cursor:pointer;transition:var(--transition);display:flex;align-items:center;justify-content:center;gap:5px;';
      splineBtn.innerHTML = '⬡ View Spline Graph';
      splineBtn.title = 'Plot the BezierSpline curves from this node\'s .setting';
      splineBtn.addEventListener('click', () => {
        if (!node._rawSetting && rawForSpline) node._rawSetting = rawForSpline;
        if (openSplineModal) openSplineModal();
      });
      disp.appendChild(splineBtn);
    }

    // Clear button
    const clr = document.createElement('button');
    clr.className = 'clear-params-btn';
    clr.textContent = 'Clear stored params';
    clr.addEventListener('click', () => {
      node.fusionParams = null;
      node._rawSetting = '';
      _kfScrubFrame = null;
      const ta = document.getElementById('params-paste');
      if (ta) ta.value = '';
      const badge = document.getElementById('params-badge-lbl');
      if (badge) badge.innerHTML = '';
      renderParamsDisplay(node, null, options);
    });
    disp.appendChild(clr);
    
    _renderCustomParamEditor(disp, node, autoSaveParams);
  }

  /**
   * Render custom parameter editor
   * @param {HTMLElement} disp - Display container
   * @param {Object} node - Node object
   * @param {Function} autoSaveParams - Auto-save callback
   */
  function _renderCustomParamEditor(disp, node, autoSaveParams) {
    const prev = disp.querySelector('.custom-params-section');
    if (prev) prev.remove();
    if (!node) return;
    if (!node.customParams) node.customParams = {};

    const section = document.createElement('div');
    section.className = 'custom-params-section';

    const title = document.createElement('div');
    title.className = 'custom-params-title';
    title.textContent = 'Custom Params';
    section.appendChild(title);

    const addRow = document.createElement('div');
    addRow.className = 'custom-param-add-row';
    const newKeyInp = document.createElement('input');
    newKeyInp.placeholder = 'param name…';
    const newValInp = document.createElement('input');
    newValInp.placeholder = 'value…';
    const addBtn = document.createElement('button');
    addBtn.className = 'custom-param-add-btn';
    addBtn.textContent = '+ Add';

    function rebuildRows() {
      section.querySelectorAll('.custom-param-row').forEach(r => r.remove());
      Object.entries(node.customParams).forEach(([k, v]) => {
        const row = document.createElement('div');
        row.className = 'custom-param-row';
        const keyInp = document.createElement('input');
        keyInp.value = k; keyInp.placeholder = 'name'; keyInp.style.flex = '0.9';
        const valInp = document.createElement('input');
        valInp.value = v; valInp.placeholder = 'value';
        const del = document.createElement('button');
        del.className = 'custom-param-del'; del.textContent = '✕'; del.title = 'Delete';
        del.addEventListener('click', () => { 
          delete node.customParams[k]; 
          if (autoSaveParams) autoSaveParams(); 
          rebuildRows(); 
        });
        keyInp.addEventListener('blur', () => {
          const nk = keyInp.value.trim();
          if (nk && nk !== k) { 
            node.customParams[nk] = node.customParams[k]; 
            delete node.customParams[k]; 
            if (autoSaveParams) autoSaveParams(); 
            rebuildRows(); 
          }
        });
        valInp.addEventListener('blur', () => { 
          node.customParams[k] = valInp.value; 
          if (autoSaveParams) autoSaveParams(); 
        });
        keyInp.addEventListener('keydown', e => { if (e.key === 'Enter') keyInp.blur(); });
        valInp.addEventListener('keydown', e => { if (e.key === 'Enter') valInp.blur(); });
        row.appendChild(keyInp); row.appendChild(valInp); row.appendChild(del);
        section.insertBefore(row, addRow);
      });
    }

    addBtn.addEventListener('click', () => {
      const k = newKeyInp.value.trim(), v = newValInp.value.trim();
      if (!k) { newKeyInp.focus(); return; }
      node.customParams[k] = v;
      newKeyInp.value = ''; newValInp.value = '';
      if (autoSaveParams) autoSaveParams(); 
      rebuildRows();
    });
    [newKeyInp, newValInp].forEach(inp => inp.addEventListener('keydown', e => { 
      if (e.key === 'Enter') addBtn.click(); 
    }));

    addRow.appendChild(newKeyInp); addRow.appendChild(newValInp); addRow.appendChild(addBtn);
    section.appendChild(addRow);
    rebuildRows();
    disp.appendChild(section);
  }

  // ============================================================================
  // BOTTOM DRAWER FUNCTIONS
  // ============================================================================

  /**
   * Show the bottom drawer for a node
   * @param {Object} node - Node object
   * @param {number|null} scrubFrame - Current frame
   * @param {Object} options - Options including callbacks
   */
  function showBottomDrawer(node, scrubFrame, options = {}) {
    const {
      findNode,
      selectedNodeId,
      onSelectParam,
      onScrubFrame,
      onScrubStep,
      onOpenParamsDrawer,
      resolveEnum,
      openSplineModal
    } = options;
    
    const drawer = document.getElementById('bottom-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden');
    
    const titleEl = document.getElementById('bd-title');
    const catEl = document.getElementById('bd-cat');
    const dotEl = document.getElementById('bd-dot');
    const instDotEl = document.getElementById('bd-instance-dot');
    
    if (titleEl) titleEl.textContent = node.name;
    if (catEl) catEl.textContent = node.cat;
    
    if (dotEl) {
      const effColor = node.color || node.catColor || '#rgba(255,255,255,0.2)';
      dotEl.style.background = effColor;
    }
    
    if (instDotEl) {
      if (node.instanceOf) {
        instDotEl.innerHTML = '<div class="nd-instance-dot" title="Instance"></div>';
      } else if (node.hasInstances) {
        instDotEl.innerHTML = '<div class="nd-master-dot" title="Master"></div>';
      } else {
        instDotEl.innerHTML = '';
      }
    }

    // Spline button visibility
    const splineBtn = document.getElementById('bd-spline-btn');
    const splineAllBtn = document.getElementById('bd-spline-all-btn');
    if (splineBtn) {
      const rawText = node._rawSetting || '';
      const hasAnySpline = rawText && (/BezierSpline\s*\{/.test(rawText) || /PolyPath\s*\{/.test(rawText));
      
      let selP = null;
      if (_bdSelParam && node.fusionParams) {
        for (const tool of node.fusionParams) {
          const p = (tool.params || {})[_bdSelParam];
          if (p) { selP = p; break; }
        }
      }
      
      const paramHasSpline = selP && (selP.isKeyframe || selP.isPath);
      splineBtn.style.display = paramHasSpline ? '' : 'none';
      if (splineAllBtn) splineAllBtn.style.display = hasAnySpline ? '' : 'none';
    }

    const body = document.getElementById('bd-body');
    if (!body) return;
    
    if (!node.fusionParams || !node.fusionParams.length) {
      body.innerHTML = '<div style="font-size:12px;color:var(--muted);font-family:var(--font-mono);padding:8px 0">No params stored — paste Fusion .setting in the panel →</div>';
      return;
    }

    // Collect all keyframed params for the drawer (from relevant tools only)
    const kfParams = [];
    const allFramesSet = new Set();
    
    // Filter to only relevant tools
    const nodeNameLower = node.name.toLowerCase();
    console.log('[NodeVisualizer] showBottomDrawer for node:', node.name, 'looking for tools matching:', nodeNameLower);
    console.log('[NodeVisualizer] Available tools:', node.fusionParams.map(t => t?.toolName));
    
    const relevantTools = node.fusionParams.filter(tool => {
      if (!tool || !tool.toolName) return false;
      const toolNameLower = tool.toolName.toLowerCase();
      const matches = toolNameLower.includes(nodeNameLower) || 
             nodeNameLower.includes(toolNameLower.replace(/\d+$/, '')) ||
             (nodeNameLower === 'transform' && tool.toolType === 'Transform');
      console.log('[NodeVisualizer] Tool:', tool.toolName, 'matches:', matches);
      return matches;
    });
    const toolsToCollect = relevantTools.length > 0 ? relevantTools : node.fusionParams;
    console.log('[NodeVisualizer] Tools to collect:', toolsToCollect.map(t => t?.toolName));
    
    toolsToCollect.forEach(tool => {
      console.log('[NodeVisualizer] Checking tool:', tool?.toolName, 'params:', Object.keys(tool?.params || {}));
      Object.entries(tool.params || {}).forEach(([k, p]) => {
        console.log('[NodeVisualizer] Param:', k, 'isPath:', p?.isPath, 'isAnimatedPath:', p?.isAnimatedPath, 'keyframes:', p?.keyframes?.length);
        // Regular keyframes
        if (p.isKeyframe && p.keyframes && p.keyframes.length) {
          kfParams.push({ key: k, label: k.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^.*\./,''), param: p, tool });
          p.keyframes.forEach(kf => allFramesSet.add(kf.frame));
        }
        // Animated path keyframes
        if (p.isPath && p.isAnimatedPath && p.keyframes && p.keyframes.length) {
          kfParams.push({ key: k, label: k.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^.*\./,''), param: p, tool });
          p.keyframes.forEach(kf => allFramesSet.add(kf.frame));
        }
      });
    });
    console.log('[NodeVisualizer] Total kfParams found:', kfParams.length, 'frames:', [...allFramesSet]);
    const allFrames = [...allFramesSet].sort((a,b) => a-b);

    if (allFrames.length) {
      if (scrubFrame === undefined || scrubFrame === null) {
        scrubFrame = (_kfScrubFrame !== null && allFrames.includes(_kfScrubFrame)) ? _kfScrubFrame : allFrames[0];
      }
      _kfScrubFrame = scrubFrame;
    }

    // Auto-select first keyframed param
    if (kfParams.length && (!_bdSelParam || !kfParams.find(p => p.key === _bdSelParam))) {
      _bdSelParam = kfParams[0].key;
    }

    const nodeId = node.id;
    let html = '';

    // ── LEFT COLUMN: param list ──
    html += `<div style="display:flex;gap:0;width:100%;overflow:hidden;">`;

    html += `<div style="flex:0 0 auto;width:170px;min-width:130px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;max-height:260px;padding-right:8px;border-right:1px solid var(--border);margin-right:10px;">`;
    html += `<div style="font-size:10px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;flex-shrink:0;">Parameters</div>`;

    const masterNode = node.instanceOf ? findNode(node.instanceOf) : null;
    if (masterNode) {
      html += `<div style="font-size:10px;font-family:var(--font-mono);color:var(--accent);background:rgba(200,240,96,.07);border:1px solid rgba(200,240,96,.18);border-radius:4px;padding:3px 7px;margin-bottom:5px">⬡ Instance of ${masterNode.name}</div>`;
    }

    // Filter to only show relevant tools for this node (use toolsToCollect from above)
    const toolsToShow = toolsToCollect;
    
    // All non-connection params from relevant tools only
    toolsToShow.forEach(tool => {
      Object.entries(tool.params || {}).filter(([k,v]) => !v.isConnection).forEach(([k, p]) => {
        const label = k.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^.*\./,'');
        const isKf = p.isKeyframe && p.keyframes && p.keyframes.length > 0;
        const isPath = p.isPath;
        const isSel = k === _bdSelParam;
        const val = (isKf && allFrames.length) ? _getValueAtFrame(p, scrubFrame) : (p.v || '—');
        const resolvedVal = (!p.isExpr && !p.isConnection && !p.isPath && resolveEnum) 
          ? resolveEnum(label, val, null) 
          : val;
        
        // Visual indicator for path/animated params
        let indicator = '';
        if (isKf) indicator = '● ';
        else if (isPath && p.isAnimatedPath) indicator = '◆ ';
        else if (isPath) indicator = '◇ ';
        
        const escapedKey = k.replace(/'/g,"\\'");
        html += `<div onclick="NodeVisualizer.bdSelectParam('${nodeId}','${escapedKey}')" style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;border:1px solid ${isSel?'rgba(200,240,96,0.35)':'transparent'};background:${isSel?'rgba(200,240,96,0.08)':'transparent'};transition:background .1s;">
          <span style="font-size:11px;font-family:var(--font-mono);color:${isSel?'var(--accent)':isKf?'rgba(240,192,96,.8)':p.isAnimatedPath?'#cc44cc':isPath?'#b0f0c0':'var(--text2)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${indicator}${label}</span>
          <span style="font-size:11px;font-family:var(--font-mono);color:${isKf?'#f0c060':p.isAnimatedPath?'#cc44cc':isPath?'#b0f0c0':'var(--text)'};white-space:nowrap;flex-shrink:0;max-width:70px;overflow:hidden;text-overflow:ellipsis;">${resolvedVal}</span>
        </div>`;
      });
    });
    html += `</div>`;

    // ── RIGHT COLUMN: keyframes + spline for selected param ──
    html += `<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;overflow:hidden;">`;

    const selParamObj = _bdSelParam ? (() => {
      for (const tool of node.fusionParams) {
        const p = (tool.params||{})[_bdSelParam];
        if (p) return { param: p, key: _bdSelParam, label: _bdSelParam.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^.*\./,'') };
      }
      return null;
    })() : null;

    if (selParamObj && selParamObj.param.isKeyframe && selParamObj.param.keyframes && selParamObj.param.keyframes.length) {
      const paramKfs = selParamObj.param.keyframes.slice().sort((a,b) => a.frame - b.frame);
      const paramFrames = paramKfs.map(k => k.frame);
      const curIdx = paramFrames.indexOf(scrubFrame ?? paramFrames[0]);
      const activeFr = curIdx >= 0 ? scrubFrame : paramFrames[0];

      html += `<div style="font-size:10px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.08em;">${selParamObj.label} — <span id="bd-val-lbl" style="color:var(--accent);font-size:12px;">${_getValueAtFrame(selParamObj.param, activeFr)}</span> @ frame <span id="bd-frame-lbl" style="color:var(--accent)">${activeFr}</span></div>`;

      // Keyframe chips
      html += `<div style="display:flex;flex-wrap:wrap;gap:4px;max-height:72px;overflow-y:auto;">`;
      paramFrames.forEach(fr => {
        const isActive = fr === activeFr;
        const kf = paramKfs.find(k => k.frame === fr);
        const kfVal = kf ? parseFloat(kf.value ?? kf.val ?? 0).toFixed(3) : '—';
        html += `<button onclick="NodeVisualizer.bdScrubFrame('${nodeId}',${fr})" title="Frame ${fr}: ${kfVal}" style="font-size:12px;font-family:var(--font-mono);padding:4px 10px;border-radius:4px;border:1px solid ${isActive?'rgba(200,240,96,.7)':'rgba(255,255,255,.15)'};background:${isActive?'rgba(200,240,96,.15)':'rgba(255,255,255,.04)'};color:${isActive?'var(--accent)':'var(--text2)'};cursor:pointer;transition:all .1s;line-height:1;">${fr}</button>`;
      });
      html += `</div>`;

      // Prev/Next nav
      html += `<div style="display:flex;gap:6px;">
        <button onclick="NodeVisualizer.bdScrubStep('${nodeId}',-1)" ${curIdx<=0?'disabled':''} style="flex:1;font-size:12px;font-family:var(--font-mono);padding:5px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;opacity:${curIdx<=0?'.3':'1'}">◂ Prev</button>
        <button onclick="NodeVisualizer.bdScrubStep('${nodeId}',1)" ${curIdx>=paramFrames.length-1?'disabled':''} style="flex:1;font-size:12px;font-family:var(--font-mono);padding:5px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;opacity:${curIdx>=paramFrames.length-1?'.3':'1'}">Next ▸</button>
      </div>`;

      // Inline spline canvas
      const canvasId = `bd-spline-${nodeId}-${_bdSelParam.replace(/[^a-z0-9]/gi,'_')}`;
      html += `<canvas id="${canvasId}" style="display:block;width:100%;height:110px;border-radius:6px;background:#0d0d10;flex-shrink:0;cursor:crosshair;"></canvas>`;

    } else if (selParamObj && selParamObj.param.isPath) {
      const pts = selParamObj.param.pathPoints || [];
      const isAnimated = selParamObj.param.isAnimatedPath;
      const pathKeyframes = selParamObj.param.keyframes;
      
      // Title: Parameter name + spline type
      html += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--accent);font-weight:600;margin-bottom:4px;">${selParamObj.label}</div>`;
      html += `<div style="font-size:9px;font-family:var(--font-mono);color:#cc44cc;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">${isAnimated ? '◆ BezierSpline (Animated)' : '◇ Static Path'}</div>`;
      
      // Show keyframes if animated
      if (isAnimated && pathKeyframes && pathKeyframes.length) {
        const paramKfs = pathKeyframes.slice().sort((a,b) => a.frame - b.frame);
        const paramFrames = paramKfs.map(k => k.frame);
        const curIdx = paramFrames.indexOf(scrubFrame ?? paramFrames[0]);
        const activeFr = curIdx >= 0 ? scrubFrame : paramFrames[0];
        const activeKf = paramKfs.find(k => k.frame === activeFr);
        const activeVal = activeKf ? parseFloat(activeKf.value ?? activeKf.val ?? 0).toFixed(3) : '—';
        
        // Current value display
        html += `<div style="font-size:10px;font-family:var(--font-mono);color:var(--text2);margin-bottom:6px;">Value: <span style="color:#cc44cc;font-weight:600;">${activeVal}</span> @ frame <span style="color:var(--accent)">${activeFr}</span></div>`;
        
        // Keyframe chips with values
        html += `<div style="display:flex;flex-wrap:wrap;gap:4px;max-height:72px;overflow-y:auto;margin-bottom:8px;">`;
        paramKfs.forEach(kf => {
          const fr = kf.frame;
          const isActive = fr === activeFr;
          const kfVal = parseFloat(kf.value ?? kf.val ?? 0).toFixed(3);
          html += `<button onclick="NodeVisualizer.bdScrubFrame('${nodeId}',${fr})" title="Frame ${fr}: ${kfVal}" style="font-size:11px;font-family:var(--font-mono);padding:4px 8px;border-radius:4px;border:1px solid ${isActive?'rgba(204,68,204,0.7)':'rgba(255,255,255,.15)'};background:${isActive?'rgba(204,68,204,0.15)':'rgba(255,255,255,.04)'};color:${isActive?'#cc44cc':'var(--text2)'};cursor:pointer;transition:all .1s;line-height:1.4;display:flex;flex-direction:column;align-items:center;min-width:50px;">
            <span style="font-size:9px;color:${isActive?'#cc44cc':'var(--muted)'};">${fr}</span>
            <span style="font-size:10px;font-weight:600;">${kfVal}</span>
          </button>`;
        });
        html += `</div>`;
        
        // Prev/Next nav
        html += `<div style="display:flex;gap:6px;margin-bottom:8px;">
          <button onclick="NodeVisualizer.bdScrubStep('${nodeId}',-1)" ${curIdx<=0?'disabled':''} style="flex:1;font-size:12px;font-family:var(--font-mono);padding:5px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;opacity:${curIdx<=0?'.3':'1'}">◂ Prev</button>
          <button onclick="NodeVisualizer.bdScrubStep('${nodeId}',1)" ${curIdx>=paramFrames.length-1?'disabled':''} style="flex:1;font-size:12px;font-family:var(--font-mono);padding:5px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;opacity:${curIdx>=paramFrames.length-1?'.3':'1'}">Next ▸</button>
        </div>`;
      }
      
      // Path geometry section
      html += `<div style="font-size:9px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;margin-top:10px;">Path Geometry</div>`;
      if (pts.length) {
        html += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--text);background:rgba(255,255,255,.04);border-radius:4px;padding:6px 8px;margin-bottom:4px;">`;
        pts.slice(0, 6).forEach((pt, i) => {
          html += `<div style="color:${i===0?'var(--accent)':'var(--text2)'};margin-bottom:2px;">[${i}] X: ${fmtNum(String(pt.x))}, Y: ${fmtNum(String(pt.y))}</div>`;
        });
        if (pts.length > 6) html += `<div style="color:var(--muted);font-size:9px;">…${pts.length - 6} more points</div>`;
        html += `</div>`;
      } else {
        const defVal = selParamObj.param.v || '0.5, 0.5';
        html += `<div style="font-size:15px;font-family:var(--font-mono);color:var(--text);padding:6px 8px;background:rgba(255,255,255,.05);border-radius:4px;">${defVal}</div>`;
      }

    } else if (selParamObj) {
      const val = selParamObj.param.v || '—';
      html += `<div style="font-size:12px;font-family:var(--font-mono);color:var(--text2);padding:6px 0;">${selParamObj.label}</div>`;
      html += `<div style="font-size:15px;font-family:var(--font-mono);color:var(--text);padding:4px 8px;background:rgba(255,255,255,.05);border-radius:4px;">${val}</div>`;
      html += `<div style="font-size:10px;font-family:var(--font-mono);color:var(--muted);margin-top:4px;">Static value — no animation data</div>`;
    } else {
      html += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--muted);padding:8px 0;">← Select a parameter to view keyframes &amp; spline</div>`;
    }

    html += `</div>`;
    html += `</div>`;

    body.innerHTML = html;

    // Draw spline canvas for selected param
    if (selParamObj && selParamObj.param.isKeyframe && selParamObj.param.keyframes && selParamObj.param.keyframes.length) {
      const canvasId = `bd-spline-${nodeId}-${_bdSelParam.replace(/[^a-z0-9]/gi,'_')}`;
      requestAnimationFrame(() => {
        const c = document.getElementById(canvasId);
        if (!c) return;
        _bdDrawParamSpline(c, selParamObj.param, scrubFrame ?? selParamObj.param.keyframes[0]?.frame);
      });
    }
  }

  /**
   * Draw a spline graph on a canvas
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} param - Parameter with keyframes
   * @param {number} activeFrame - Currently active frame
   */
  function _bdDrawParamSpline(canvas, param, activeFrame) {
    const kfs = (param.keyframes || []).slice().sort((a,b) => a.frame - b.frame);
    if (!kfs.length) return;
    
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 300, H = 110;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const PAD = {l:42, r:12, t:12, b:28};
    const gW = W - PAD.l - PAD.r, gH = H - PAD.t - PAD.b;

    let minF = kfs[0].frame, maxF = kfs[kfs.length-1].frame;
    let minV = Infinity, maxV = -Infinity;
    kfs.forEach(k => {
      const v = parseFloat(k.value ?? k.val ?? 0);
      minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      if (k.rh) { minV = Math.min(minV, k.rh.y); maxV = Math.max(maxV, k.rh.y); }
      if (k.lh) { minV = Math.min(minV, k.lh.y); maxV = Math.max(maxV, k.lh.y); }
    });
    if (minF === maxF) { minF -= 1; maxF += 1; }
    if (minV === maxV) { minV -= 0.1; maxV += 0.1; }
    const fp = (maxF - minF) * 0.06, vp = (maxV - minV) * 0.18;
    const fMin = minF - fp, fMax = maxF + fp, vMin = minV - vp, vMax = maxV + vp;
    const tx = f => PAD.l + (f - fMin) / (fMax - fMin) * gW;
    const ty = v => PAD.t + (1 - (v - vMin) / (vMax - vMin)) * gH;

    ctx.fillStyle = '#0d0d10'; ctx.beginPath(); ctx.roundRect(0,0,W,H,6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const v = vMin + (vMax - vMin) * i / 4, y = ty(v);
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px DM Mono,monospace'; ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), PAD.l - 3, y + 3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, H - PAD.b); ctx.lineTo(W - PAD.r, H - PAD.b); ctx.stroke();
    [minF, maxF].forEach(f => {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px DM Mono,monospace'; ctx.textAlign = 'center';
      ctx.fillText(Math.round(f), tx(f), H - PAD.b + 14);
    });

    // Draw curve
    ctx.strokeStyle = '#f0c060'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < kfs.length - 1; i++) {
      const k0 = kfs[i], k1 = kfs[i+1];
      const v0 = parseFloat(k0.value ?? k0.val ?? 0), v1 = parseFloat(k1.value ?? k1.val ?? 0);
      const x0 = tx(k0.frame), y0 = ty(v0), x3 = tx(k1.frame), y3 = ty(v1);
      const cp1x = k0.rh ? tx(k0.rh.x) : x0+(x3-x0)/3, cp1y = k0.rh ? ty(k0.rh.y) : y0;
      const cp2x = k1.lh ? tx(k1.lh.x) : x3-(x3-x0)/3, cp2y = k1.lh ? ty(k1.lh.y) : y3;
      if (i === 0) ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
    }
    ctx.stroke();

    // Keyframe diamonds
    kfs.forEach(k => {
      const v = parseFloat(k.value ?? k.val ?? 0);
      const px = tx(k.frame), py = ty(v);
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI/4);
      ctx.fillStyle = '#f0c060'; ctx.strokeStyle = '#0d0d10'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.rect(-4,-4,8,8); ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // Playhead line at active frame
    if (activeFrame !== null && activeFrame !== undefined) {
      const px = tx(activeFrame);
      if (px >= PAD.l && px <= W - PAD.r) {
        ctx.strokeStyle = 'rgba(200,240,96,0.7)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(px, PAD.t); ctx.lineTo(px, H - PAD.b); ctx.stroke();
        ctx.setLineDash([]);
        const interpVal = parseFloat(_getValueAtFrame(param, activeFrame));
        if (!isNaN(interpVal)) {
          const py2 = ty(interpVal);
          ctx.fillStyle = 'var(--accent)';
          ctx.beginPath(); ctx.arc(px, py2, 4, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // Make canvas interactive
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const frac = (mx - PAD.l) / gW;
      const hoverF = fMin + frac * (fMax - fMin);
      if (hoverF < fMin || hoverF > fMax) return;
      const hoverFrame = Math.round(hoverF);
      _bdDrawParamSpline(canvas, param, hoverFrame);
      const lbl = document.getElementById('bd-frame-lbl');
      if (lbl) lbl.textContent = hoverFrame;
      const valLbl = document.getElementById('bd-val-lbl');
      if (valLbl) valLbl.textContent = _getValueAtFrame(param, hoverFrame);
    };
    canvas.onmouseleave = () => {
      _bdDrawParamSpline(canvas, param, _kfScrubFrame);
      const lbl = document.getElementById('bd-frame-lbl');
      if (lbl && _kfScrubFrame !== null) lbl.textContent = _kfScrubFrame;
      const valLbl = document.getElementById('bd-val-lbl');
      if (valLbl && _kfScrubFrame !== null) valLbl.textContent = _getValueAtFrame(param, _kfScrubFrame);
    };
  }

  /**
   * Select a parameter in the bottom drawer
   * @param {string} nodeId - Node ID
   * @param {string} paramKey - Parameter key
   */
  function bdSelectParam(nodeId, paramKey) {
    _bdSelParam = paramKey;
  }

  /**
   * Scrub to a specific frame
   * @param {string} nodeId - Node ID
   * @param {number} frame - Frame number
   */
  function bdScrubFrame(nodeId, frame) {
    _kfScrubFrame = frame;
  }

  /**
   * Step to prev/next keyframe
   * @param {string} nodeId - Node ID
   * @param {number} dir - Direction (-1 or 1)
   */
  function bdScrubStep(nodeId, dir) {
    // This is a placeholder - the actual implementation needs node data
    // which is passed via callbacks in the options
  }

  /**
   * Hide the bottom drawer
   */
  function hideBottomDrawer() {
    const drawer = document.getElementById('bottom-drawer');
    if (drawer) drawer.classList.add('hidden');
  }

  /**
   * Toggle the bottom drawer visibility
   */
  function toggleBottomDrawer() {
    const body = document.getElementById('bd-body');
    if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const NodeVisualizer = {
    // Main rendering functions
    renderParamsPanel,
    renderParamsDisplay,
    showBottomDrawer,
    hideBottomDrawer,
    toggleBottomDrawer,
    
    // State access (for integration)
    getScrubFrame: () => _kfScrubFrame,
    setScrubFrame: (frame) => { _kfScrubFrame = frame; },
    getSelectedParam: () => _bdSelParam,
    setSelectedParam: (param) => { _bdSelParam = param; },
    
    // Interactive callbacks (set by parent)
    bdSelectParam,
    bdScrubFrame,
    bdScrubStep,
    
    // Internal utilities (exposed for advanced use)
    _getValueAtFrame,
    _bdDrawParamSpline,
    _renderCustomParamEditor,
    fmtNum,
    fmtParamLabel,
    getParamGroup,
    isNoise,
  };

  // Export based on environment
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeVisualizer;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() { return NodeVisualizer; });
  } else {
    global.NodeVisualizer = NodeVisualizer;
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
