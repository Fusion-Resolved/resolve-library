/**
 * fusion-param-parser.js
 * 
 * Fusion .setting file parser module
 * Extracts parameter data, keyframes, splines, and paths from Fusion clipboard format
 * 
 * Source: nodegraph_legacy.html (most complete implementation)
 */

(function(global) {
  'use strict';

  // ============================================================================
  // DATA STRUCTURES - Parameter defaults, enums, and categorization
  // ============================================================================

  /**
   * Default values for Fusion parameters that are omitted when at default.
   * These are applied when a parameter shows as '—' (omitted in export).
   */
  const FUSION_PARAM_DEFAULTS = {
    // 2D transforms (normalized 0-1 space)
    'Center': { v: '0.5, 0.5' },
    'Size': { v: '1' },
    'Angle': { v: '0' },
    'Aspect': { v: '1' },
    'Pivot': { v: '0.5, 0.5' },
    'XOffset': { v: '0.5' },
    'YOffset': { v: '0.5' },
    // 3D transforms (scene units)
    'Transform3DOp.Translate.X': { v: '0' },
    'Transform3DOp.Translate.Y': { v: '0' },
    'Transform3DOp.Translate.Z': { v: '0' },
    'Transform3DOp.Rotate.X': { v: '0' },
    'Transform3DOp.Rotate.Y': { v: '0' },
    'Transform3DOp.Rotate.Z': { v: '0' },
    'Transform3DOp.Scale.X': { v: '1' },
    'Transform3DOp.Scale.Y': { v: '1' },
    'Transform3DOp.Scale.Z': { v: '1' },
    // Color correction
    'Gain': { v: '1' },
    'Gamma': { v: '1' },
    'Lift': { v: '0' },
    'Brightness': { v: '1' },
    'Contrast': { v: '1' },
    'Saturation': { v: '1' },
    'Hue': { v: '0' },
    'Blend': { v: '1' },
    // Blur / glow
    'BlurSize': { v: '0' },
    'XBlurSize': { v: '0' },
    'YBlurSize': { v: '0' },
    'GlowSize': { v: '0' },
    'XGlowSize': { v: '0' },
    'YGlowSize': { v: '0' },
    // Text
    'Size': { v: '0.05' },
    'Tracking': { v: '0' },
    'Leading': { v: '1' },
  };

  /**
   * Global enum lookup tables - map numeric values to human-readable labels
   */
  const FUSION_ENUMS = {
    // ChannelBooleans
    'Operation': { '0':'Copy','1':'AND','2':'OR','3':'XOR','4':'Add','5':'Subtract','6':'Multiply','7':'Divide','8':'Maximum','9':'Minimum' },
    'To Alpha':  { '0':'Off','1':'Luminance','2':'Red','3':'Green','4':'Blue','5':'Cyan','6':'Magenta','7':'Yellow','8':'Hatch' },
    'To Red':    { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    'To Green':  { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    'To Blue':   { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    // BrightnessContrast
    'Alpha':     { '0':'Off','1':'On' },
    // ErodeDilate / morphological nodes
    'Filter':    { '0':'Box','1':'Bartlett','2':'Multi-box','3':'Gaussian' },
    'Lock X/Y':  { '0':'Unlocked','1':'Locked' },
    'Clipping Mode': { '0':'Frame','1':'Domain' },
    'Red':       { '0':'Off','1':'On' },
    'Green':     { '0':'Off','1':'On' },
    'Blue':      { '0':'Off','1':'On' },
    'XFilter':   { '0':'Box','1':'Bartlett','2':'Multi-box','3':'Gaussian' },
    'YFilter':   { '0':'Box','1':'Bartlett','2':'Multi-box','3':'Gaussian' },
    // Blur nodes filter types
    'Blend Mode':    { '0':'Normal','1':'Screen','2':'Dissolve','3':'Multiply','4':'Overlay','5':'Soft Light','6':'Hard Light','7':'Color Dodge','8':'Color Burn','9':'Darken','10':'Lighten','11':'Difference','12':'Exclusion','13':'Hue','14':'Saturation','15':'Color','16':'Luminosity' },
    'Apply Mode':    { '0':'Normal','1':'Screen','2':'Dissolve','3':'Multiply','4':'Overlay','5':'Soft Light','6':'Hard Light','7':'Color Dodge','8':'Color Burn','9':'Darken','10':'Lighten','11':'Difference','12':'Exclusion','13':'Hue','14':'Saturation','15':'Color','16':'Luminosity' },
    // ColorSpace
    'Color Space':   { '0':'sRGB','1':'Linear','2':'Log','3':'Rec.709','4':'Rec.2020','5':'P3-D65','6':'DaVinci Wide Gamut' },
    'From Color Space': { '0':'sRGB','1':'Linear','2':'Log','3':'Rec.709','4':'Rec.2020','5':'P3-D65','6':'DaVinci Wide Gamut' },
    'To Color Space':   { '0':'sRGB','1':'Linear','2':'Log','3':'Rec.709','4':'Rec.2020','5':'P3-D65','6':'DaVinci Wide Gamut' },
    // ChangeDepth
    'Depth':         { '0':'Auto','1':'int8','2':'int16','3':'Half Float','4':'Float32' },
    // Resize filter
    'Filter Type':   { '0':'Nearest','1':'Box','2':'Linear','3':'Quadratic','4':'Cubic','5':'Catmull-Rom','6':'Gaussian','7':'Mitchell','8':'Lanczos','9':'Sinc' },
    // Merge apply modes
    'Operator':      { '0':'Normal','1':'Screen','2':'Dissolve','3':'Multiply','4':'Overlay','5':'Soft Light','6':'Hard Light','7':'Color Dodge','8':'Color Burn','9':'Darken','10':'Lighten','11':'Difference','12':'Exclusion','13':'Hue','14':'Saturation','15':'Color','16':'Luminosity','19':'Over','20':'Under','21':'In','22':'Held Out','23':'Atop' },
    // Boolean operations
    'Boolean Operator': { '0':'AND','1':'OR','2':'XOR','3':'Not','4':'Darken','5':'Lighten','6':'Add','7':'Subtract','8':'Difference','9':'Multiply','10':'Divide' },
    // Noise types
    'Type':          { '0':'Fast Noise','1':'Turbulent Noise','2':'Gradient Noise','3':'Multi-Fractal Noise','4':'Wispy Noise','5':'Cauliflower Noise','6':'Plasma Noise','7':'Log Noise','8':'Absolute Log Noise' },
    // 3D renderer
    'Renderer':      { '0':'OpenGL','1':'Software' },
    'Light Model':   { '0':'Phong','1':'Blinn','2':'Cook-Torrance','3':'Ward' },
    // Flip
    'Flip Horiz':    { '0':'None','1':'Flip' },
    'Flip Vert':     { '0':'None','1':'Flip' },
    // Saver format
    'Format':        { '0':'BMP','1':'Cineon','2':'DPX','3':'EXR','4':'JPEG','5':'PNG','6':'PSD','7':'QuickTime','8':'TIFF','9':'TGA' },
    // Composite channel modes
    'Channels':      { '0':'Colour+Alpha','1':'Colour only','2':'Alpha only' },
    // HueSaturation channels
    'ColorChannels': { '0':'Master','1':'Red','2':'Yellow','3':'Green','4':'Cyan','5':'Blue','6':'Magenta' },
    // Tracker channel
    'Channel':       { '0':'Luminance','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    // pEmitter / particle
    'Style':         { '0':'Point','1':'Line','2':'Blob','3':'Sphere','4':'User Particle' },
    // Background gradient type
    'Gradient Type': { '0':'Linear','1':'Reflect','2':'Square','3':'Cross','4':'Radial' },
    // Text+ alignment
    'Horiz Align':   { '0':'Left','1':'Centre','2':'Right','3':'Justified' },
    'Vert Align':    { '0':'Top','1':'Centre','2':'Bottom' },
    'Layout Style':  { '0':'Horizontal','1':'Vertical','2':'Path' },
    // DVE edge behaviour
    'Edge':          { '0':'Black','1':'Wrap','2':'Duplicate Edge','3':'Reflect' },
  };

  /**
   * Per-tool enum overrides - specific tools may have different enum values
   */
  const FUSION_TOOL_ENUMS = {
    'ChannelBooleans': {
      'Operation': { '0':'Copy','1':'AND','2':'OR','3':'XOR','4':'Add','5':'Subtract','6':'Multiply','7':'Divide','8':'Maximum','9':'Minimum' },
      'To Alpha':  { '0':'Off','1':'Luminance','2':'Red','3':'Green','4':'Blue','5':'Cyan','6':'Magenta','7':'Yellow','8':'Hatch' },
      'To Red':    { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
      'To Green':  { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
      'To Blue':   { '0':'None','1':'Red','2':'Green','3':'Blue','4':'Alpha' },
    },
    'ErodeDilate': {
      'Filter':        { '0':'Box','1':'Bartlett','2':'Multi-box','3':'Gaussian' },
      'XFilter':       { '0':'Box','1':'Bartlett','2':'Multi-box','3':'Gaussian' },
      'YFilter':       { '0':'Box','1':'Bartlett','2':'Multi-box','3':'Gaussian' },
      'Lock X/Y':      { '0':'Unlocked','1':'Locked' },
      'Clipping Mode': { '0':'Frame','1':'Domain' },
      'Red':           { '0':'Off','1':'On' },
      'Green':         { '0':'Off','1':'On' },
      'Blue':          { '0':'Off','1':'On' },
      'Alpha':         { '0':'Off','1':'On' },
    },
    'BrightnessContrast': {
      'Alpha': { '0':'Off','1':'On' },
    },
  };

  /**
   * UI noise parameters to filter out - these are Fusion UI controls, not functional params
   */
  const PARAM_NOISE = new Set([
    'Number','NumberSize','NumberExpression',
    'NumberShader','NumberValue','NumberScale','NumberOffset',
    'NumberActive','NumberBlend','NumberZOffset','NumberZBlend',
    'NumberXOffset','NumberYOffset','NumberXScale','NumberYScale',
    'Input','Inputs','ViewInfo','OperatorInfo','Flags','Comments',
    'NameSet','CtrlWZoom','CtrlWShown',
    'MainInput1','EffectMask','Comments','NameSet','UserControls',
    // HideXX_XX are section toggles, not params
    'Hide1_1','Hide1_2','Hide2_1','Hide2_2','Hide3_1','Hide3_2',
    'Hide4_1','Hide4_2','Hide5_1','Hide5_2','Hide6_1','Hide6_2',
    'Hide7_1','Hide7_2',
  ]);

  /**
   * Parameter group patterns - categorize parameters for UI grouping
   */
  const PARAM_GROUP_PATTERNS = [
    // 3D namespaced keys
    { name:'Transform',       re:/^Transform3DOp\./i },
    { name:'Shadow',          re:/^ShadowLightInputs3D\./i },
    { name:'Material',        re:/^(MaterialInputs3D|PhongInputs3D|BlinnInputs3D|CookTorranceInputs3D|WardInputs3D|CarpaintInputs3D|GlassInputs3D|HairInputs3D|SkinInputs3D)\./i },
    { name:'Light',           re:/^LightInputs3D\./i },
    // 2D transform & geometry
    { name:'Transform',       re:/^(Center|Size$|Angle$|Aspect|Pivot|[XY]Offset|Flip[HV]|Width$|Height$|XScale|YScale|Tilt|Skew|Corner[A-Z])/i },
    { name:'Opacity / Blend', re:/^(Blend$|Alpha|Opacity|ApplyMode|FgAddSub|BgAddSub|BurnIn|Dissolve)/i },
    // Color
    { name:'Color',           re:/^(Gain|Gamma|Lift|Saturation|Hue|Brightness|Contrast|Red$|Green$|Blue$|RGB|Luma|ColorSpace|Tint|Temperature|WhiteBalance|Midtone|Highlight|Shadow$|LowR|HighR|LowG|HighG|LowB|HighB|SplineColor|ColorRange|Colorize|ColorCurve)/i },
    // Light properties (non-namespace)
    { name:'Light',           re:/^(Intensity|ConeAngle|ConeEdge|Attenuation|Decay|Ambient|Diffuse|Specular)/i },
    // Blur / sharpen / glow
    { name:'Blur / Glow',     re:/^(.+Blur|.+Glow|.+Defocus|.+Sharpen|.+Soften|Passes$|Clippings|Filter$|Deband)/i },
    // Text
    { name:'Text',            re:/^(StyledText|Font|Size|Tracking|Leading|LineSpacing|CharSpacing|LayoutStyle|HorizAlign|VertAlign|Italic|Bold|LineWidth|Text[A-Z])/i },
    // Path / spline
    { name:'Path / Spline',   re:/^(PolyLine|DrawMode|KeyFrames|Keyframe|Stroke|Displacement|Offset$)/i },
    // Camera
    { name:'Camera',          re:/^(FLength|Aperture[WH]|PlaneOfFocus|Near|Far|Stereo|PerspNearClip|PerspFarClip|AoV)/i },
    // Animation / time
    { name:'Animation',       re:/^(TimeOffset|Speed|Hold|Rate|Duration|Frame|Loop|Reverse|MotionBlur|ShutterAngle)/i },
    // Noise / texture
    { name:'Noise / Texture', re:/^(Noise|Phase|Amplitude|Frequency|SeetheRate|Seethe|Detail|Roughness|Falloff|Scale|Lacunarity|Octave|Cellular|Voronoi|Perlin|Turbulence|Warp|Ripple|Twist|Vortex)/i },
    // Particle
    { name:'Particles',       re:/^(pEmit|pRender|Life|Mass|Velocity|Direction|Region|Spread|Lock|Follow|Gravity|Bounce|pMerge)/i },
    // Mask / edge / matte
    { name:'Mask / Edge',     re:/^(Soft$|Softness|Edge|Inner|Outer|Matte|Mask|Threshold|Low$|High$|Erode|Dilate|InvertMask|ClipBlack|ClipWhite)/i },
    // Stereo / 3D utility
    { name:'3D',              re:/^(Stereo|Depth$|ZDepth|ConvergeDist|EyeSep|Parallax)/i },
  ];

  const PARAM_GROUP_ORDER = ['Transform','Opacity / Blend','Color','Shadow','Light','Material',
    'Blur / Glow','Text','Path / Spline','Camera','Animation','Noise / Texture',
    'Particles','Mask / Edge','3D','Connections','Parameters'];

  /**
   * Label display overrides - force specific labels for known parameters
   */
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

  // Namespace → short prefix to strip so dotted keys read cleanly
  const _NS_STRIP = {
    'Transform3DOp':'', 'ShadowLightInputs3D':'Shadow',
    'MaterialInputs3D':'Material', 'LightInputs3D':'Light',
    'PhongInputs3D':'Material', 'BlinnInputs3D':'Material',
    'CookTorranceInputs3D':'Material', 'WardInputs3D':'Material',
    'Stereo3D':'Stereo',
  };

  // ============================================================================
  // HELPER FUNCTIONS - Core utilities for parsing
  // ============================================================================

  /**
   * Check if a parameter key is UI noise (should be filtered out)
   * @param {string} key - Parameter name
   * @returns {boolean} - True if this is UI noise
   */
  function isNoise(key) {
    if (PARAM_NOISE.has(key)) return true;
    if (key.endsWith('.Nest')) return true;
    // UI-only suffixes from any namespace
    if (/\.(Nest|CtrlWZoom|CtrlWShown|NameSet|Comments)$/.test(key)) return true;
    return false;
  }

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
   * Extract a balanced brace block from text
   * @param {string} text - Source text
   * @param {number} startIdx - Index after opening brace
   * @returns {Object} - { content: string, endIdx: number }
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
   * Format a scalar value (boolean, number, or string)
   * @param {string} raw - Raw value
   * @returns {string} - Formatted value
   */
  function formatScalar(raw) {
    raw = raw.trim().replace(/,$/, '');
    if (raw === 'true' || raw === 'false') return raw;
    if (/^-?[\d.eE+]+$/.test(raw)) return fmtNum(raw);
    if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
    return raw;
  }

  /**
   * Format Fusion value - unwraps FuID {"..."} to just the inner string
   * @param {string} raw - Raw value
   * @returns {string} - Formatted value
   */
  function formatFusionValue(raw) {
    if (!raw) return '—';
    raw = raw.trim().replace(/,$/, '');
    const fuM = raw.match(/^FuID\s*\{\s*"([^"]+)"\s*\}/);
    if (fuM) return fuM[1];
    return formatScalar(raw);
  }

  /**
   * Format boolean parameters - converts 0/1 to On/Off for known boolean params
   * @param {string} paramName - Parameter name
   * @param {string} val - Value
   * @returns {string} - Formatted value
   */
  function fmtBoolParam(paramName, val) {
    if (val !== '0' && val !== '1') return val;
    // Params that start with "Process" are channel-enable checkboxes → On/Off
    if (/^Process\s/i.test(paramName)) return val === '1' ? 'On' : 'Off';
    // Other clearly boolean param names (not colour components)
    if (/\b(Invert|Inverted|Enabled|Active|Visible|Clip\s*Black|Clip\s*White|Only|PreDivide|Premult|Perform|MultiplyByMask)\b/i.test(paramName)) {
      return val === '1' ? 'On' : 'Off';
    }
    // "Glow Only" style checkbox names
    if (/\bOnly$/i.test(paramName)) return val === '1' ? 'On' : 'Off';
    return val;
  }

  /**
   * Format a parameter label from camelCase to readable text
   * @param {string} k - Parameter key
   * @returns {string} - Human-readable label
   */
  function fmtParamLabel(k) {
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
   * @param {Object} param - Parameter object with metadata
   * @returns {string} - Group name
   */
  function getParamGroup(key, param) {
    if (param && param.isConnection) return 'Connections';
    if (param && (param.isPath || param.isKeyframe)) {
      for (const g of PARAM_GROUP_PATTERNS) { if (g.re.test(key)) return g.name; }
      return 'Path / Spline';
    }
    for (const g of PARAM_GROUP_PATTERNS) { if (g.re.test(key)) return g.name; }
    return 'Parameters';
  }

  /**
   * Resolve enum values to human-readable labels
   * @param {string} paramLabel - Parameter display name
   * @param {string} rawVal - Raw numeric value
   * @param {string} toolType - Tool type for per-tool lookups
   * @returns {string} - Resolved value or original
   */
  function resolveEnum(paramLabel, rawVal, toolType) {
    if (!rawVal || rawVal === '—') return rawVal;
    const v = String(rawVal).trim();
    // Only resolve pure integers (or integers with trailing decimal zeros)
    if (!/^-?\d+(\.\d*)?$/.test(v)) return rawVal;
    const intStr = String(parseInt(v));

    // Per-tool lookup first
    if (toolType && FUSION_TOOL_ENUMS[toolType]) {
      const toolTable = FUSION_TOOL_ENUMS[toolType];
      for (const [key, table] of Object.entries(toolTable)) {
        if (paramLabel.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(paramLabel.toLowerCase())) {
          if (table[intStr] !== undefined) return table[intStr];
        }
      }
    }

    // Global lookup
    for (const [key, table] of Object.entries(FUSION_ENUMS)) {
      if (paramLabel.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase() === paramLabel.toLowerCase()) {
        if (table[intStr] !== undefined) return table[intStr];
      }
    }
    return rawVal;
  }

  /**
   * Format a Gradient value from Fusion format
   * @param {string} pbody - Gradient block body
   * @returns {string} - Human-readable gradient description
   */
  function fmtGradientValue(pbody) {
    const stopRe = /\[(\d+(?:\.\d+)?)\]\s*=\s*\{([^}]*)\}/g;
    const stops = [];
    let sm;
    while ((sm = stopRe.exec(pbody)) !== null) {
      const pos = parseFloat(sm[1]);
      const body = sm[2];
      const rM = body.match(/R\s*=\s*([\d.eE+\-]+)/); const r = rM ? parseFloat(rM[1]) : 0;
      const gM = body.match(/G\s*=\s*([\d.eE+\-]+)/); const g = gM ? parseFloat(gM[1]) : 0;
      const bM = body.match(/B\s*=\s*([\d.eE+\-]+)/); const b = bM ? parseFloat(bM[1]) : 0;
      const aM = body.match(/A\s*=\s*([\d.eE+\-]+)/); const a = aM ? parseFloat(aM[1]) : 1;
      const scale = (r <= 1 && g <= 1 && b <= 1) ? 255 : 1;
      const toHex = v => Math.round(v * (scale === 255 ? 255 : 1)).toString(16).padStart(2,'0');
      const hex = '#' + toHex(r) + toHex(g) + toHex(b);
      const alphaStr = a < 1 ? ` A:${Math.round(a*100)}%` : '';
      stops.push({ pos: Math.round(pos * 100), hex, alphaStr });
    }
    if (!stops.length) return `Gradient`;
    return stops.map(s => `@${s.pos}%: ${s.hex}${s.alphaStr}`).join(' | ');
  }

  // ============================================================================
  // PARSER FUNCTIONS - Core parsing logic
  // ============================================================================

  /**
   * Parse a BezierSpline block's KeyFrames into array of {frame, value}
   * @param {string} blockContent - BezierSpline block content
   * @returns {Array} - Array of {frame, value} objects
   */
  function parseBezierKeyframes(blockContent) {
    const kfIdx = blockContent.search(/\bKeyFrames\s*=\s*\{/);
    if (kfIdx === -1) return [];
    const kfOpen = blockContent.indexOf('{', kfIdx) + 1;
    const { content: kfContent } = extractBlock(blockContent, kfOpen);
    // Each entry: [frameNum] = { Value, RH = {...}, LH = {...} }
    const entryRe = /\[(\d+)\]\s*=\s*\{/g;
    const keyframes = [];
    let em;
    while ((em = entryRe.exec(kfContent)) !== null) {
      const frame = parseInt(em[1]);
      const entStart = em.index + em[0].length;
      const { content: entBody } = extractBlock(kfContent, entStart);
      const valM = entBody.match(/^\s*(-?[\d.eE+]+)/);
      const value = valM ? parseFloat(valM[1]) : NaN;
      if (!isNaN(value)) keyframes.push({ frame, value });
    }
    return keyframes;
  }

  /**
   * Parse a PolyPath block's Inputs → PolyLine → Points into [{x, y}]
   * @param {string} blockContent - PolyPath block content
   * @returns {Array} - Array of {x, y} point objects
   */
  function parsePolyPathPoints(blockContent) {
    const polyRe = /Value\s*=\s*Polyline\s*\{/;
    const polyIdx = blockContent.search(polyRe);
    if (polyIdx === -1) return [];
    const polyOpen = blockContent.indexOf('{', polyIdx) + 1;
    const { content: polyBody } = extractBlock(blockContent, polyOpen);
    const ptRe = /X\s*=\s*(-?[\d.eE+]+)\s*,\s*Y\s*=\s*(-?[\d.eE+]+)/g;
    const pts = []; let pm;
    while ((pm = ptRe.exec(polyBody)) !== null) pts.push({ x: parseFloat(pm[1]), y: parseFloat(pm[2]) });
    return pts;
  }

  /**
   * Parse an Inputs block from a Fusion tool
   * @param {string} inputsContent - Content of Inputs = { ... } block
   * @param {Object} splineMap - Map of spline name → spline data
   * @param {Object} innerValMap - Map for MacroOperator inner values (optional)
   * @returns {Object} - Parsed parameters object
   */
  function parseInputsBlock(inputsContent, splineMap, innerValMap) {
    const params = {};

    // Pre-pass: build ControlGroup → first explicit Name map
    const controlGroupNames = {};
    const cgPreRe = /(\w+)\s*=\s*InstanceInput\s*\{([^}]+)\}/g;
    let cgm;
    while ((cgm = cgPreRe.exec(inputsContent)) !== null) {
      const body = cgm[2];
      const nM = body.match(/\bName\s*=\s*"([^"]+)"/);
      const gM = body.match(/\bControlGroup\s*=\s*(\d+)/);
      if (nM && gM && !controlGroupNames[gM[1]]) {
        controlGroupNames[gM[1]] = nM[1];
      }
    }

    let i = 0;
    const len = inputsContent.length;
    while (i < len) {
      while (i < len && /\s/.test(inputsContent[i])) i++;
      if (i >= len) break;
      
      // Match both regular Input and InstanceInput entries
      const nameMatch = inputsContent.slice(i).match(/^(?:\["([^"]+)"\]|(\w+))\s*=\s*(InstanceInput|Input)\s*\{/);
      if (!nameMatch) { while (i < len && inputsContent[i] !== '\n') i++; i++; continue; }
      
      const pname = nameMatch[1] || nameMatch[2];
      const entryType = nameMatch[3]; // 'Input' or 'InstanceInput'
      const bodyStart = i + nameMatch[0].length;
      const { content: pbody, endIdx } = extractBlock(inputsContent, bodyStart);
      i = endIdx;

      // InstanceInput: these are macro-exposed parameters
      if (entryType === 'InstanceInput') {
        const nameM    = pbody.match(/\bName\s*=\s*"([^"]+)"/);
        const defaultM = pbody.match(/\bDefault\s*=\s*([^\n,}]+)/);
        const sourceM  = pbody.match(/\bSource\s*=\s*"([^"]+)"/);
        const sourceOpM= pbody.match(/\bSourceOp\s*=\s*"([^"]+)"/);
        const cgM      = pbody.match(/\bControlGroup\s*=\s*(\d+)/);

        const sourceProp = sourceM  ? sourceM[1]  : null;
        const sourceOp   = sourceOpM? sourceOpM[1]: null;
        const cgId       = cgM      ? cgM[1]      : null;
        const groupName  = cgId     ? controlGroupNames[cgId] : null;

        function srcToLabel(src) {
          if (!src) return null;
          const toCamel = s => s.replace(/([a-z])([A-Z])/g, '$1 $2')
                                 .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim();
          if (src.includes('.')) {
            return src.split('.').map(toCamel).join(' ');
          }
          return toCamel(src);
        }

        const colorSuffixM = sourceProp ? sourceProp.match(/^.+?(Red|Green|Blue|Alpha)$/) : null;
        const colorSuffix  = colorSuffixM ? colorSuffixM[1] : null;

        const PROP_ALIASES = { BlendClone: 'Blend', BlendMask: 'Blend' };
        const resolvedProp = PROP_ALIASES[sourceProp] || sourceProp;
        const ucInfo = (innerValMap && sourceOp && innerValMap[sourceOp] && innerValMap[sourceOp]._uc)
          ? (innerValMap[sourceOp]._uc[resolvedProp] || innerValMap[sourceOp]._uc[sourceProp] || null)
          : null;

        let displayName;
        if (nameM) {
          displayName = (groupName && colorSuffix && nameM[1] === groupName)
            ? `${nameM[1]} ${colorSuffix}`
            : nameM[1];
        } else if (groupName && colorSuffix) {
          displayName = `${groupName} ${colorSuffix}`;
        } else if (ucInfo && ucInfo.linksName) {
          displayName = ucInfo.linksName;
        } else {
          displayName = srcToLabel(sourceProp) || pname;
        }

        let actualVal = null;
        if (innerValMap && sourceOp && sourceProp) {
          const nodeVals = innerValMap[sourceOp];
          if (nodeVals) {
            if (nodeVals[sourceProp] !== undefined)    actualVal = String(nodeVals[sourceProp]);
            else if (resolvedProp !== sourceProp && nodeVals[resolvedProp] !== undefined)
                                                       actualVal = String(nodeVals[resolvedProp]);
          }
        }

        const rawVal = actualVal !== null ? actualVal
                     : (defaultM ? defaultM[1].trim() : null);
        let displayVal = rawVal ? formatFusionValue(rawVal) : '—';

        // Skip Fusion's UI-only LabelControl section-header toggles
        if (/^Hide\d+_\d+$/.test(sourceProp || '')) continue;

        // For *Channel params map numeric enum → readable name
        const FUSION_CHANNELS = { '1':'Red','2':'Green','3':'Blue','4':'Alpha','5':'Luminance','6':'Saturation','7':'Hue','8':'Coverage' };
        if (/Channel$/i.test(sourceProp || '') && FUSION_CHANNELS[displayVal]) {
          displayVal = FUSION_CHANNELS[displayVal];
        }

        // For Depth params map numeric enum → bit-depth label
        const FUSION_DEPTH = { '0':'Auto','1':'int8','2':'int16','3':'Half Float','4':'Float32' };
        if (/^Depth$/i.test(sourceProp || '') && FUSION_DEPTH[displayVal]) {
          displayVal = FUSION_DEPTH[displayVal];
        }

        displayVal = fmtBoolParam(displayName, displayVal);
        if (ucInfo && ucInfo.controlType === 'CheckboxControl' && (displayVal === '0' || displayVal === '1')) {
          displayVal = displayVal === '1' ? 'On' : 'Off';
        }
        displayVal = resolveEnum(displayName, displayVal, null);

        const sourceStr = sourceOp && sourceProp ? `${sourceOp}.${sourceProp}` : (sourceProp || null);

        const isConnector = !nameM && !defaultM &&
          (pname === 'MainInput1' || pname === 'EffectMask' || /^MainInput\d+$/.test(pname));
        if (!isConnector) {
          params[displayName] = { v: displayVal, isInstanceParam: true, sourceRef: sourceStr };
        }
        continue;
      }

      // Regular Input handling
      const srcM = pbody.match(/SourceOp\s*=\s*"([^"]+)"/);
      if (srcM) {
        const portM = pbody.match(/Source\s*=\s*"([^"]+)"/);
        const srcOpName = srcM[1];
        const portName = portM ? portM[1] : null;

        const splineData = splineMap && splineMap[srcOpName];
        if (splineData) {
          if (splineData.type === 'PolyPath' && splineData.points && splineData.points.length) {
            const firstPt = splineData.points[0];
            
            // Check if this PolyPath has a Displacement input connected to a BezierSpline
            let pathKeyframes = null;
            const polyPathInputs = splineMap._inputs && splineMap._inputs[srcOpName];
            if (polyPathInputs && polyPathInputs.Displacement) {
              const dispSrc = polyPathInputs.Displacement;
              const dispSpline = splineMap[dispSrc];
              if (dispSpline && dispSpline.type === 'BezierSpline' && dispSpline.keyframes) {
                pathKeyframes = dispSpline.keyframes;
              }
            }
            
            // For Center params, calculate value based on path displacement
            // Center default is 0.5, 0.5 - path coordinates are OFFSETS from this default
            // So we add 0.5 to convert path coordinates to actual Center position
            let displayValue;
            if (pname === 'Center' && pathKeyframes) {
              // Animated Center - show value at first keyframe
              const firstKf = pathKeyframes[0];
              const displacement = parseFloat(firstKf?.value ?? 0);
              // Interpolate along the path based on displacement (0-1)
              const startPt = splineData.points[0];
              const endPt = splineData.points[splineData.points.length - 1];
              // Add 0.5 offset to convert from path space to Center space
              const x = 0.5 + (startPt.x + (endPt.x - startPt.x) * displacement);
              const y = 0.5 + (startPt.y + (endPt.y - startPt.y) * displacement);
              displayValue = `${fmtNum(String(x))}, ${fmtNum(String(y))}`;
            } else {
              // Static path - use first point with 0.5 offset
              const firstPt = splineData.points[0];
              const x = 0.5 + firstPt.x;
              const y = 0.5 + firstPt.y;
              displayValue = `${fmtNum(String(x))}, ${fmtNum(String(y))}`;
            }
            
            params[pname] = {
              v: displayValue,
              isPath: true,
              pathPoints: splineData.points,
              sourceOp: srcOpName,
              displayValue: displayValue,
              ...(pathKeyframes && { 
                isAnimatedPath: true, 
                keyframes: pathKeyframes,
                splineColor: '#cc44cc'
              }),
            };
          } else if (splineData.type === 'BezierSpline' && splineData.keyframes && splineData.keyframes.length) {
            const kf0 = splineData.keyframes[0];
            params[pname] = {
              v: fmtNum(String(kf0.value)),
              isKeyframe: true,
              keyframes: splineData.keyframes,
              sourceOp: srcOpName,
              displayFrame: kf0.frame,
              splineColor: splineData.color || '#cc44cc',
            };
          } else if (splineData.type === 'PolyPath') {
            const defCenter = FUSION_PARAM_DEFAULTS[pname];
            params[pname] = {
              v: defCenter ? defCenter.v : '0.5, 0.5',
              isPath: true,
              pathPoints: [],
              sourceOp: srcOpName,
            };
          }
        } else {
          params[pname] = { v: `→ ${srcOpName}${portName ? '.' + portName : ''}`, isConnection: true, sourceOp: srcOpName };
        }
        continue;
      }
      
      const exprM = pbody.match(/Expression\s*=\s*"([^"]*)"/);
      if (exprM) { params[pname] = { v: exprM[1], isExpr: true }; continue; }

      const xy2M = pbody.match(/Value\s*=\s*\{\s*(-?[\d.eE+]+)\s*,\s*(-?[\d.eE+]+)\s*\}/);
      if (xy2M) { params[pname] = { v: `${fmtNum(xy2M[1])}, ${fmtNum(xy2M[2])}` }; continue; }

      const ptM = pbody.match(/Value\s*=\s*Point\s*\{\s*(-?[\d.eE+]+)\s*,\s*(-?[\d.eE+]+)\s*\}/);
      if (ptM) { params[pname] = { v: `${fmtNum(ptM[1])}, ${fmtNum(ptM[2])}` }; continue; }

      const polyM = pbody.match(/Value\s*=\s*Polyline\s*\{/);
      if (polyM) {
        const ptRe = /X\s*=\s*(-?[\d.eE+]+)\s*,\s*Y\s*=\s*(-?[\d.eE+]+)/g;
        const pts = []; let ptm;
        while ((ptm = ptRe.exec(pbody)) !== null) pts.push({ x: parseFloat(ptm[1]), y: parseFloat(ptm[2]) });
        const firstPt = pts[0];
        params[pname] = {
          v: firstPt ? `${fmtNum(String(firstPt.x))}, ${fmtNum(String(firstPt.y))}` : 'Polyline',
          isPath: true,
          pathPoints: pts,
        };
        continue;
      }
      
      const typedM = pbody.match(/Value\s*=\s*(\w+)\s*\{/);
      if (typedM) {
        const vtype = typedM[1];
        if (vtype === 'FuID') {
          const fuInner = pbody.match(/Value\s*=\s*FuID\s*\{\s*"([^"]+)"\s*\}/);
          params[pname] = { v: fuInner ? fuInner[1] : 'FuID' };
        } else if (vtype === 'Gradient') {
          const gradInner = pbody.match(/Value\s*=\s*Gradient\s*\{([^]*)\}/);
          const gradBody = gradInner ? gradInner[1] : pbody;
          const stopMatches = gradBody.match(/\[\d+(?:\.\d+)?\]\s*=\s*\{/g);
          const stopCount = stopMatches ? stopMatches.length : 0;
          const gradStr = fmtGradientValue(gradBody);
          params[pname] = { v: gradStr !== 'Gradient' ? gradStr : (stopCount ? `Gradient (${stopCount} stop${stopCount!==1?'s':''})` : 'Gradient') };
        } else if (vtype === 'ColorControls') {
          params[pname] = { v: 'Color wheel' };
        } else if (vtype === 'MtlStdInputs') {
          params[pname] = { v: 'Material' };
        } else {
          params[pname] = { v: `[${vtype}]` };
        }
        continue;
      }

      const valM = pbody.match(/Value\s*=\s*([^\n{},]+)/);
      if (valM) { params[pname] = { v: formatScalar(valM[1]) }; continue; }

      params[pname] = { v: '—' };
    }
    
    // Apply known defaults for any params that ended up with '—'
    Object.entries(params).forEach(([k, p]) => {
      if (!p.isKeyframe && !p.isPath && !p.isConnection && !p.isExpr) {
        const def = FUSION_PARAM_DEFAULTS[k];
        if (def && (!p.v || p.v === '—')) {
          params[k] = { ...p, v: def.v };
        }
      }
    });
    return params;
  }

  // ============================================================================
  // MAIN PARSER - Entry point for parsing .setting text
  // ============================================================================

  /**
   * Parse Fusion's .setting clipboard format (Lua table)
   * Returns array of tool objects with { toolName, toolType, params, pos, raw, instanceOfName }
   * or null if unparseable.
   * 
   * The returned array also has a special property `_allFrames` containing all
   * unique keyframe frame numbers found across all parameters.
   * 
   * @param {string} text - Raw .setting text from Fusion clipboard
   * @returns {Array|null} - Array of tool objects or null
   */
  function parseSettingText(text) {
    text = text.trim();
    const results = [];

    // Strip CustomData blocks entirely - these are NOT real nodes
    function stripCustomData(src) {
      let out = '';
      let i = 0;
      while (i < src.length) {
        const cd = src.indexOf('CustomData', i);
        if (cd === -1) { out += src.slice(i); break; }
        let eq = cd + 10;
        while (eq < src.length && /\s/.test(src[eq])) eq++;
        if (src[eq] !== '=') { out += src.slice(i, cd + 10); i = cd + 10; continue; }
        let ob = eq + 1;
        while (ob < src.length && /\s/.test(src[ob])) ob++;
        if (src[ob] !== '{') { out += src.slice(i, ob); i = ob; continue; }
        out += src.slice(i, cd);
        const { endIdx } = extractBlock(src, ob + 1);
        i = endIdx;
      }
      return out;
    }
    text = stripCustomData(text);

    // Types/names to always skip
    const SKIP_NAMES = new Set(['Tools','Inputs','ViewInfo','ordered','OperatorInfo','Flags','Points','KeyFrames']);
    const SKIP_TYPES = new Set([
      'Input','Polyline','Point','OperatorInfo',
      'InstanceInput','InstanceOutput',
      'GroupInfo',
    ]);

    // Identify the top-level Tools block only
    function getTopLevelToolsContent(src) {
      const toolsMatch = src.match(/\bTools\s*=\s*ordered\s*\(\s*\)\s*\{|\bTools\s*=\s*ordered\s*\{/);
      if (!toolsMatch) return src;
      const openBrace = src.indexOf('{', toolsMatch.index + toolsMatch[0].length - 1);
      if (openBrace === -1) return src;
      const { content } = extractBlock(src, openBrace + 1);
      return content;
    }

    // Shallow scanner - only finds direct children at depth 0
    function shallowScanTools(src) {
      const entries = [];
      let i = 0;
      while (i < src.length) {
        while (i < src.length && /\s/.test(src[i])) i++;
        if (i >= src.length) break;
        const m = src.slice(i).match(/^(\w+)\s*=\s*(\w+)\s*\{/);
        if (m) {
          const name = m[1];
          const type = m[2];
          const bodyStart = i + m[0].length;
          const { content, endIdx } = extractBlock(src, bodyStart);
          entries.push({ name, type, content });
          i = endIdx;
        } else {
          const nextBrace = src.indexOf('{', i);
          const nextNewline = src.indexOf('\n', i);
          if (nextBrace !== -1 && (nextNewline === -1 || nextBrace < nextNewline)) {
            const { endIdx } = extractBlock(src, nextBrace + 1);
            i = endIdx;
          } else {
            i = (nextNewline === -1) ? src.length : nextNewline + 1;
          }
        }
      }
      return entries;
    }

    const topLevelText = getTopLevelToolsContent(text);
    const topLevelEntries = shallowScanTools(topLevelText);

    // First pass: collect all spline/path nodes into a lookup map
    const splineMap = { _inputs: {} };
    for (const { name: tname, type: ttype, content: bc } of topLevelEntries) {
      if (SKIP_NAMES.has(tname)) continue;
      if (ttype === 'BezierSpline') {
        const kfs = parseBezierKeyframes(bc);
        const colM = bc.match(/Red\s*=\s*(\d+)[,\s]+Green\s*=\s*(\d+)[,\s]+Blue\s*=\s*(\d+)/);
        const color = colM ? `rgb(${colM[1]},${colM[2]},${colM[3]})` : '#cc44cc';
        splineMap[tname] = { type: 'BezierSpline', keyframes: kfs, color };
      } else if (ttype === 'PolyPath') {
        const pts = parsePolyPathPoints(bc);
        splineMap[tname] = { type: 'PolyPath', points: pts };
        
        // Store PolyPath inputs (especially Displacement) for animated paths
        const inputsIdx = bc.search(/\bInputs\s*=\s*\{/);
        if (inputsIdx !== -1) {
          const inputsOpen = bc.indexOf('{', inputsIdx) + 1;
          const { content: inputsContent } = extractBlock(bc, inputsOpen);
          // Match Displacement input with SourceOp - handle multiline
          const dispRe = /Displacement\s*=\s*Input\s*\{[\s\S]*?SourceOp\s*=\s*"([^"]+)"/;
          const dispM = inputsContent.match(dispRe);
          if (dispM) {
            splineMap._inputs[tname] = { Displacement: dispM[1] };
          }
        }
      }
    }

    // Second pass: parse actual tool nodes
    const seenNames = new Set();
    for (const { name: toolName, type: toolType, content: blockContent } of topLevelEntries) {
      if (SKIP_NAMES.has(toolName) || SKIP_TYPES.has(toolType)) continue;
      if (toolType === 'BezierSpline' || toolType === 'PolyPath') continue;
      if (seenNames.has(toolName)) continue;
      seenNames.add(toolName);

      // Detect tool-level SourceOp (instance marker)
      const inputsIdx = blockContent.search(/\bInputs\s*=\s*\{/);
      const topLevel = inputsIdx >= 0 ? blockContent.slice(0, inputsIdx) : blockContent;
      const toolSrcOpM = topLevel.match(/SourceOp\s*=\s*"([^"]+)"/);
      const instanceOfName = toolSrcOpM ? toolSrcOpM[1] : null;

      const params = {};
      let pos = null;
      const posM = blockContent.match(/Pos\s*=\s*\{\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\}/);
      if (posM) pos = { x: parseFloat(posM[1]), y: parseFloat(posM[2]) };

      // For MacroOperator: parse inner Tools block
      let innerValMap = null;
      if (toolType === 'MacroOperator') {
        innerValMap = {};
        const innerToolsIdx = blockContent.search(/\bTools\s*=\s*ordered\s*\(\s*\)\s*\{|\bTools\s*=\s*ordered\s*\{/);
        if (innerToolsIdx !== -1) {
          const innerOpen = blockContent.indexOf('{', innerToolsIdx) + 1;
          const { content: innerContent } = extractBlock(blockContent, innerOpen);
          const innerEntries = shallowScanTools(innerContent);

          innerEntries.forEach(({ name: iname, content: ic }) => {
            innerValMap[iname] = {};
            const iInputsIdx = ic.search(/\bInputs\s*=\s*(?:ordered\s*\(\s*\)\s*)?\{/);
            if (iInputsIdx !== -1) {
              const iOpen = ic.indexOf('{', iInputsIdx) + 1;
              const { content: iIC } = extractBlock(ic, iOpen);
              const valRe = /(?:(\w+)|\["([^"]+)"\])\s*=\s*Input\s*\{[^{}]*\bValue\s*=\s*(FuID\s*\{[^}]+\}|[^\n,{}]+)/g;
              let vm;
              while ((vm = valRe.exec(iIC)) !== null) {
                const key = vm[1] || vm[2];
                innerValMap[iname][key] = vm[3].trim().replace(/,$/, '');
              }
            }

            innerValMap[iname]._uc = {};
            const ucM = ic.match(/\bUserControls\s*=\s*ordered\s*\(\s*\)\s*\{/);
            if (ucM) {
              try {
                const { content: ucContent } = extractBlock(ic, ucM.index + ucM[0].length);
                let ui = 0;
                while (ui < ucContent.length) {
                  while (ui < ucContent.length && /\s/.test(ucContent[ui])) ui++;
                  if (ui >= ucContent.length) break;
                  const ucEntM = ucContent.slice(ui).match(/^(\w+)\s*=\s*\{/);
                  if (!ucEntM) { const nl = ucContent.indexOf('\n', ui); ui = nl === -1 ? ucContent.length : nl + 1; continue; }
                  const ucPropName = ucEntM[1];
                  const ucBodyStart = ui + ucEntM[0].length;
                  const { content: ucBody, endIdx: ucEnd } = extractBlock(ucContent, ucBodyStart);
                  ui = ucEnd;
                  const linksM   = ucBody.match(/LINKS_Name\s*=\s*"([^"]+)"/);
                  const ctrlM    = ucBody.match(/INPID_InputControl\s*=\s*"([^"]+)"/);
                  const defM     = ucBody.match(/INP_Default\s*=\s*([^\n,}]+)/);
                  const ucEntry = {
                    linksName:   linksM ? linksM[1] : null,
                    controlType: ctrlM  ? ctrlM[1]  : null,
                    defaultVal:  defM   ? defM[1].trim().replace(/,$/, '') : null,
                  };
                  innerValMap[iname]._uc[ucPropName] = ucEntry;
                  if (ucEntry.defaultVal !== null && innerValMap[iname][ucPropName] === undefined) {
                    innerValMap[iname][ucPropName] = ucEntry.defaultVal;
                  }
                }
              } catch(e) {}
            }
          });

          innerEntries.forEach(({ name: iname, content: ic }) => {
            const inputsStart = ic.search(/\bInputs\s*=/);
            const preInputs  = inputsStart >= 0 ? ic.slice(0, inputsStart) : ic;
            const masterM    = preInputs.match(/\bSourceOp\s*=\s*"([^"]+)"/);
            if (masterM && innerValMap[masterM[1]]) {
              Object.entries(innerValMap[masterM[1]]).forEach(([k, v]) => {
                if (innerValMap[iname][k] === undefined) innerValMap[iname][k] = v;
              });
            }
          });
        }
      }

      const inputsSearch = blockContent.search(/\bInputs\s*=\s*(?:ordered\s*\(\s*\)\s*)?\{/);
      const hasInputs = inputsSearch !== -1;
      if (hasInputs) {
        const inputsOpen = blockContent.indexOf('{', inputsSearch) + 1;
        const { content: inputsContent } = extractBlock(blockContent, inputsOpen);
        const parsedParams = parseInputsBlock(inputsContent, splineMap, innerValMap);

        if (instanceOfName) {
          Object.entries(parsedParams).forEach(([k, v]) => {
            v.deinstanced = true;
          });
        }
        Object.assign(params, parsedParams);
      }

      const isInstance = !!instanceOfName;
      if (!hasInputs && !isInstance) continue;

      results.push({ toolName, toolType, params, pos, raw: blockContent.trim(), instanceOfName });
    }

    // Collect frame numbers across all keyframed params
    if (results.length) {
      const allFrames = new Set();
      results.forEach(tool => {
        Object.values(tool.params).forEach(p => {
          if (p.keyframes) p.keyframes.forEach(kf => allFrames.add(kf.frame));
        });
      });
      if (allFrames.size > 0) {
        results._allFrames = Array.from(allFrames).sort((a,b) => a-b);
      }
    }

    return results.length ? results : null;
  }

  // ============================================================================
  // PUBLIC API - Exposed functions and data
  // ============================================================================

  const FusionParamParser = {
    // Main parser
    parseSettingText,
    
    // Sub-parsers (exposed for advanced use)
    parseInputsBlock,
    parseBezierKeyframes,
    parsePolyPathPoints,
    
    // Helpers
    extractBlock,
    fmtNum,
    formatScalar,
    formatFusionValue,
    fmtBoolParam,
    fmtParamLabel,
    getParamGroup,
    resolveEnum,
    fmtGradientValue,
    isNoise,
    
    // Data structures (exposed for customization)
    FUSION_PARAM_DEFAULTS,
    FUSION_ENUMS,
    FUSION_TOOL_ENUMS,
    PARAM_NOISE,
    PARAM_GROUP_PATTERNS,
    PARAM_GROUP_ORDER,
  };

  // Export based on environment
  if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (Node.js)
    module.exports = FusionParamParser;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function() { return FusionParamParser; });
  } else {
    // Browser global
    global.FusionParamParser = FusionParamParser;
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
