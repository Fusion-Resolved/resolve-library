/**
 * Lua Analyzer Module
 * Detects custom functions, analyzes Fusion Lua structure
 * Identifies user-defined code vs built-in Fusion functions
 */

(function() {
  'use strict';

  // Fusion built-in tool whitelist (expandable)
  const FUSION_BUILTINS = new Set([
    // Image processing
    'Blur', 'Sharpen', 'ErodeDilate', 'RankFilter', 'Convolve', 'VectorMotionBlur',
    'MotionBlur', 'DirectionalBlur', 'RadialBlur', 'ZoomBlur', 'VariableBlur',
    'Defocus', 'DepthBlur', 'Bokeh', 'OpticalFlux', 'VectorBlur', 'ZBlur',
    
    // Color
    'BrightnessContrast', 'ColorCorrector', 'ColorCurves', 'ColorMatrix', 
    'HueCurves', 'SaturationCurves', 'ColorSpace', 'Color', 'Gamut',
    'WhiteBalance', 'Gamma', 'LUT', 'CineonLog', 'DepthColor',
    
    // Merge/Composite
    'Merge', 'ChannelBooleans', 'MatteControl', 'Solid', 'Background',
    'FastNoise', 'Noise', 'Gradient', 'Ramp', 'Grid', 'Dot',
    
    // Transform
    'Transform', 'Affine', 'Crop', 'Resize', 'Scale', 'Rotate', 'Translate',
    'CornerPin', 'Perspective', 'LensDistortion', 'DVE', 'Flip',
    
    // Mask/Matte
    'Rectangle', 'Ellipse', 'Polygon', 'B-Spline', 'Bezier', 'Wand', 'MagicWand',
    'Matte', 'LumaKey', 'ChromaKey', 'DeltaKeyer', 'Keyer', 'UltraKeyer',
    'Screen', 'Glow', 'SoftGlow', 'Highlight', 'Shadow', 'ColorSuppress',
    
    // Text
    'TextPlus', 'Text3D', 'Text', 'Character', 'Paragraph',
    
    // 3D
    'Merge3D', 'Render3D', 'ImagePlane3D', 'Cube', 'Sphere', 'Shape3D',
    'Camera3D', 'Light3D', 'SpotLight', 'PointLight', 'DirectionalLight',
    'AmbientLight', 'VolumeFog', 'Fog', 'Renderer3D', 'OpenGLRender',
    'FBXMesh3D', 'AlembicMesh3D', 'PointCloud3D', 'Duplicate3D',
    'Bender3D', 'Displace3D', 'WireFrame', 'ReplaceMaterial',
    'CustomVertex3D', 'UVMap3D', 'Texture2D', 'Replicate3D',
    
    // Particle
    'pEmitter', 'pRender', 'pKill', 'pSpawn', 'pBounce', 'pAvoid',
    'pChangeStyle', 'pFlock', 'pFollow', 'pGyro', 'pTurbulence',
    'pVortex', 'pWind', 'pGravity', 'pFriction', 'pTarget',
    
    // Tracking
    'PlanarTracker', 'CameraTracker', 'PointTracker', 'Tracker',
    'Stabilize', 'CornerPositioner',
    
    // Deep
    'DeepColor', 'DeepMerge', 'DeepMask', 'DeepCrop', 'DeepRecolor',
    
    // Stereo
    'Stereo', 'Anaglyph', 'Interlace', 'SideBySide',
    
    // Other
    'TimeStretcher', 'TimeSpeed', 'Freeze', 'FrameBlend',
    'Temporal', 'OpticalFlow', 'Oflow', 'Kronos', 'MotionVectors',
    'VectorGenerator', 'MotionBlur', 'Shutter', 'FrameAverage',
    'Deinterlace', 'Interlace', 'Field', 'Dilate', 'Erode'
  ]);

  // Fusion built-in expression functions
  const FUSION_EXPRESSION_FUNCS = new Set([
    'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'cosh',
    'deg', 'exp', 'floor', 'log', 'log10', 'max', 'min', 'mod',
    'pow', 'rad', 'random', 'round', 'sin', 'sinh', 'sqrt', 'tan', 'tanh',
    'clamp', 'lerp', 'noise', 'cellnoise', 'perlin', ' turbulence',
    'floor', 'ceil', 'fract', 'sign', 'step', 'smoothstep',
    'getr', 'getg', 'getb', 'geta', 'getluma', 'getsat', 'gethue',
    'rgb', 'hsl', 'hsv', 'yuv', 'xyz', 'lab',
    'time', 'frames', 'fps', 'compwidth', 'compheight',
    'width', 'height', 'x', 'y', 'p', 'px', 'py', 'pt',
    'norm', 'normtan', 'normx', 'normy',
    'get', 'getlut1', 'getlut2', 'getlut3', 'getlut4',
    'point', 'vector', 'matrix', 'angle', 'dist', 'dot', 'cross',
    'if', 'then', 'else', 'while', 'for', 'do', 'end',
    'and', 'or', 'not', 'nil', 'true', 'false',
    'self', 'pi', 'e'
  ]);

  /**
   * Analyze Lua code and detect custom functions
   * @param {string} luaCode - Lua code to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  function analyzeLua(luaCode, options = {}) {
    if (!luaCode || typeof luaCode !== 'string') {
      return { error: 'No code provided' };
    }

    const results = {
      // Detected custom functions
      customFunctions: [],
      
      // Built-in usage stats
      builtInUsage: {},
      
      // Expression analysis (for CustomTool, etc.)
      expressions: [],
      
      // Tool groups/macros
      toolGroups: [],
      
      // Overall stats
      stats: {
        totalLines: 0,
        totalTools: 0,
        customToolCount: 0,
        animatedParams: 0
      }
    };

    // Parse the code (basic regex-based for now)
    const lines = luaCode.split('\n');
    results.stats.totalLines = lines.length;

    // Detect tool instances
    const toolMatches = luaCode.matchAll(/(\w+)\s*=\s*(\w+)\s*\{[^}]*\}/g);
    for (const match of toolMatches) {
      const [, instanceName, toolType] = match;
      results.stats.totalTools++;

      if (FUSION_BUILTINS.has(toolType)) {
        results.builtInUsage[toolType] = (results.builtInUsage[toolType] || 0) + 1;
      } else {
        // Potentially custom tool type
        results.customFunctions.push({
          type: 'custom_tool',
          name: toolType,
          instance: instanceName,
          line: getLineNumber(luaCode, match.index)
        });
      }
    }

    // Detect CustomTool expressions
    const customToolRegex = /CustomTool\s*\{[\s\S]*?Tools\s*=\s*\{[\s\S]*?\}\s*[\s\S]*?\}/g;
    let customToolMatch;
    while ((customToolMatch = customToolRegex.exec(luaCode)) !== null) {
      results.stats.customToolCount++;
      
      const customToolContent = customToolMatch[0];
      
      // Extract expressions from CustomTool
      const exprMatches = customToolContent.matchAll(/(\w+)\s*=\s*"([^"]*)"/g);
      for (const exprMatch of exprMatches) {
        const [, exprName, exprCode] = exprMatch;
        
        if (isExpressionCustom(exprCode)) {
          results.expressions.push({
            tool: 'CustomTool',
            param: exprName,
            code: exprCode,
            isCustom: true,
            line: getLineNumber(luaCode, customToolMatch.index)
          });
        }
      }
    }

    // Detect macros/groups
    const macroRegex = /Macro\s*\{[\s\S]*?\}/g;
    let macroMatch;
    while ((macroMatch = macroRegex.exec(luaCode)) !== null) {
      const macroContent = macroMatch[0];
      const nameMatch = macroContent.match(/Name\s*=\s*"([^"]+)"/);
      
      results.toolGroups.push({
        type: 'macro',
        name: nameMatch ? nameMatch[1] : 'unnamed',
        content: macroContent,
        line: getLineNumber(luaCode, macroMatch.index)
      });
    }

    // Detect group tools
    const groupRegex = /Group\s*\{[\s\S]*?\}/g;
    let groupMatch;
    while ((groupMatch = groupRegex.exec(luaCode)) !== null) {
      const groupContent = groupMatch[0];
      const nameMatch = groupContent.match(/Name\s*=\s*"([^"]+)"/);
      
      results.toolGroups.push({
        type: 'group',
        name: nameMatch ? nameMatch[1] : 'unnamed',
        content: groupContent,
        line: getLineNumber(luaCode, groupMatch.index)
      });
    }

    // Detect Lua function definitions
    const funcRegex = /function\s+(\w+)\s*\([^)]*\)/g;
    let funcMatch;
    while ((funcMatch = funcRegex.exec(luaCode)) !== null) {
      const [, funcName] = funcMatch;
      
      results.customFunctions.push({
        type: 'function_definition',
        name: funcName,
        line: getLineNumber(luaCode, funcMatch.index)
      });
    }

    // Detect script blocks
    const scriptRegex = /Script\s*=\s*\{[\s\S]*?\}/g;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(luaCode)) !== null) {
      results.customFunctions.push({
        type: 'script_block',
        content: scriptMatch[0].substring(0, 200) + '...',
        line: getLineNumber(luaCode, scriptMatch.index)
      });
    }

    // Remove duplicates from customFunctions
    results.customFunctions = deduplicateBy(results.customFunctions, 'name');

    return results;
  }

  /**
   * Check if an expression contains custom code
   * @param {string} expr - Expression string
   * @returns {boolean} True if custom
   */
  function isExpressionCustom(expr) {
    if (!expr || expr.trim() === '') return false;
    
    // Simple expressions are not custom
    if (/^\d+(\.\d+)?$/.test(expr)) return false; // Just a number
    if (/^\w+$/.test(expr) && FUSION_EXPRESSION_FUNCS.has(expr)) return false; // Built-in
    
    // Complex expressions with operations are likely custom
    const customIndicators = [
      /[+\-*/<>=%]/,        // Operators
      /\b(if|then|else)\b/,   // Conditionals
      /\b(for|while)\b/,     // Loops
      /\bfunction\b/,        // Functions
      /\blocal\b/,           // Local vars
      /[()]/                 // Function calls
    ];
    
    return customIndicators.some(pattern => pattern.test(expr));
  }

  /**
   * Get line number for a position in text
   * @param {string} text - Full text
   * @param {number} index - Character index
   * @returns {number} Line number (1-indexed)
   */
  function getLineNumber(text, index) {
    return text.substring(0, index).split('\n').length;
  }

  /**
   * Remove duplicate objects by key
   * @param {Array} arr - Array of objects
   * @param {string} key - Key to deduplicate by
   * @returns {Array} Deduplicated array
   */
  function deduplicateBy(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
      const val = item[key];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }

  /**
   * Analyze a node's parameters for animation
   * @param {Object} node - Node with params
   * @returns {Object} Animation analysis
   */
  function analyzeNodeAnimation(node) {
    const analysis = {
      hasAnimation: false,
      animatedParams: [],
      totalKeyframes: 0,
      frameRange: { start: Infinity, end: -Infinity }
    };

    if (!node.params) return analysis;

    Object.entries(node.params).forEach(([key, param]) => {
      if (param.keyframes && param.keyframes.length > 0) {
        analysis.hasAnimation = true;
        analysis.animatedParams.push({
          name: key,
          keyframeCount: param.keyframes.length,
          frameRange: {
            start: param.keyframes[0].frame,
            end: param.keyframes[param.keyframes.length - 1].frame
          }
        });
        
        analysis.totalKeyframes += param.keyframes.length;
        
        param.keyframes.forEach(kf => {
          analysis.frameRange.start = Math.min(analysis.frameRange.start, kf.frame);
          analysis.frameRange.end = Math.max(analysis.frameRange.end, kf.frame);
        });
      }
    });

    return analysis;
  }

  /**
   * Generate a summary report of the analysis
   * @param {Object} analysis - Analysis results
   * @returns {string} Human-readable report
   */
  function generateReport(analysis) {
    if (analysis.error) return analysis.error;

    let report = '=== Fusion Composition Analysis ===\n\n';
    
    report += `Lines of code: ${analysis.stats.totalLines}\n`;
    report += `Total tools: ${analysis.stats.totalTools}\n`;
    report += `Custom tools: ${analysis.stats.customToolCount}\n\n`;

    if (analysis.customFunctions.length > 0) {
      report += 'Custom Functions/Elements:\n';
      analysis.customFunctions.forEach(cf => {
        report += `  - ${cf.type}: ${cf.name || 'unnamed'} (line ${cf.line})\n`;
      });
      report += '\n';
    }

    if (analysis.expressions.length > 0) {
      report += `Custom expressions: ${analysis.expressions.length}\n`;
      analysis.expressions.slice(0, 5).forEach(expr => {
        report += `  - ${expr.tool}.${expr.param}: ${expr.code.substring(0, 40)}...\n`;
      });
      report += '\n';
    }

    if (Object.keys(analysis.builtInUsage).length > 0) {
      report += 'Built-in tool usage:\n';
      const sorted = Object.entries(analysis.builtInUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      sorted.forEach(([tool, count]) => {
        report += `  - ${tool}: ${count}\n`;
      });
    }

    return report;
  }

  // Expose globally
  window.LuaAnalyzer = {
    analyze: analyzeLua,
    analyzeNodeAnimation,
    generateReport,
    isExpressionCustom,
    BUILTINS: FUSION_BUILTINS,
    EXPRESSION_FUNCS: FUSION_EXPRESSION_FUNCS
  };

})();
