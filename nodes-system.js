/**
 * nodes-system.js - Universal Fusion Node System for Noding
 * 
 * This is the single source of truth for all node graph operations across:
 * - nodegraph.html (full editor)
 * - edit-effect-owner.html (effect edit modal)
 * - effects.html (effect detail view)
 * - effect-modal.html (effect preview)
 * 
 * Provides: Parsing → Data Structure → Rendering → Parameter Display
 */

(function() {
  'use strict';

  /* ================================================================
     SECTION 1: CONFIGURATION & CONSTANTS
     ================================================================ */

  const CONFIG = {
    NODE_W: 170,
    NODE_H: 110,
    PORT_RADIUS: 6,
    COLORS: {
      '3D': '#0fa888',
      'Color': '#eab308',
      'Filter': '#ef4444',
      'Composite': '#94a3b8',
      'Distort': '#a855f7',
      'Analysis': '#6c7bff',
      'Time': '#f59e0b',
      'Source': '#0fa888',
      'Matte': '#ec4899',
      'Effect': '#8b5cf6',
      'Custom': '#6c7bff'
    }
  };

  // Fusion enum mappings for human-readable values
  const FUSION_ENUMS = {
    'Operation': { '0':'Copy','1':'AND','2':'OR','3':'XOR','4':'Add','5':'Subtract','6':'Multiply','7':'Divide','8':'Maximum','9':'Minimum' },
    'To Alpha': { '0':'Off','1':'Luminance','2':'Red','3':'Green','4':'Blue','5':'Cyan','6':'Magenta','7':'Yellow','8':'Hatch' },
    'To Red': { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    'To Green': { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    'To Blue': { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    'Apply Mode': { '0':'Normal','1':'Screen','2':'Add','3':'Multiply','4':'Subtract','5':'Difference','6':'Overlay' },
    'Blend Mode': { '0':'Normal','1':'Screen','2':'Add','3':'Multiply','4':'Subtract','5':'Difference' }
  };

  // Tool types to skip during parsing
  const SKIP_TYPES = new Set(['Input','Polyline','Point','OperatorInfo','InstanceInput','InstanceOutput','GroupInfo']);
  const SKIP_NAMES = new Set(['ordered','Comp','Tools','Inputs','Outputs','Input','Output','ViewInfo']);

  // Motion-path and spline helper types — internal to Fusion, not real comp nodes.
  // BUG FIX: previously only BezierSpline + PolyPath were filtered; Fusion also
  // emits Path, XYPath, BezierPath, LinearPath, etc. for animated position paths.
  const PATH_TYPES = new Set([
    'BezierSpline','PolyPath','Path','XYPath','BezierPath',
    'LinearPath','MoPath','MotionPath','SplinePath','PathFollow'
  ]);

  // Name patterns for motion-path helpers (path1, Path2, spline3 …)
  const PATH_NAME_RE = /^[Pp]ath\d*$|^[Ss]pline\d*$|^[Bb]ezier\d*$|^[Mm]o[Pp]ath\d*$/;

  /* ================================================================
     SECTION 2: UTILITY FUNCTIONS
     ================================================================ */

  /**
   * Extract a balanced brace block starting at startIdx
   * Returns { content: string, endIdx: number }
   */
  function extractBlock(text, startIdx) {
    let depth = 1, i = startIdx;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    return { content: text.slice(startIdx, i - 1), endIdx: i };
  }

  /**
   * Format a number to reasonable precision
   */
  function fmtNum(s) {
    const n = parseFloat(s);
    if (isNaN(n)) return s;
    const r = parseFloat(n.toPrecision(5));
    return String(r);
  }

  /**
   * Format a scalar value (number, boolean, string)
   */
  function formatScalar(raw) {
    raw = String(raw).trim().replace(/,$/, '');
    if (raw === 'true' || raw === 'false') return raw;
    if (/^-?[\d.eE+]+$/.test(raw)) return fmtNum(raw);
    if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
    return raw;
  }

  /**
   * Format FuID { "..." } to inner string
   */
  function formatFuID(raw) {
    if (!raw) return '—';
    raw = String(raw).trim().replace(/,$/, '');
    const fuM = raw.match(/^FuID\s*\{\s*"([^"]+)"\s*\}/);
    return fuM ? fuM[1] : formatScalar(raw);
  }

  /**
   * Format boolean with On/Off for known boolean params
   */
  function fmtBoolParam(paramName, val) {
    if (val !== '0' && val !== '1' && val !== 0 && val !== 1) return String(val);
    const isTrue = val === '1' || val === 1;
    
    if (/^Process\s/i.test(paramName)) return isTrue ? 'On' : 'Off';
    if (/\b(Invert|Inverted|Enabled|Active|Visible|Clip\s*Black|Clip\s*White|Only|PreDivide|Premult|Perform|MultiplyByMask)\b/i.test(paramName)) {
      return isTrue ? 'On' : 'Off';
    }
    if (/\bOnly$/i.test(paramName)) return isTrue ? 'On' : 'Off';
    return String(val);
  }

  /**
   * Look up enum value
   */
  function lookupEnum(paramName, val) {
    for (const [pattern, table] of Object.entries(FUSION_ENUMS)) {
      if (paramName.includes(pattern) || pattern.includes(paramName)) {
        const result = table[String(val)];
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * Get category color
   */
  function getCategoryColor(cat) {
    return CONFIG.COLORS[cat] || CONFIG.COLORS['Custom'];
  }

  /* ================================================================
     SECTION 3: PARSING ENGINE
     ================================================================ */

  /**
   * Main entry: Parse Fusion Lua text into structured nodes
   * Returns { nodes: [], edges: [], raw: string }
   */
  function parseFusion(luaText) {
    if (!luaText || !luaText.trim()) {
      return { nodes: [], edges: [], raw: '' };
    }

    const raw = luaText.trim();
    
    // Check if it's Fusion format
    if (!raw.includes('Tools') && !raw.includes('SourceOp')) {
      // Simple arrow notation fallback
      return parseArrowNotation(raw);
    }

    // Full Fusion parse
    const topLevelText = getTopLevelToolsContent(raw);
    const entries = shallowScanTools(topLevelText);
    
    // First pass: collect splines
    const splineMap = {};
    const polyPathMap = {}; // Store PolyPath data too
    for (const entry of entries) {
      if (entry.type === 'BezierSpline') {
        const kfs = parseBezierKeyframes(entry.content);
        splineMap[entry.name] = { type: 'BezierSpline', keyframes: kfs };
      } else if (entry.type === 'PolyPath') {
        // Extract actual polyline points from the PolyPath block
        const pts = parsePolyPathPoints(entry.content);
        // Store in BOTH maps: polyPathMap for metadata, splineMap so parseInputsBlock
        // can resolve SourceOp = "pathN" → real XY data instead of just the name
        splineMap[entry.name]    = { type: 'PolyPath', points: pts };
        polyPathMap[entry.name]  = { type: 'PolyPath', points: pts };
      }
    }
    
    // Store maps globally for connection tracing
    window._splineMap = splineMap;
    window._polyPathMap = polyPathMap;

    // Second pass: parse tools
    const nodes = [];
    const edges = [];
    const instMap = {}; // instance name → node index
    let nodeIdx = 0;

    for (const entry of entries) {
      if (SKIP_NAMES.has(entry.name) || SKIP_TYPES.has(entry.type)) continue;
      // Skip all motion-path / spline helper types (expanded from original two-type check)
      if (PATH_TYPES.has(entry.type)) continue;
      // Also guard by name pattern — catches edge cases where the type differs between
      // Fusion versions (e.g. "Path" vs "PolyPath") but the variable name is still path-like
      if (PATH_NAME_RE.test(entry.name)) continue;

      // Extract position
      const posM = entry.content.match(/Pos\s*=\s*\{\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\}/);
      const pos = posM ? { x: parseFloat(posM[1]), y: parseFloat(posM[2]) } : { x: 0, y: 0 };

      // Detect instance (SourceOp before Inputs)
      const inputsIdx = entry.content.search(/\bInputs\s*=\s*(?:ordered\s*\(\s*\)\s*)?\{/);
      const topLevel = inputsIdx >= 0 ? entry.content.slice(0, inputsIdx) : entry.content;
      const toolSrcOpM = topLevel.match(/SourceOp\s*=\s*"([^"]+)"/);
      const instanceOf = toolSrcOpM ? toolSrcOpM[1] : null;

      // Parse inputs/parameters
      const params = {};
      const hasInputs = inputsIdx !== -1;
      
      if (hasInputs) {
        const inputsOpen = entry.content.indexOf('{', inputsIdx) + 1;
        const { content: inputsContent } = extractBlock(entry.content, inputsOpen);
        const parsedParams = parseInputsBlock(inputsContent, splineMap);
        
        Object.entries(parsedParams).forEach(([k, v]) => {
          params[k] = {
            v: v.value,
            raw: v.raw,
            type: v.type,
            keyframes: v.keyframes,
            enumValue: v.enumValue,
            sourceOp: v.sourceOp,
            // Path / animation flags used by display layer
            isPath:     v.isPath     || false,
            isKeyframe: v.isKeyframe || false,
            pathPoints: v.pathPoints || null
          };
        });
      }

      // Determine category
      const cat = categorizeTool(entry.type);

      const node = {
        id: 'n' + (++nodeIdx),
        fusionName: entry.name,
        name: entry.type,
        category: cat,
        catColor: getCategoryColor(cat),
        x: pos.x,
        y: pos.y,
        params: params,
        instanceOf: instanceOf,
        _rawBlock: entry.content
      };

      nodes.push(node);
      instMap[entry.name] = node.id;
    }

    // Build edges from SourceOp references in params
    for (const node of nodes) {
      for (const [key, val] of Object.entries(node.params)) {
        if (val.sourceOp) {
          const targetId = instMap[val.sourceOp];
          if (targetId) {
            edges.push({
              from: targetId,
              to: node.id,
              input: key,
              fromName: val.sourceOp,
              toName: node.fusionName
            });
          }
        }
      }
    }

    return { nodes, edges, raw: luaText };
  }

  /**
   * Parse ALL nodes including hidden ones (PolyPath, BezierSpline)
   * Used for connection tracing to find keyframes in non-visible nodes
   * Returns array of all tool entries with parsed data
   */
  function parseAllNodes(luaText) {
    if (!luaText || !luaText.trim()) return [];
    
    const raw = luaText.trim();
    if (!raw.includes('Tools') && !raw.includes('SourceOp')) return [];
    
    const topLevelText = getTopLevelToolsContent(raw);
    const entries = shallowScanTools(topLevelText);
    
    const allNodes = [];
    const splineMap = {};
    
    // First pass: collect BezierSplines
    for (const entry of entries) {
      if (entry.type === 'BezierSpline') {
        const kfs = parseBezierKeyframes(entry.content);
        splineMap[entry.name] = { type: 'BezierSpline', keyframes: kfs };
        allNodes.push({
          name: entry.name,
          type: entry.type,
          keyframes: kfs,
          params: {}
        });
      }
    }
    
    // Second pass: collect all other nodes including PolyPath
    for (const entry of entries) {
      if (entry.type === 'BezierSpline') continue; // Already handled
      
      let params = {};
      
      // Parse inputs if present
      const inputsIdx = entry.content.search(/\bInputs\s*=\s*(?:ordered\s*\(\s*\)\s*)?\{/);
      if (inputsIdx >= 0) {
        const inputsOpen = entry.content.indexOf('{', inputsIdx);
        const inputsBlock = extractBlock(entry.content, inputsOpen + 1);
        params = parseInputsBlock(inputsBlock.content, splineMap);
      }
      
      allNodes.push({
        name: entry.name,
        type: entry.type,
        params: params,
        raw: entry.content
      });
    }
    
    // Also store maps globally for backward compatibility
    window._splineMap = splineMap;
    window._polyPathMap = allNodes
      .filter(n => n.type === 'PolyPath')
      .reduce((map, n) => {
        map[n.name] = { type: 'PolyPath', params: n.params };
        return map;
      }, {});
    
    return allNodes;
  }

  /**
   * Get content inside Tools = ordered() { ... }
   */
  function getTopLevelToolsContent(src) {
    const toolsMatch = src.match(/\bTools\s*=\s*ordered\s*\(\s*\)\s*\{|\bTools\s*=\s*ordered\s*\{/);
    if (!toolsMatch) return src;
    const openBrace = src.indexOf('{', toolsMatch.index + toolsMatch[0].length - 1);
    if (openBrace === -1) return src;
    const { content } = extractBlock(src, openBrace + 1);
    return content;
  }

  /**
   * Shallow scan - only top-level entries, never nested
   */
  function shallowScanTools(src) {
    const entries = [];
    const headRe = /([\w]+)\s*=\s*([\w]+)\s*\{/g;
    headRe.lastIndex = 0;
    let m;
    
    while ((m = headRe.exec(src)) !== null) {
      const name = m[1];
      const type = m[2];
      const openAfter = headRe.lastIndex;
      const { content, endIdx } = extractBlock(src, openAfter);
      entries.push({ name, type, content });
      headRe.lastIndex = endIdx;
    }
    return entries;
  }

  /**
   * Parse Inputs block to extract parameters
   */
  function parseInputsBlock(inputsContent, splineMap) {
    const params = {};
    let i = 0;
    const len = inputsContent.length;

    while (i < len) {
      while (i < len && /\s/.test(inputsContent[i])) i++;
      if (i >= len) break;

      // Match input name: word or ["quoted"]
      const nameMatch = inputsContent.slice(i).match(/^(?:\["([^"]+)"\]|(\w+))\s*=\s*(InstanceInput|Input)\s*\{/);
      if (!nameMatch) { 
        while (i < len && inputsContent[i] !== '\n') i++; 
        i++; 
        continue; 
      }

      const pname = nameMatch[1] || nameMatch[2];
      const entryType = nameMatch[3];
      const bodyStart = i + nameMatch[0].length;
      const { content: pbody, endIdx } = extractBlock(inputsContent, bodyStart);
      i = endIdx;

      // Extract Value using balanced brace parsing
      let rawVal = '';
      const valueIdx = pbody.search(/\bValue\s*=\s*/);
      if (valueIdx !== -1) {
        const afterValue = valueIdx + pbody.slice(valueIdx).match(/\bValue\s*=\s*/)[0].length;
        // Check if it's a complex nested structure
        if (pbody[afterValue] === '{') {
          const extracted = extractBlock(pbody, afterValue + 1);
          rawVal = '{' + extracted.content + '}';
        } else {
          // Simple value - extract until comma or newline
          const simpleMatch = pbody.slice(afterValue).match(/^([^,\n]+)/);
          rawVal = simpleMatch ? simpleMatch[1].trim() : '';
        }
      }
      
      let formattedVal = formatFuID(rawVal);
      let keyframes = null;
      let type = 'value';

      // Check for Polyline and show point count
      const polylineM = rawVal.match(/Polyline\s*\{/);
      if (polylineM) {
        const pointMatches = rawVal.match(/\{\s*Linear|X\s*=/g);
        const pointCount = pointMatches ? pointMatches.length : 0;
        formattedVal = pointCount + ' points';
        type = 'polyline';
      }

      // Check for spline reference
      const bezierM = rawVal.match(/BezierSpline\s*\{\s*Name\s*=\s*"([^"]+)"/);
      if (bezierM && splineMap[bezierM[1]]) {
        const spline = splineMap[bezierM[1]];
        keyframes = spline.keyframes;
        if (keyframes && keyframes.length) {
          formattedVal = keyframes[0].value;
          type = 'animated';
        }
      }

      // Extract SourceOp for connections
      const sourceOpM = pbody.match(/\bSourceOp\s*=\s*"([^"]+)"/);
      const sourceOp = sourceOpM ? sourceOpM[1] : null;

      // Resolve SourceOp against splineMap — covers PolyPath motion paths and
      // BezierSpline references that come via SourceOp rather than inline Value
      if (sourceOp && splineMap && splineMap[sourceOp]) {
        const splineData = splineMap[sourceOp];

        if (splineData.type === 'PolyPath') {
          // Motion path — store actual XY points so display shows coordinates, not "path2"
          const pts = splineData.points || [];
          const firstPt = pts[0];
          const displayXY = firstPt
            ? `${fmtNum(String(firstPt.x))}, ${fmtNum(String(firstPt.y))}`
            : '0.5, 0.5';
          params[pname] = {
            value: displayXY,
            raw: displayXY,
            type: 'path',
            keyframes: null,
            pathPoints: pts,
            sourceOp: sourceOp,
            isPath: true
          };
          continue; // fully resolved — skip generic fallthrough

        } else if (splineData.type === 'BezierSpline' && splineData.keyframes && splineData.keyframes.length) {
          // Animated via BezierSpline referenced by SourceOp (rather than inline Value)
          const kf0 = splineData.keyframes[0];
          params[pname] = {
            value: fmtNum(String(kf0.value)),
            raw: String(kf0.value),
            type: 'animated',
            keyframes: splineData.keyframes,
            sourceOp: sourceOp,
            isKeyframe: true
          };
          continue;
        }
      }

      // Check for enum
      const enumVal = lookupEnum(pname, formattedVal);
      if (enumVal) formattedVal = enumVal;

      // Boolean formatting
      formattedVal = fmtBoolParam(pname, formattedVal);

      params[pname] = {
        value: formattedVal,
        raw: rawVal,
        type: type,
        keyframes: keyframes,
        enumValue: enumVal,
        sourceOp: sourceOp
      };
    }

    return params;
  }

  /**
   * Parse BezierSpline keyframes from a Fusion .setting block.
   *
   * Fusion clipboard format (Ctrl+C) uses:
   *   KeyFrames = {
   *     [1]   = { 0.5, RH = { 34, 0.583 }, Flags = { Linear = true } },
   *     [100] = { 1.0, LH = { 67, 0.416 } },
   *   }
   *
   * Handles (RH/LH) are { frameOffset, value } pairs stored as positional args,
   * which map to absolute { x: frame, y: value } for the spline evaluator.
   */
  function parseBezierKeyframes(content) {
    // Locate the KeyFrames = { ... } block
    const kfIdx = content.search(/\bKeyFrames\s*=\s*\{/);
    if (kfIdx === -1) return [];
    const kfOpen = content.indexOf('{', kfIdx) + 1;
    const { content: kfContent } = extractBlock(content, kfOpen);

    const keyframes = [];
    // Match each entry: [frameNum] = {
    const entryRe = /\[(\d+(?:\.\d+)?)\]\s*=\s*\{/g;
    let em;
    while ((em = entryRe.exec(kfContent)) !== null) {
      const frame = parseFloat(em[1]);
      const entStart = em.index + em[0].length;
      const { content: entBody } = extractBlock(kfContent, entStart);

      // First token in the entry body is the keyframe value
      const valM = entBody.match(/^\s*(-?[\d.eE+\-]+)/);
      const value = valM ? parseFloat(valM[1]) : NaN;
      if (isNaN(value)) continue;

      const kf = { frame, value };

      // Parse right handle: RH = { frameAbs, valueAbs }
      // Fusion stores handles as absolute frame + absolute value positional args
      const rhM = entBody.match(/\bRH\s*=\s*\{\s*(-?[\d.eE+\-]+)\s*,\s*(-?[\d.eE+\-]+)/);
      if (rhM) {
        kf.rh = { x: parseFloat(rhM[1]), y: parseFloat(rhM[2]) };
      }

      // Parse left handle: LH = { frameAbs, valueAbs }
      const lhM = entBody.match(/\bLH\s*=\s*\{\s*(-?[\d.eE+\-]+)\s*,\s*(-?[\d.eE+\-]+)/);
      if (lhM) {
        kf.lh = { x: parseFloat(lhM[1]), y: parseFloat(lhM[2]) };
      }

      // Detect hold/step interpolation
      if (/\bFlags\s*=\s*\{[^}]*\bHold\b/.test(entBody)) {
        kf.hold = true;
      }

      keyframes.push(kf);
    }

    return keyframes.sort((a, b) => a.frame - b.frame);
  }

  /**
   * Extract XY points from a PolyPath block.
   * Looks for  Value = Polyline { Points = { [n] = { X = ..., Y = ... } } }
   * inside the PolyPath's Inputs block.
   */
  function parsePolyPathPoints(content) {
    // Find the Polyline value block
    const polyIdx = content.search(/Value\s*=\s*Polyline\s*\{/);
    if (polyIdx === -1) return [];
    const polyOpen = content.indexOf('{', polyIdx) + 1;
    const { content: polyBody } = extractBlock(content, polyOpen);
    // Extract individual X, Y pairs
    const ptRe = /X\s*=\s*(-?[\d.eE+]+)\s*,\s*Y\s*=\s*(-?[\d.eE+]+)/g;
    const pts = [];
    let pm;
    while ((pm = ptRe.exec(polyBody)) !== null) {
      pts.push({ x: parseFloat(pm[1]), y: parseFloat(pm[2]) });
    }
    return pts;
  }

  /**
   * Categorize a tool type
   */
  function categorizeTool(toolType) {
    // Check NODE_DETAIL if available
    if (typeof window !== 'undefined' && window.NODE_DETAIL && window.NODE_DETAIL[toolType]) {
      return window.NODE_DETAIL[toolType].category || 'Custom';
    }
    
    // Fallback patterns
    const patterns = {
      '3D': /Transform3D|Renderer3D|Camera3D|Light3D|Merge3D|Shape3D|ImagePlane3D/,
      'Color': /ColorCorrector|ColorCurves|ColorSpace|HueCurves|Saturation|Brightness/,
      'Filter': /Blur|Glow|Defocus|Sharpen|Dilate|Erode|Filter/,
      'Distort': /Displace|Distort|Warp|Transform|Crop|Resize/,
      'Composite': /Merge|Matte|Channel|Combine|Composite/,
      'Source': /MediaIn|Background|Text|FastNoise|Plasma/,
      'Analysis': /OpticalFlow|MotionVector|Disparity|Keyer/,
      'Time': /TimeSpeed|TimeStretch|Freeze|FrameBlend/,
      'Matte': /Matte|LumaKeyer|ChromaKeyer|DeltaKeyer|Keyer/
    };

    for (const [cat, regex] of Object.entries(patterns)) {
      if (regex.test(toolType)) return cat;
    }
    return 'Custom';
  }

  /**
   * Simple arrow notation parser (fallback)
   */
  function parseArrowNotation(str) {
    const parts = str.split(/\s*(?:→|->|>|,)\s*/).map(s => s.trim()).filter(Boolean);
    const nodes = [];
    const edges = [];
    
    parts.forEach((part, idx) => {
      const cat = categorizeTool(part);
      nodes.push({
        id: 'n' + (idx + 1),
        fusionName: part,
        name: part,
        category: cat,
        catColor: getCategoryColor(cat),
        x: 18 + (idx % 5) * (CONFIG.NODE_W + 40),
        y: 24 + Math.floor(idx / 5) * (CONFIG.NODE_H + 26),
        params: {}
      });
      if (idx > 0) {
        edges.push({ from: 'n' + idx, to: 'n' + (idx + 1) });
      }
    });

    return { nodes, edges, raw: str };
  }

  /* ================================================================
     SECTION 4: DATA STRUCTURE NORMALIZATION
     ================================================================ */

  /**
   * Normalize parsed data to standard format
   */
  function normalizeGraph(parsed) {
    return {
      nodes: parsed.nodes.map(n => ({
        id: n.id,
        name: n.name,
        fusionName: n.fusionName,
        category: n.category,
        catColor: n.catColor,
        x: n.x,
        y: n.y,
        params: n.params || {},
        instanceOf: n.instanceOf || null,
        _rawSetting: n._rawBlock || ''
      })),
      edges: parsed.edges.map(e => ({
        from: e.from,
        to: e.to,
        input: e.input || '',
        fromName: e.fromName || '',
        toName: e.toName || ''
      })),
      raw: parsed.raw
    };
  }

  /**
   * Serialize for storage (Supabase/localStorage)
   */
  function serializeGraph(graphData) {
    return JSON.stringify(graphData);
  }

  /**
   * Deserialize from storage
   */
  function deserializeGraph(jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('[nodes-system] Deserialize failed:', e);
      return { nodes: [], edges: [], raw: '' };
    }
  }

  /* ================================================================
     SECTION 5: RENDERING FUNCTIONS
     ================================================================ */

  /**
   * Draw a single node card on canvas
   */
  function drawNode(ctx, node, options = {}) {
    const { 
      selected = false, 
      scale = 1,
      offsetX = 0,
      offsetY = 0,
      ghost = false 
    } = options;

    const x = node.x * scale + offsetX;
    const y = node.y * scale + offsetY;
    const w = CONFIG.NODE_W * scale;
    const h = CONFIG.NODE_H * scale;
    const r = 8 * scale;

    // Category stripe (top 3px)
    ctx.fillStyle = node.catColor || CONFIG.COLORS['Custom'];
    ctx.fillRect(x, y, w, 3 * scale);

    // Card background
    ctx.fillStyle = ghost ? 'rgba(30,30,42,0.5)' : '#1e1e2a';
    ctx.strokeStyle = selected ? '#6c7bff' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = selected ? 2 : 1;
    
    // Rounded rect
    ctx.beginPath();
    ctx.roundRect(x, y + 3 * scale, w, h - 3 * scale, r);
    ctx.fill();
    ctx.stroke();

    // Node name
    ctx.fillStyle = '#f4f4fb';
    ctx.font = `600 ${Math.max(8, 14 * scale)}px 'DM Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const name = node.name || 'Unknown';
    const maxWidth = w - 20 * scale;
    let displayName = name;
    
    // Truncate if too long
    while (ctx.measureText(displayName).width > maxWidth && displayName.length > 3) {
      displayName = displayName.slice(0, -4) + '...';
    }
    
    ctx.fillText(displayName, x + 10 * scale, y + 18 * scale);

    // Category label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.max(7, 10 * scale)}px 'DM Mono', monospace`;
    ctx.fillText(node.category || 'Custom', x + 10 * scale, y + 40 * scale);

    // Instance indicator
    if (node.instanceOf) {
      ctx.fillStyle = '#b07118';
      ctx.fillText('⬡ Instance', x + 10 * scale, y + 55 * scale);
    }
  }

  /**
   * Draw a connection edge (bezier spline)
   */
  function drawConnection(ctx, fromNode, toNode, options = {}) {
    const { 
      scale = 1, 
      offsetX = 0,
      offsetY = 0,
      highlight = false 
    } = options;

    const x1 = (fromNode.x + CONFIG.NODE_W) * scale + offsetX;
    const y1 = (fromNode.y + CONFIG.NODE_H / 2) * scale + offsetY;
    const x2 = toNode.x * scale + offsetX;
    const y2 = (toNode.y + CONFIG.NODE_H / 2) * scale + offsetY;

    const cp1x = x1 + Math.max(50 * scale, (x2 - x1) * 0.4);
    const cp1y = y1;
    const cp2x = x2 - Math.max(50 * scale, (x2 - x1) * 0.4);
    const cp2y = y2;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    
    ctx.strokeStyle = highlight ? '#6c7bff' : 'rgba(108,123,255,0.4)';
    ctx.lineWidth = highlight ? 2 : 1.4;
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(y2 - cp2y, x2 - cp2x);
    const ah = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(angle - Math.PI / 6), y2 - ah * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - ah * Math.cos(angle + Math.PI / 6), y2 - ah * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = highlight ? '#6c7bff' : 'rgba(108,123,255,0.6)';
    ctx.fill();
  }

  /**
   * Auto-layout nodes in grid
   */
  function autoLayout(nodes, options = {}) {
    const { cols = 5, xGap = 40, yGap = 26, startX = 18, startY = 24 } = options;

    nodes.forEach((node, idx) => {
      node.x = startX + (idx % cols) * (CONFIG.NODE_W + xGap);
      node.y = startY + Math.floor(idx / cols) * (CONFIG.NODE_H + yGap);
    });

    return nodes;
  }

  /**
   * Calculate bounding box of all nodes
   */
  function getNodesBounds(nodes) {
    if (!nodes || nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 200, maxY: 100 };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      const nx = node.x || 0;
      const ny = node.y || 0;
      minX = Math.min(minX, nx);
      minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx + CONFIG.NODE_W);
      maxY = Math.max(maxY, ny + CONFIG.NODE_H);
    });
    
    return { minX, minY, maxX, maxY };
  }

  /**
   * Calculate scale to fit nodes within canvas with padding
   */
  function calculateFitScale(nodes, width, height, padding = 30) {
    const bounds = getNodesBounds(nodes);
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    
    if (contentWidth <= 0 || contentHeight <= 0) return 1;
    
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    
    // Use the smaller scale to fit everything, clamp to reasonable limits
    return Math.max(0.08, Math.min(2, Math.min(scaleX, scaleY)));
  }

  /**
   * Render complete graph to canvas
   */
  function renderGraph(ctx, nodes, edges, options = {}) {
    const { 
      width, 
      height, 
      scale = 1, 
      fit = false,
      padding = 30,
      selectedId = null,
      clearColor = '#06060d'
    } = options;

    // Calculate scale if fit mode is enabled
    let finalScale = scale;
    let offsetX = 0;
    let offsetY = 0;
    
    if (fit && nodes.length > 0) {
      finalScale = calculateFitScale(nodes, width, height, padding);
      const bounds = getNodesBounds(nodes);
      
      // Center the content
      const contentWidth = (bounds.maxX - bounds.minX) * finalScale;
      const contentHeight = (bounds.maxY - bounds.minY) * finalScale;
      offsetX = (width - contentWidth) / 2 - bounds.minX * finalScale;
      offsetY = (height - contentHeight) / 2 - bounds.minY * finalScale;
    }

    // Clear
    ctx.fillStyle = clearColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid dots
    ctx.fillStyle = 'rgba(108,123,255,0.07)';
    for (let gx = 0; gx < width; gx += 22) {
      for (let gy = 0; gy < height; gy += 22) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw edges first (behind nodes)
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    edges.forEach(edge => {
      const from = nodeMap[edge.from];
      const to = nodeMap[edge.to];
      if (from && to) {
        drawConnection(ctx, from, to, { 
          scale: finalScale,
          offsetX,
          offsetY 
        });
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      drawNode(ctx, node, { 
        scale: finalScale, 
        offsetX,
        offsetY,
        selected: node.id === selectedId 
      });
    });
  }

  /* ================================================================
     SECTION 6: SPLINE / KEYFRAME VISUALIZATION
     ================================================================ */

  /**
   * Render a mini spline graph for animated parameters
   * Shows bezier curve with keyframe markers
   */
  function renderMiniSpline(container, keyframes, options = {}) {
    const { 
      width = 120, 
      height = 40, 
      color = '#6c7bff',
      showLabels = false 
    } = options;

    if (!keyframes || keyframes.length < 2) {
      container.innerHTML = '<span style="font-size:9px;color:var(--text-muted)">No animation</span>';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.cssText = 'width:' + width + 'px;height:' + height + 'px;background:rgba(6,6,13,0.5);border-radius:4px;';
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Calculate ranges
    let minF = Infinity, maxF = -Infinity, minV = Infinity, maxV = -Infinity;
    keyframes.forEach(kf => {
      minF = Math.min(minF, kf.frame);
      maxF = Math.max(maxF, kf.frame);
      minV = Math.min(minV, kf.value);
      maxV = Math.max(maxV, kf.value);
    });
    
    const fp = (maxF - minF) * 0.1;
    const vp = (maxV - minV) * 0.2 || 0.1;
    const fMin = minF - fp, fMax = maxF + fp;
    const vMin = minV - vp, vMax = maxV + vp;

    const PAD = { l: 4, r: 4, t: 4, b: 4 };
    const gW = width - PAD.l - PAD.r, gH = height - PAD.t - PAD.b;
    
    const tx = f => PAD.l + (f - fMin) / (fMax - fMin) * gW;
    const ty = v => PAD.t + (1 - (v - vMin) / (vMax - vMin)) * gH;

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 2; i++) {
      const y = PAD.t + gH * i / 2;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(width - PAD.r, y); ctx.stroke();
    }

    // Draw spline curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      const k0 = keyframes[i], k1 = keyframes[i + 1];
      const x0 = tx(k0.frame), y0 = ty(k0.value);
      const x3 = tx(k1.frame), y3 = ty(k1.value);
      
      // Bezier control points from RH/LH handles
      const cp1x = k0.rh ? tx(k0.rh.x) : x0 + (x3 - x0) / 3;
      const cp1y = k0.rh ? ty(k0.rh.y) : y0;
      const cp2x = k1.lh ? tx(k1.lh.x) : x3 - (x3 - x0) / 3;
      const cp2y = k1.lh ? ty(k1.lh.y) : y3;
      
      if (i === 0) ctx.moveTo(x0, y0);
      if (k0.hold) {
        ctx.lineTo(x3, y0);
        ctx.lineTo(x3, y3);
      } else {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
      }
    }
    ctx.stroke();

    // Draw keyframe markers
    keyframes.forEach(kf => {
      const px = tx(kf.frame), py = ty(kf.value);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    container.appendChild(canvas);
  }

  /**
   * Render full spline graph (for modal/popup)
   * Similar to nodegraph.html implementation
   */
  function renderSplineGraph(ctx, splines, options = {}) {
    const { 
      width = 800, 
      height = 380,
      showGrid = true,
      showLabels = true
    } = options;

    if (!splines || !splines.length) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.canvas.width = width * dpr;
    ctx.canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const PAD = { l: 58, r: 22, t: 24, b: 42 };
    const gW = width - PAD.l - PAD.r, gH = height - PAD.t - PAD.b;

    // Calculate ranges across all splines
    let minF = Infinity, maxF = -Infinity, minV = Infinity, maxV = -Infinity;
    splines.forEach(sp => sp.keyframes.forEach(kf => {
      minF = Math.min(minF, kf.frame); maxF = Math.max(maxF, kf.frame);
      minV = Math.min(minV, kf.val || kf.value); maxV = Math.max(maxV, kf.val || kf.value);
      if (kf.rh) { maxF = Math.max(maxF, kf.rh.x); minV = Math.min(minV, kf.rh.y); maxV = Math.max(maxV, kf.rh.y); }
      if (kf.lh) { maxF = Math.max(maxF, kf.lh.x); minV = Math.min(minV, kf.lh.y); maxV = Math.max(maxV, kf.lh.y); }
    }));

    const fp = Math.max((maxF - minF) * 0.08, 4);
    const vp = Math.max((maxV - minV) * 0.18, 0.15);
    const fMin = minF - fp, fMax = maxF + fp;
    const vMin = minV - vp, vMax = maxV + vp;

    const tx = f => PAD.l + (f - fMin) / (fMax - fMin) * gW;
    const ty = v => PAD.t + (1 - (v - vMin) / (vMax - vMin)) * gH;

    const gridC = 'rgba(255,255,255,0.06)', axisC = 'rgba(255,255,255,0.2)', lblC = 'rgba(255,255,255,0.35)';
    const font = '10px DM Mono,monospace';

    // Background
    ctx.fillStyle = '#0d0d10';
    ctx.beginPath(); ctx.roundRect(0, 0, width, height, 8); ctx.fill();

    // Grid
    if (showGrid) {
      ctx.strokeStyle = gridC; ctx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const v = vMin + (vMax - vMin) * i / 5, y = ty(v);
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(width - PAD.r, y); ctx.stroke();
        if (showLabels) {
          ctx.fillStyle = lblC; ctx.font = font; ctx.textAlign = 'right';
          ctx.fillText(v.toFixed(3), PAD.l - 5, y + 3.5);
        }
      }
      for (let i = 0; i <= 6; i++) {
        const f = fMin + (fMax - fMin) * i / 6, x = tx(f);
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, height - PAD.b); ctx.stroke();
        if (showLabels) {
          ctx.fillStyle = lblC; ctx.textAlign = 'center';
          ctx.fillText(Math.round(f), x, height - PAD.b + 14);
        }
      }
    }

    // Axes
    ctx.strokeStyle = axisC; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, height - PAD.b); ctx.lineTo(width - PAD.r, height - PAD.b); ctx.stroke();
    
    if (showLabels) {
      ctx.fillStyle = lblC; ctx.font = '11px DM Sans,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Frame', PAD.l + gW / 2, height - 4);
      ctx.save(); ctx.translate(11, PAD.t + gH / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('Value', 0, 0); ctx.restore();
    }

    // Draw splines
    splines.forEach(sp => {
      const kfs = sp.keyframes;
      ctx.strokeStyle = sp.color || '#6c7bff'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < kfs.length - 1; i++) {
        const k0 = kfs[i], k1 = kfs[i+1];
        const v0 = k0.val || k0.value, v1 = k1.val || k1.value;
        const x0 = tx(k0.frame), y0 = ty(v0), x3 = tx(k1.frame), y3 = ty(v1);
        const cp1x = k0.rh ? tx(k0.rh.x) : x0 + (x3-x0)/3, cp1y = k0.rh ? ty(k0.rh.y) : y0;
        const cp2x = k1.lh ? tx(k1.lh.x) : x3 - (x3-x0)/3, cp2y = k1.lh ? ty(k1.lh.y) : y3;
        if (i === 0) ctx.moveTo(x0, y0);
        if (k0.hold) { ctx.lineTo(x3, y0); ctx.lineTo(x3, y3); }
        else ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
      }
      ctx.stroke();

      // Keyframe markers
      kfs.forEach(kf => {
        const px = tx(kf.frame), py = ty(kf.val || kf.value);
        // Handle points
        const drawH = (hx, hy) => {
          ctx.strokeStyle='rgba(180,180,180,0.3)'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(hx,hy); ctx.stroke();
          ctx.fillStyle='rgba(200,200,200,0.55)';
          ctx.beginPath(); ctx.arc(hx,hy,3,0,Math.PI*2); ctx.fill();
        };
        if (kf.rh) drawH(tx(kf.rh.x), ty(kf.rh.y));
        if (kf.lh) drawH(tx(kf.lh.x), ty(kf.lh.y));
        // Keyframe diamond
        ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI/4);
        ctx.fillStyle = sp.color || '#6c7bff'; ctx.strokeStyle = '#0d0d10'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.rect(-5,-5,10,10); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    });
  }

  /* ================================================================
     SECTION 7: PARAMETER DISPLAY (with spline support)
     ================================================================ */

  /**
   * Render parameter panel to DOM container
   * Supports: node selection → parameter selection → spline visualization
   */
  function renderParams(container, node, options = {}) {
    const { 
      readOnly = true,
      onParamSelect = null,  // callback(key, param) when parameter clicked
      showSplines = true,    // show mini spline preview for animated params
      selectedParam = null   // currently selected parameter key
    } = options;
    
    container.innerHTML = '';

    if (!node) {
      container.innerHTML = '<div style="color:var(--text-muted);font-style:italic;">Select a node to view parameters</div>';
      return;
    }

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 14px;border-bottom:1px solid var(--border);';
    header.innerHTML = `
      <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;">${node.fusionName || node.name}</div>
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">
        ${node.name}${node.category ? ' · ' + node.category : ''}
      </div>
    `;
    container.appendChild(header);

    // Spline visualization panel (for selected animated parameter)
    const splinePanel = document.createElement('div');
    splinePanel.id = 'spline-panel';
    splinePanel.style.cssText = 'padding:10px 14px;border-bottom:1px solid var(--border);background:rgba(108,123,255,0.05);display:none;';
    container.appendChild(splinePanel);

    // Parameters list
    const list = document.createElement('div');
    list.style.cssText = 'padding:10px 14px;max-height:calc(100vh - 360px);overflow-y:auto;';

    const params = node.params || {};
    const paramKeys = Object.keys(params).filter(k => !k.endsWith('_SourceOp'));

    if (paramKeys.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:11px;font-style:italic;">No parameters available</div>';
    } else {
      // Group by table if multiple tables
      const tables = {};
      paramKeys.forEach(key => {
        const table = params[key].table || 'Parameters';
        if (!tables[table]) tables[table] = [];
        tables[table].push(key);
      });

      Object.entries(tables).forEach(([tableName, keys]) => {
        // Table section header
        if (Object.keys(tables).length > 1) {
          const section = document.createElement('div');
          section.style.cssText = 'font-size:10px;color:var(--violet);text-transform:uppercase;margin:12px 0 8px 0;letter-spacing:0.05em;';
          section.textContent = tableName;
          list.appendChild(section);
        }

        keys.forEach(key => {
          const param = params[key];
          const isAnimated = param.keyframes && param.keyframes.length > 0;
          const isSelected = selectedParam === key;
          
          const row = document.createElement('div');
          row.className = 'param-row';
          row.style.cssText = isSelected 
            ? 'margin-bottom:10px;font-size:11px;padding:8px;background:rgba(108,123,255,0.1);border-radius:6px;border:1px solid rgba(108,123,255,0.3);cursor:pointer;'
            : 'margin-bottom:10px;font-size:11px;padding:8px;background:var(--bg);border-radius:6px;border:1px solid transparent;cursor:pointer;transition:all 0.15s;';
          
          // Hover effect
          row.onmouseenter = () => { if (!isSelected) row.style.background = 'rgba(255,255,255,0.05)'; };
          row.onmouseleave = () => { if (!isSelected) row.style.background = 'var(--bg)'; };
          
          // Click to select
          row.onclick = () => {
            // Update all rows styling
            list.querySelectorAll('.param-row').forEach(r => {
              r.style.background = 'var(--bg)';
              r.style.borderColor = 'transparent';
            });
            row.style.background = 'rgba(108,123,255,0.1)';
            row.style.borderColor = 'rgba(108,123,255,0.3)';
            
            // Show spline if animated
            if (isAnimated && showSplines) {
              splinePanel.style.display = 'block';
              splinePanel.innerHTML = `
                <div style="font-size:10px;color:var(--violet);text-transform:uppercase;margin-bottom:8px;letter-spacing:0.05em;">
                  ${key} Animation
                </div>
                <div id="spline-canvas-container" style="width:100%;height:100px;background:#0d0d10;border-radius:6px;"></div>
                <div style="display:flex;gap:12px;margin-top:8px;font-size:9px;color:var(--text-muted);">
                  <span>${param.keyframes.length} keyframes</span>
                  <span>Frame ${param.keyframes[0].frame} → ${param.keyframes[param.keyframes.length-1].frame}</span>
                </div>
              `;
              
              // Render spline
              setTimeout(() => {
                const canvasContainer = splinePanel.querySelector('#spline-canvas-container');
                if (canvasContainer) {
                  const canvas = document.createElement('canvas');
                  canvas.width = canvasContainer.offsetWidth;
                  canvas.height = 100;
                  canvas.style.width = '100%';
                  canvas.style.height = '100%';
                  canvasContainer.appendChild(canvas);
                  
                  const ctx = canvas.getContext('2d');
                  renderSplineGraph(ctx, [{
                    name: key,
                    color: '#6c7bff',
                    keyframes: param.keyframes
                  }], {
                    width: canvasContainer.offsetWidth,
                    height: 100,
                    showGrid: true,
                    showLabels: true
                  });
                }
              }, 10);
            } else {
              splinePanel.style.display = 'none';
              splinePanel.innerHTML = '';
            }
            
            // Call callback
            if (onParamSelect) onParamSelect(key, param);
          };

          // Label row
          const labelRow = document.createElement('div');
          labelRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;';
          
          const label = document.createElement('div');
          label.style.cssText = 'color:var(--text-muted);font-size:10px;';
          label.textContent = key;
          
          const badges = document.createElement('div');
          if (isAnimated) {
            badges.innerHTML = '<span style="color:var(--violet);font-size:8px;">◆ ANIMATED</span>';
          }
          
          labelRow.appendChild(label);
          labelRow.appendChild(badges);

          // Value row
          const value = document.createElement('div');
          value.style.cssText = 'color:var(--text);font-family:var(--font-mono);font-size:11px;';
          
          // Format value
          let displayVal = param.enumValue || param.v || '—';
          if (typeof displayVal === 'boolean') displayVal = displayVal ? 'true' : 'false';
          else if (typeof displayVal === 'number') displayVal = String(displayVal);
          
          value.textContent = displayVal;
          
          // Mini spline preview for animated params (when not selected)
          if (isAnimated && showSplines && !isSelected) {
            const miniContainer = document.createElement('div');
            miniContainer.style.cssText = 'margin-top:6px;height:24px;';
            row.appendChild(labelRow);
            row.appendChild(value);
            row.appendChild(miniContainer);
            
            // Render mini spline
            setTimeout(() => {
              renderMiniSpline(miniContainer, param.keyframes, { 
                width: miniContainer.offsetWidth, 
                height: 24,
                color: '#6c7bff'
              });
            }, 0);
          } else {
            row.appendChild(labelRow);
            row.appendChild(value);
          }

          list.appendChild(row);
        });
      });
    }

    container.appendChild(list);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:10px 14px;border-top:1px solid var(--border);font-size:10px;color:var(--text-muted);';
    footer.innerHTML = readOnly 
      ? '<em>Click parameter to view • ◆ indicates animation</em>' 
      : '<em>Click values to edit</em>';
    container.appendChild(footer);
  }

  /* ================================================================
     SECTION 7: RULE-BASED FUSION ANALYZER
     Pure JS — no external API required.
     Takes the result of parseFusion() and returns structured insights.
     ================================================================ */

  // Classified tool-type sets for semantic understanding
  const _A = {
    source:    new Set(['MediaIn','Loader','Background','FastNoise','Plasma','Gradient','Text','Text3D','ReactorLoader','BitmapMask']),
    output:    new Set(['MediaOut','Saver','DirectoryWatcher']),
    color:     new Set(['ColorCorrector','ColorCurves','HueCurves','Saturation','Brightness','Contrast','LUTCube','GammaCorrection','ColorSpace','ColorGain','WhiteBalance','ExposureTool']),
    blur:      new Set(['Blur','Glow','Defocus','Sharpen','Dilate','Erode','SoftClip','Unsharpen','GaussianBlur','VariBlur']),
    composite: new Set(['Merge','ChannelBoolean','MatteControl','AlphaMultiply','AlphaDivide','Dissolve','BooleanOp']),
    transform: new Set(['Transform','Scale','Resize','Crop','Flip','GridWarp','Corner','DVEDistort','Rotate']),
    distort:   new Set(['DisplaceDistort','LensDistortion','GridWarp','PolarCoords','Ripple','Turbulence','WarpTransform','WobbleDistort','Deform']),
    mask:      new Set(['RectangleMask','EllipseMask','BSplineMask','PolyMask','MaskPaint','BitmapMask','LumaKeyerMask','PlanarTrackerMask']),
    keyer:     new Set(['DeltaKeyer','ChromaKeyer','LumaKeyer','UltraKeyer','MatteControl','KeyMix','Primatte']),
    tracker:   new Set(['Tracker','PlanarTracker','CameraTracker']),
    '3d':      new Set(['Renderer3D','Merge3D','Transform3D','Camera3D','PointLight3D','SpotLight3D','DirectionalLight3D','Shape3D','ImagePlane3D','FBXMesh3D','AlembicMesh3D','Fog3D']),
    time:      new Set(['TimeSpeed','TimeStretcher','Freeze','FrameBlend','TimeDisplace','OpticalFlowInterpolation']),
    analysis:  new Set(['OpticalFlow','MotionVector','Disparity','LensData','Deflicker']),
    paint:     new Set(['PaintFlat','Bitmap','Polyline']),
    particle:  new Set(['pEmitter','pRender','pChangeStyle','pFlock','pAvoid','pSpawn','pGravity','pWall','pTurbulence','pVortex','pMerge','pKill'])
  };

  // Human-readable label per category
  const _CAT_LABEL = {
    source:'source input', output:'output', color:'colour correction', blur:'blur / filter',
    composite:'composite / merge', transform:'transform', distort:'distortion',
    mask:'mask', keyer:'keyer / matte', tracker:'tracker', '3d':'3D', time:'time effect',
    analysis:'motion analysis', paint:'paint', particle:'particle'
  };

  // Animated parameter name → human description
  const _PARAM_HINTS = {
    Center:'position', Size:'scale', Angle:'rotation', Blend:'opacity',
    Saturation:'colour', Gain:'exposure', Gamma:'midtone', Lift:'shadow',
    XBlur:'blur radius', YBlur:'blur radius', Blend:'blend amount',
    Width:'width', Height:'height', Pivot:'pivot point',
    Red:'red channel', Green:'green channel', Blue:'blue channel',
    Alpha:'alpha', Opacity:'opacity', Level:'level', Softness:'softness'
  };

  function _nodeCategory(type) {
    for (const [cat, set] of Object.entries(_A)) {
      if (set.has(type)) return cat;
    }
    return 'custom';
  }

  // BFS topological sort — returns nodes ordered from roots (sources) to leaves (outputs)
  function _topoSort(nodes, edges) {
    const idMap = {};
    nodes.forEach(n => { idMap[n.id] = n; });

    const inDeg = {};
    const adj = {};
    nodes.forEach(n => { inDeg[n.id] = 0; adj[n.id] = []; });
    edges.forEach(e => {
      if (adj[e.from]) adj[e.from].push(e.to);
      if (inDeg[e.to] !== undefined) inDeg[e.to]++;
    });

    const queue = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
    const result = [];
    const visited = new Set();

    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      if (idMap[id]) result.push(idMap[id]);
      (adj[id] || []).forEach(nid => {
        inDeg[nid]--;
        if (inDeg[nid] <= 0) queue.push(nid);
      });
    }

    // Append any remaining nodes not reached by BFS (disconnected)
    nodes.forEach(n => { if (!visited.has(n.id)) result.push(n); });
    return result;
  }

  /**
   * Analyze a parsed Fusion composition — pure JS, no API needed.
   * @param {Object} parseResult  Output from parseFusion()
   * @returns {Object} analysis   Structured report ready to render
   */
  function analyzeFusion(parseResult) {
    const { nodes, edges } = parseResult;
    if (!nodes || nodes.length === 0) {
      return { valid: false, reason: 'No nodes found' };
    }

    // ── Classify each node ──────────────────────────────────────────
    const classified = nodes.map(n => ({
      ...n,
      _cat: _nodeCategory(n.name)
    }));

    const byCategory = {};
    classified.forEach(n => {
      if (!byCategory[n._cat]) byCategory[n._cat] = [];
      byCategory[n._cat].push(n);
    });

    const sources    = byCategory['source']    || [];
    const outputs    = byCategory['output']    || [];
    const composites = byCategory['composite'] || [];
    const colors     = byCategory['color']     || [];
    const blurs      = byCategory['blur']       || [];
    const transforms = byCategory['transform'] || [];
    const distorts   = byCategory['distort']   || [];
    const keyers     = byCategory['keyer']      || [];
    const trackers   = byCategory['tracker']   || [];
    const threeD     = byCategory['3d']         || [];
    const timers     = byCategory['time']       || [];
    const particles  = byCategory['particle']  || [];
    const analysis   = byCategory['analysis']  || [];
    const masks      = byCategory['mask']       || [];

    // ── Animation inventory ─────────────────────────────────────────
    const animatedParams = [];
    let globalFrameMin = Infinity, globalFrameMax = -Infinity;

    classified.forEach(n => {
      Object.entries(n.params || {}).forEach(([key, param]) => {
        if (!param.keyframes || param.keyframes.length === 0) return;
        const kfs   = param.keyframes;
        const fMin  = kfs[0].frame;
        const fMax  = kfs[kfs.length - 1].frame;
        const vals  = kfs.map(k => k.value);
        const range = Math.max(...vals) - Math.min(...vals);
        globalFrameMin = Math.min(globalFrameMin, fMin);
        globalFrameMax = Math.max(globalFrameMax, fMax);

        const hint = Object.entries(_PARAM_HINTS).find(([k]) =>
          key.toLowerCase().includes(k.toLowerCase())
        );

        animatedParams.push({
          node:       n.fusionName,
          nodeType:   n.name,
          param:      key,
          keyframes:  kfs.length,
          frameStart: fMin,
          frameEnd:   fMax,
          valueRange: parseFloat(range.toPrecision(4)),
          hint:       hint ? hint[1] : null
        });
      });
    });

    const animatedNodes = [...new Set(animatedParams.map(p => p.node))];

    // ── Issues ──────────────────────────────────────────────────────
    const issues = [];
    const connectedIds = new Set();
    edges.forEach(e => { connectedIds.add(e.from); connectedIds.add(e.to); });

    if (nodes.length > 1) {
      nodes.forEach(n => {
        if (!connectedIds.has(n.id)) {
          issues.push({ severity: 'warning', msg: `"${n.fusionName}" (${n.name}) is not connected to any other node` });
        }
      });
    }
    if (sources.length === 0) {
      issues.push({ severity: 'info', msg: 'No MediaIn / source node detected — comp may rely on upstream input' });
    }
    if (outputs.length === 0) {
      issues.push({ severity: 'info', msg: 'No MediaOut / Saver node — comp has no explicit output connection' });
    }
    if (trackers.length > 0 && transforms.length === 0) {
      issues.push({ severity: 'info', msg: 'Tracker present but no Transform node — tracking data may not be applied' });
    }

    // ── Pipeline (topological) ──────────────────────────────────────
    const pipeline = _topoSort(classified, edges);

    // ── Prose summary ───────────────────────────────────────────────
    const parts = [];

    if (sources.length > 0) {
      const names = sources.map(s => `"${s.fusionName}"`).join(' and ');
      parts.push(`Takes ${sources.length === 1 ? 'one source input' : sources.length + ' source inputs'} (${names}).`);
    }

    if (threeD.length > 0) {
      parts.push(`Includes a 3D pipeline (${threeD.map(n => n.name).join(', ')}).`);
    }

    if (particles.length > 0) {
      parts.push(`Uses a particle system (${particles.length} particle node${particles.length > 1 ? 's' : ''}).`);
    }

    const middleParts = [];
    if (keyers.length)     middleParts.push(`${keyers.length} keyer${keyers.length > 1 ? 's' : ''}`);
    if (transforms.length) middleParts.push(`${transforms.length} transform${transforms.length > 1 ? 's' : ''}`);
    if (distorts.length)   middleParts.push(`${distorts.length} distortion${distorts.length > 1 ? 's' : ''}`);
    if (composites.length) middleParts.push(`${composites.length} composite merge${composites.length > 1 ? 's' : ''}`);
    if (colors.length)     middleParts.push(`${colors.length} colour-correction stage${colors.length > 1 ? 's' : ''}`);
    if (blurs.length)      middleParts.push(`${blurs.length} blur/filter node${blurs.length > 1 ? 's' : ''}`);
    if (masks.length)      middleParts.push(`${masks.length} mask${masks.length > 1 ? 's' : ''}`);

    if (middleParts.length > 0) {
      parts.push(`Applies ${middleParts.join(', ')}.`);
    }

    if (trackers.length > 0) {
      parts.push(`Motion tracked with ${trackers.map(n => n.name).join(', ')}.`);
    }
    if (timers.length > 0) {
      parts.push(`Time-remapped using ${timers.map(n => n.name).join(', ')}.`);
    }
    if (analysis.length > 0) {
      parts.push(`Includes ${analysis.map(n => n.name).join(', ')} analysis.`);
    }

    if (animatedParams.length > 0) {
      const animHints = [...new Set(animatedParams.filter(p => p.hint).map(p => p.hint))];
      parts.push(
        `Animated across ${globalFrameMax - globalFrameMin + 1} frames ` +
        `(${Math.round(globalFrameMin)}–${Math.round(globalFrameMax)})` +
        (animHints.length > 0 ? ` — driving ${animHints.slice(0, 3).join(', ')}` : '') +
        '.'
      );
    }

    if (outputs.length > 0) {
      parts.push(`Outputs via ${outputs.map(o => `"${o.fusionName}"`).join(' and ')}.`);
    }

    const summary = parts.join(' ');

    // ── Category breakdown for display ──────────────────────────────
    const categoryBreakdown = Object.entries(byCategory)
      .filter(([, arr]) => arr.length > 0)
      .map(([cat, arr]) => ({
        category: cat,
        label:    _CAT_LABEL[cat] || cat,
        count:    arr.length,
        nodes:    arr.map(n => ({ fusionName: n.fusionName, type: n.name }))
      }))
      .sort((a, b) => b.count - a.count);

    return {
      valid: true,
      summary,
      pipeline,
      categoryBreakdown,
      animatedParams,
      animatedNodes,
      frameRange: animatedParams.length > 0
        ? { start: Math.round(globalFrameMin), end: Math.round(globalFrameMax) }
        : null,
      issues,
      stats: {
        nodeCount:    nodes.length,
        edgeCount:    edges.length,
        animatedCount: animatedNodes.length,
        sourcesCount: sources.length,
        outputsCount: outputs.length
      }
    };
  }

  /* ================================================================
     SECTION 8: EXPORT PUBLIC API
     ================================================================ */

  window.NodeSystem = {
    // Configuration
    CONFIG,
    
    // Parsing
    parse: parseFusion,
    parseArrow: parseArrowNotation,
    categorizeTool,
    _parseAll: parseAllNodes, // Internal: parse all including hidden nodes
    
    // Analysis (rule-based, no API required)
    analyze: analyzeFusion,
    
    // Data
    normalize: normalizeGraph,
    serialize: serializeGraph,
    deserialize: deserializeGraph,
    
    // Rendering
    drawNode,
    drawConnection,
    autoLayout,
    renderGraph,
    
    // Splines / Animation
    renderMiniSpline,
    renderSplineGraph,
    
    // Parameters
    renderParams,
    formatValue: formatFuID,
    lookupEnum,
    
    // Utilities
    extractBlock,
    fmtNum,
    getCategoryColor
  };

  console.log('[nodes-system] Universal node system loaded');

})();
