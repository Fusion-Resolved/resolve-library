/**
 * Lua Analyzer Module
 * Detects custom functions, expressions, macros, and script blocks in Fusion Lua.
 * Identifies user-defined code vs built-in Fusion tools and expression functions.
 *
 * Works alongside nodes-system.js. Call analyzeLua(rawLua) standalone, or pass a
 * pre-parsed NodeSystem result as the second argument to avoid double-parsing.
 *
 * Exports: window.LuaAnalyzer
 */

(function() {
  'use strict';

  /* ================================================================
     CONSTANTS
     ================================================================ */

  // Fusion native tool types — not user-authored custom code
  const FUSION_BUILTINS = new Set([
    // Blur / Filter
    'Blur','Sharpen','ErodeDilate','RankFilter','Convolve','VectorMotionBlur',
    'MotionBlur','DirectionalBlur','RadialBlur','ZoomBlur','VariableBlur',
    'Defocus','DepthBlur','Bokeh','OpticalFlux','VectorBlur','ZBlur',
    'UnsharpMask','GaussianBlur','VariBlur','SoftGlow','Glow',
    // Color
    'BrightnessContrast','ColorCorrector','ColorCurves','ColorMatrix',
    'HueCurves','SaturationCurves','ColorSpace','Gamut','WhiteBalance',
    'Gamma','LUT','LUTCube','CineonLog','DepthColor','ColorGain',
    'ExposureTool','Color','GammaCorrection',
    // Composite / Merge
    'Merge','ChannelBooleans','ChannelBoolean','MatteControl','AlphaMultiply',
    'AlphaDivide','Dissolve','BooleanOp','Solid','Background','Dot',
    // Sources / Generators
    'FastNoise','Noise','Gradient','Ramp','Grid','Plasma','Mandelbrot','Tiles',
    // Transform / Warp
    'Transform','Affine','Crop','Resize','Scale','Rotate','Translate','Flip',
    'CornerPin','Perspective','LensDistortion','DVE','GridWarp','Corner',
    'WarpTransform','DVEDistort','DisplaceDistort',
    // Mask / Keyer
    'RectangleMask','EllipseMask','BSplineMask','PolyMask','MaskPaint',
    'BitmapMask','LumaKeyerMask','PlanarTrackerMask',
    'LumaKeyer','ChromaKeyer','DeltaKeyer','UltraKeyer','Keyer','KeyMix','Primatte',
    'Screen','Highlight','Shadow','ColorSuppress',
    // Text
    'TextPlus','Text3D','Text','Character','Paragraph',
    // 3D
    'Merge3D','Renderer3D','ImagePlane3D','Cube','Sphere','Shape3D','Camera3D',
    'PointLight3D','SpotLight3D','DirectionalLight3D','AmbientLight',
    'VolumeFog','Fog','OpenGLRender','FBXMesh3D','AlembicMesh3D','PointCloud3D',
    'Duplicate3D','Bender3D','Displace3D','WireFrame','ReplaceMaterial',
    'CustomVertex3D','UVMap3D','Texture2D','Replicate3D','Transform3D',
    'PointLight','SpotLight','DirectionalLight','PhongMaterial','Phong','Blinn','Ward',
    // Particle
    'pEmitter','pRender','pKill','pSpawn','pBounce','pAvoid','pChangeStyle',
    'pFlock','pFollow','pGyro','pTurbulence','pVortex','pWind','pGravity',
    'pFriction','pTarget','pMerge',
    // Tracking
    'PlanarTracker','CameraTracker','PointTracker','Tracker','Stabilize','CornerPositioner',
    // Deep
    'DeepColor','DeepMerge','DeepMask','DeepCrop','DeepRecolor',
    // Stereo
    'Stereo','Anaglyph','Interlace','SideBySide',
    // Time
    'TimeStretcher','TimeSpeed','Freeze','FrameBlend','Temporal',
    'OpticalFlow','Oflow','Kronos','MotionVectors','VectorGenerator',
    'FrameAverage','Deinterlace','Field','OpticalFlowInterpolation',
    // Analysis
    'MotionVector','Disparity','LensData','Deflicker',
    // I/O
    'MediaIn','MediaOut','Loader','Saver','DirectoryWatcher',
    // Macro / Group containers
    'MacroOperator','GroupOperator',
  ]);

  // Motion-path/spline internal types — filtered from node graph display
  const PATH_TYPES = new Set([
    'BezierSpline','PolyPath','Path','XYPath','BezierPath',
    'LinearPath','MoPath','MotionPath','SplinePath','PathFollow',
  ]);

  // Built-in Fusion expression-language identifiers — not user custom code
  const FUSION_EXPRESSION_FUNCS = new Set([
    'abs','acos','asin','atan','atan2','ceil','cos','cosh','deg','exp',
    'floor','fract','log','log10','max','min','mod','pow','rad','random',
    'round','sign','sin','sinh','smoothstep','sqrt','step','tan','tanh',
    'clamp','lerp','noise','cellnoise','perlin','turbulence',
    'getr','getg','getb','geta','getluma','getsat','gethue',
    'rgb','hsl','hsv','yuv','xyz','lab',
    'time','frames','fps','compwidth','compheight',
    'width','height','x','y','p','px','py','pt',
    'norm','normtan','normx','normy',
    'get','getlut1','getlut2','getlut3','getlut4',
    'point','vector','matrix','angle','dist','dot','cross',
    'if','then','else','while','for','do','end',
    'and','or','not','nil','true','false',
    'self','pi','e','math',
  ]);

  /* ================================================================
     INTERNAL UTILITIES — brace-counting (same approach as nodes-system.js)
     ================================================================ */

  function _extractBlock(text, startIdx) {
    let depth = 1, i = startIdx;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    return { content: text.slice(startIdx, i - 1), endIdx: i };
  }

  function _getToolsContent(src) {
    const m = src.match(/\bTools\s*=\s*ordered\s*\(\s*\)\s*\{|\bTools\s*=\s*ordered\s*\{|\bTools\s*=\s*\{/);
    if (!m) return src;
    const open = src.indexOf('{', m.index + m[0].length - 1);
    if (open === -1) return src;
    return _extractBlock(src, open + 1).content;
  }

  // Shallow scan: only yields direct children, never descends into nested blocks
  function _shallowScan(src) {
    const entries = [];
    const re = /([\w]+)\s*=\s*([\w]+)\s*\{/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1], type = m[2];
      const { content, endIdx } = _extractBlock(src, re.lastIndex);
      entries.push({ name, type, content });
      re.lastIndex = endIdx;
    }
    return entries;
  }

  function _lineOf(text, substr) {
    const idx = text.indexOf(substr);
    return idx === -1 ? null : text.slice(0, idx).split('\n').length;
  }

  /* ================================================================
     EXPRESSION DETECTION
     ================================================================ */

  /**
   * Return true if an expression string contains user-authored logic
   * rather than a plain numeric value or single built-in identifier.
   */
  function isExpressionCustom(expr) {
    if (!expr || typeof expr !== 'string' || expr.trim() === '') return false;
    const t = expr.trim();
    if (/^-?[\d.eE+]+$/.test(t)) return false;                              // plain number
    if (t === 'true' || t === 'false' || t === 'nil') return false;          // boolean/nil
    if (/^\w+$/.test(t) && FUSION_EXPRESSION_FUNCS.has(t.toLowerCase())) return false; // built-in
    // Operators, control flow, function calls, Fusion scripting references = custom
    return (
      /[+\-*\/<>=!%]/.test(t)         ||
      /\b(if|then|else)\b/.test(t)    ||
      /\b(for|while|repeat)\b/.test(t)||
      /\bfunction\b/.test(t)          ||
      /\blocal\b/.test(t)             ||
      /\w+\s*\(/.test(t)             ||   // any function call
      /comp:|tool:|self\./.test(t)        // Fusion scripting refs
    );
  }

  /* ================================================================
     INPUTS BLOCK SCANNER — finds Expression = "..." entries
     ================================================================ */

  function _scanInputsForExpressions(fullSrc, inputsContent, nodeName, result) {
    const re = /(?:(\w+)|\["([^"]+)"\])\s*=\s*(?:InstanceInput|Input)\s*\{/g;
    let m;
    while ((m = re.exec(inputsContent)) !== null) {
      const pname     = m[1] || m[2];
      const bodyStart = m.index + m[0].length;
      const { content: pbody, endIdx } = _extractBlock(inputsContent, bodyStart);
      re.lastIndex = endIdx;                 // skip past this block's content
      const exprM = pbody.match(/\bExpression\s*=\s*"([^"]*)"/);
      if (exprM && isExpressionCustom(exprM[1])) {
        result.expressions.push({
          node:  nodeName,
          param: pname,
          code:  exprM[1],
          line:  _lineOf(fullSrc, exprM[1]),
        });
      }
    }
  }

  /* ================================================================
     MAIN ANALYSIS FUNCTION
     ================================================================ */

  /**
   * Analyze Fusion Lua code for custom elements.
   *
   * @param {string}  luaCode        Raw Fusion Lua text
   * @param {Object}  [parsedResult] Optional pre-parsed output from NodeSystem.parse()
   * @returns {Object} Analysis result
   */
  function analyzeLua(luaCode, parsedResult) {
    if (!luaCode || typeof luaCode !== 'string') {
      return { valid: false, error: 'No Lua code provided' };
    }

    const result = {
      valid:        true,
      builtinTools: [],    // [{ name, type }]
      customTools:  [],    // [{ name, type }] — unknown types (macros, plug-ins, CustomTool)
      pathHelpers:  [],    // [{ name, type }] — internal motion-path nodes
      expressions:  [],    // [{ node, param, code, line }]
      macros:       [],    // [{ name }]
      groups:       [],    // [{ name }]
      scriptBlocks: [],    // [{ node, content }]
      functionDefs: [],    // [{ name, line }] — Lua function foo()
      stats: {
        totalLines:       luaCode.split('\n').length,
        totalEntries:     0,
        builtinCount:     0,
        customToolCount:  0,
        pathHelperCount:  0,
        expressionCount:  0,
        animatedCount:    0,
      },
    };

    /* ── Tool inventory ── */
    const SKIP_NAMES = new Set(['ordered','Tools','Inputs','Outputs','Input','Output','ViewInfo']);
    const toolsContent = _getToolsContent(luaCode);
    const entries      = _shallowScan(toolsContent);
    result.stats.totalEntries = entries.length;

    for (const { name, type, content } of entries) {
      if (SKIP_NAMES.has(name)) continue;

      if (PATH_TYPES.has(type)) {
        result.pathHelpers.push({ name, type });
        result.stats.pathHelperCount++;
        continue;
      }

      if (FUSION_BUILTINS.has(type)) {
        result.builtinTools.push({ name, type });
        result.stats.builtinCount++;
      } else {
        result.customTools.push({ name, type });
        result.stats.customToolCount++;
        if (type === 'MacroOperator') result.macros.push({ name });
        if (type === 'GroupOperator') result.groups.push({ name });
      }

      // Scan Inputs for Expression = "..."
      const inputsIdx = content.search(/\bInputs\s*=\s*(?:ordered\s*\(\s*\)\s*)?\{/);
      if (inputsIdx >= 0) {
        const open = content.indexOf('{', inputsIdx);
        if (open >= 0) {
          const { content: inputsContent } = _extractBlock(content, open + 1);
          _scanInputsForExpressions(luaCode, inputsContent, name, result);
        }
      }

      // Scan for Script = { ... } blocks
      const scriptIdx = content.search(/\bScript\s*=\s*\{/);
      if (scriptIdx >= 0) {
        const open = content.indexOf('{', scriptIdx);
        if (open >= 0) {
          const { content: sc } = _extractBlock(content, open + 1);
          result.scriptBlocks.push({
            node:    name,
            content: sc.trim().slice(0, 200) + (sc.length > 200 ? '…' : ''),
          });
        }
      }
    }

    /* ── Top-level Lua function definitions ── */
    const funcRe = /^function\s+(\w[\w.]*)\s*\(/gm;
    let fm;
    while ((fm = funcRe.exec(luaCode)) !== null) {
      result.functionDefs.push({ name: fm[1], line: _lineOf(luaCode, fm[0]) });
    }

    /* ── Animation count ── */
    if (parsedResult && parsedResult.nodes) {
      let anim = 0;
      parsedResult.nodes.forEach(n => {
        Object.values(n.params || {}).forEach(p => {
          if (p && p.keyframes && p.keyframes.length > 0) anim++;
        });
      });
      result.stats.animatedCount = anim;
    } else {
      // Proxy: count BezierSpline entries in the raw Lua
      result.stats.animatedCount = entries.filter(e => e.type === 'BezierSpline').length;
    }

    result.stats.expressionCount = result.expressions.length;

    return result;
  }

  /* ================================================================
     SINGLE-NODE ANIMATION HELPER
     (used by value-display.js and nodegraph.html)
     ================================================================ */

  /**
   * Analyze animation state for a single parsed node.
   * Supports both flat and nested { table, params } param structures.
   */
  function analyzeNodeAnimation(node) {
    const out = {
      hasAnimation:   false,
      animatedParams: [],
      totalKeyframes: 0,
      frameRange:     { start: Infinity, end: -Infinity },
    };
    if (!node || !node.params) return out;

    function walk(params) {
      Object.entries(params).forEach(([key, param]) => {
        if (!param || typeof param !== 'object') return;
        if (param.params) { walk(param.params); return; }           // nested table group
        const kfs = param.keyframes || [];
        if (!kfs.length) return;
        out.hasAnimation = true;
        out.totalKeyframes += kfs.length;
        out.animatedParams.push({
          name:          key,
          keyframeCount: kfs.length,
          frameRange:    { start: kfs[0].frame, end: kfs[kfs.length - 1].frame },
        });
        kfs.forEach(kf => {
          out.frameRange.start = Math.min(out.frameRange.start, kf.frame);
          out.frameRange.end   = Math.max(out.frameRange.end,   kf.frame);
        });
      });
    }
    walk(node.params);
    return out;
  }

  /* ================================================================
     REPORT GENERATOR
     ================================================================ */

  function generateReport(analysis) {
    if (!analysis || !analysis.valid) return analysis?.error || 'No analysis available';
    const s = analysis.stats;
    const lines = [
      '=== Fusion Lua Analysis ===', '',
      `Lines of code  : ${s.totalLines}`,
      `Tool entries   : ${s.totalEntries}`,
      `  Built-in     : ${s.builtinCount}`,
      `  Custom/macro : ${s.customToolCount}`,
      `  Path helpers : ${s.pathHelperCount}  ← filtered, not shown as nodes`,
      `Expressions    : ${s.expressionCount}`,
      `Animated params: ${s.animatedCount}`,
      '',
    ];
    if (analysis.customTools.length) {
      lines.push('Custom / unknown tools:');
      analysis.customTools.forEach(t => lines.push(`  ${t.name} = ${t.type}`));
      lines.push('');
    }
    if (analysis.expressions.length) {
      lines.push('Custom expressions:');
      analysis.expressions.slice(0, 10).forEach(e =>
        lines.push(`  ${e.node}.${e.param}: ${e.code.slice(0,60)}${e.code.length>60?'…':''}`)
      );
      if (analysis.expressions.length > 10) lines.push(`  … and ${analysis.expressions.length - 10} more`);
      lines.push('');
    }
    if (analysis.scriptBlocks.length) {
      lines.push(`Script blocks: ${analysis.scriptBlocks.length}`);
      analysis.scriptBlocks.forEach(sb => lines.push(`  in ${sb.node}`));
    }
    return lines.join('\n');
  }

  /* ================================================================
     EXPORT
     ================================================================ */

  window.LuaAnalyzer = {
    analyze:              analyzeLua,
    analyzeNodeAnimation,
    generateReport,
    isExpressionCustom,
    BUILTINS:             FUSION_BUILTINS,
    PATH_TYPES:           PATH_TYPES,
    EXPRESSION_FUNCS:     FUSION_EXPRESSION_FUNCS,
  };

  console.log('[lua-analyzer] Loaded');

})();
