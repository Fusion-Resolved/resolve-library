/**
 * Spline Evaluator Module
 * Core functions for evaluating bezier splines at any frame
 * Works with Fusion-style keyframe data
 */

(function() {
  'use strict';

  // Make available globally
  window.SplineEvaluator = {
    evaluateSpline,
    evaluateNodeAtFrame,
    findSurroundingKeyframes,
    interpolateLinear,
    interpolateBezier,
    getFrameRange
  };

  /**
   * Evaluate a bezier spline at a specific frame
   * @param {Array} keyframes - Array of {frame, value, rh, lh, interpolation}
   * @param {number} frame - Frame to evaluate at
   * @returns {number} Interpolated value
   */
  function evaluateSpline(keyframes, frame) {
    if (!keyframes || keyframes.length === 0) {
      return 0;
    }

    // Sort keyframes by frame (defensive)
    const sorted = keyframes.slice().sort((a, b) => a.frame - b.frame);

    // Handle edge cases
    if (frame <= sorted[0].frame) {
      return sorted[0].value;
    }
    if (frame >= sorted[sorted.length - 1].frame) {
      return sorted[sorted.length - 1].value;
    }

    // Find surrounding keyframes
    const { prev, next } = findSurroundingKeyframes(sorted, frame);
    if (!prev || !next) {
      return prev ? prev.value : next ? next.value : 0;
    }

    // Check for hold interpolation
    if (prev.hold || prev.interpolation === 'hold') {
      return prev.value;
    }

    // Calculate interpolation factor (0 to 1)
    const duration = next.frame - prev.frame;
    if (duration === 0) {
      return prev.value;
    }
    
    const t = (frame - prev.frame) / duration;

    // Bezier interpolation with handles
    if (prev.rh || next.lh) {
      return interpolateBezier(
        prev.value,
        next.value,
        prev.rh ? prev.rh.y : prev.value,
        next.lh ? next.lh.y : next.value,
        t
      );
    }

    // Linear interpolation fallback
    return interpolateLinear(prev.value, next.value, t);
  }

  /**
   * Find the keyframes surrounding a given frame
   * @param {Array} sortedKeyframes - Frame-sorted keyframes
   * @param {number} frame - Target frame
   * @returns {Object} { prev, next } keyframes
   */
  function findSurroundingKeyframes(sortedKeyframes, frame) {
    let prev = null;
    let next = null;

    for (let i = 0; i < sortedKeyframes.length; i++) {
      const kf = sortedKeyframes[i];
      if (kf.frame <= frame) {
        prev = kf;
      }
      if (kf.frame >= frame && !next) {
        next = kf;
        break;
      }
    }

    return { prev, next };
  }

  /**
   * Linear interpolation between two values
   * @param {number} a - Start value
   * @param {number} b - End value  
   * @param {number} t - Factor (0 to 1)
   * @returns {number} Interpolated value
   */
  function interpolateLinear(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Cubic bezier interpolation
   * @param {number} p0 - Start value
   * @param {number} p1 - End value
   * @param {number} cp0 - Control point 1 (RH handle)
   * @param {number} cp1 - Control point 2 (LH handle)
   * @param {number} t - Factor (0 to 1)
   * @returns {number} Interpolated value
   */
  function interpolateBezier(p0, p1, cp0, cp1, t) {
    // Cubic bezier formula
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return mt3 * p0 + 3 * mt2 * t * cp0 + 3 * mt * t2 * cp1 + t3 * p1;
  }

  /**
   * Evaluate all parameters for a node at a specific frame
   * Handles Fusion's nested parameter structure: node.params[tableKey].params[paramKey]
   * @param {Object} node - Node with params
   * @param {number} frame - Frame to evaluate
   * @returns {Object} Map of param names to { value, raw, animated, keyframeIndex, table }
   */
  function evaluateNodeAtFrame(node, frame) {
    const result = {};
    const params = node.params || {};

    // Handle nested structure: params[tableKey] = { table: "Transform", params: { ... } }
    Object.entries(params).forEach(([tableKey, tableGroup]) => {
      // Skip metadata keys at top level
      if (tableKey.endsWith('_SourceOp') || tableKey.startsWith('_')) {
        return;
      }

      // Check if this is a nested table structure
      if (tableGroup && typeof tableGroup === 'object' && tableGroup.params) {
        const tableName = tableGroup.table || 'Parameters';
        const nestedParams = tableGroup.params;

        Object.entries(nestedParams).forEach(([key, param]) => {
          if (key.endsWith('_SourceOp') || key.startsWith('_')) {
            return;
          }

          const hasKeyframes = param.keyframes && param.keyframes.length > 0;
          
          if (hasKeyframes) {
            // Evaluate the animated parameter
            const value = evaluateSpline(param.keyframes, frame);
            const { prev } = findSurroundingKeyframes(param.keyframes, frame);
            
            result[key] = {
              value: value,
              raw: value.toFixed(3),
              animated: true,
              keyframeIndex: prev ? param.keyframes.indexOf(prev) : -1,
              frame: frame,
              table: tableName,
              sourceOp: param.sourceOp || null,
              isConnected: false
            };
          } else {
            // Static parameter - return stored value
            const val = param.v !== undefined ? param.v : param.value;
            const isConnected = val === '—' && param.sourceOp;
            
            result[key] = {
              value: isConnected ? `← ${param.sourceOp}` : val,
              raw: param.raw || String(val),
              animated: false,
              keyframeIndex: -1,
              frame: frame,
              table: tableName,
              sourceOp: param.sourceOp || null,
              isConnected: isConnected
            };
          }
        });
      } else {
        // Handle flat structure (fallback for backward compatibility)
        const param = tableGroup;
        if (tableKey.endsWith('_SourceOp') || tableKey.startsWith('_')) {
          return;
        }

        const hasKeyframes = param.keyframes && param.keyframes.length > 0;
        
        if (hasKeyframes) {
          const value = evaluateSpline(param.keyframes, frame);
          const { prev } = findSurroundingKeyframes(param.keyframes, frame);
          
          result[tableKey] = {
            value: value,
            raw: value.toFixed(3),
            animated: true,
            keyframeIndex: prev ? param.keyframes.indexOf(prev) : -1,
            frame: frame,
            table: 'Parameters',
            sourceOp: param.sourceOp || null,
            isConnected: false
          };
        } else {
          const val = param.v !== undefined ? param.v : param.value;
          const isConnected = val === '—' && param.sourceOp;
          
          result[tableKey] = {
            value: isConnected ? `← ${param.sourceOp}` : val,
            raw: param.raw || String(val),
            animated: false,
            keyframeIndex: -1,
            frame: frame,
            table: 'Parameters',
            sourceOp: param.sourceOp || null,
            isConnected: isConnected
          };
        }
      }
    });

    return result;
  }

  /**
   * Get the frame range for a node's animation
   * Handles nested parameter structure
   * @param {Object} node - Node with params
   * @returns {Object} { start, end } frame range
   */
  function getFrameRange(node) {
    let minFrame = Infinity;
    let maxFrame = -Infinity;
    let hasAnimation = false;

    const params = node.params || {};
    
    // Handle nested structure: params[tableKey] = { table: "Transform", params: { ... } }
    Object.values(params).forEach(tableGroup => {
      if (tableGroup && typeof tableGroup === 'object' && tableGroup.params) {
        // Nested structure
        const nestedParams = tableGroup.params;
        Object.values(nestedParams).forEach(param => {
          if (param.keyframes && param.keyframes.length > 0) {
            hasAnimation = true;
            param.keyframes.forEach(kf => {
              minFrame = Math.min(minFrame, kf.frame);
              maxFrame = Math.max(maxFrame, kf.frame);
            });
          }
        });
      } else {
        // Flat structure fallback
        const param = tableGroup;
        if (param.keyframes && param.keyframes.length > 0) {
          hasAnimation = true;
          param.keyframes.forEach(kf => {
            minFrame = Math.min(minFrame, kf.frame);
            maxFrame = Math.max(maxFrame, kf.frame);
          });
        }
      }
    });

    if (!hasAnimation) {
      return { start: 0, end: 100, hasAnimation: false };
    }

    return { 
      start: Math.floor(minFrame), 
      end: Math.ceil(maxFrame),
      hasAnimation: true 
    };
  }

  /**
   * Get frame range across multiple nodes
   * @param {Array} nodes - Array of nodes
   * @returns {Object} { start, end } combined frame range
   */
  function getGlobalFrameRange(nodes) {
    let minFrame = Infinity;
    let maxFrame = -Infinity;
    let hasAnimation = false;

    nodes.forEach(node => {
      const range = getFrameRange(node);
      if (range.hasAnimation) {
        hasAnimation = true;
        minFrame = Math.min(minFrame, range.start);
        maxFrame = Math.max(maxFrame, range.end);
      }
    });

    if (!hasAnimation) {
      return { start: 0, end: 100, hasAnimation: false };
    }

    return { 
      start: Math.floor(minFrame), 
      end: Math.ceil(maxFrame),
      hasAnimation: true 
    };
  }

  // Expose additional utility
  window.SplineEvaluator.getGlobalFrameRange = getGlobalFrameRange;

})();
