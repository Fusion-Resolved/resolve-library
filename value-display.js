/**
 * Value Display Component
 * Shows parameter values at the current frame with real-time updates
 * Displays mini splines for animated parameters
 */

(function() {
  'use strict';

  const valueStyles = `
    .value-display-container {
      font-family: var(--font-mono, 'DM Mono', monospace);
      font-size: 11px;
    }
    .value-display-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(108, 123, 255, 0.2);
      background: rgba(108, 123, 255, 0.05);
      border-radius: 6px 6px 0 0;
    }
    .value-display-title {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--violet-light, #a0aeff);
      letter-spacing: 0.05em;
    }
    .value-display-frame {
      font-size: 12px;
      color: #fff;
      font-weight: 600;
    }
    .value-params-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .value-param-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s;
    }
    .value-param-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .value-param-row.animated {
      border-left: 2px solid var(--violet, #6c7bff);
    }
    .value-param-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .value-param-name {
      color: rgba(255, 255, 255, 0.7);
    }
    .value-param-spline {
      width: 80px;
      height: 20px;
      opacity: 0.6;
    }
    .value-param-value {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .value-number {
      font-family: var(--font-mono, 'DM Mono', monospace);
      color: #fff;
      font-weight: 500;
      font-size: 11px;
      min-width: 50px;
      text-align: right;
    }
    .value-anim-indicator {
      color: var(--violet, #6c7bff);
      font-size: 8px;
    }
    .value-static-badge {
      font-size: 8px;
      color: rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.08);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .value-empty {
      padding: 20px;
      text-align: center;
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }
    .value-section {
      padding: 4px 12px;
      font-size: 9px;
      color: var(--violet, #6c7bff);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(108, 123, 255, 0.05);
      border-bottom: 1px solid rgba(108, 123, 255, 0.1);
    }
  `;

  // Inject styles
  if (!document.getElementById('value-display-styles')) {
    const style = document.createElement('style');
    style.id = 'value-display-styles';
    style.textContent = valueStyles;
    document.head.appendChild(style);
  }

  /**
   * Parameter Value Display Component
   */
  class ParameterValueDisplay {
    constructor(container, options = {}) {
      this.container = container;
      this.options = {
        node: null,
        currentFrame: 0,
        onParamClick: null,
        ...options
      };
      
      this.init();
    }

    init() {
      this.createDOM();
      if (this.options.node) {
        this.update();
      }
    }

    createDOM() {
      this.container.innerHTML = '';
      this.container.className = 'value-display-container';

      // Header with frame indicator
      this.header = document.createElement('div');
      this.header.className = 'value-display-header';
      this.header.innerHTML = `
        <span class="value-display-title">Parameter Values</span>
        <span class="value-display-frame">Frame ${this.options.currentFrame}</span>
      `;
      this.container.appendChild(this.header);

      // Parameters list
      this.list = document.createElement('div');
      this.list.className = 'value-params-list';
      this.container.appendChild(this.list);
    }

    setNode(node) {
      this.options.node = node;
      this.update();
    }

    setFrame(frame) {
      if (frame !== this.options.currentFrame) {
        this.options.currentFrame = frame;
        this.update();
      }
    }

    update() {
      console.log('[ValueDisplay] update() called', this.options.node?.id, 'frame:', this.options.currentFrame);
      
      if (!this.options.node) {
        console.log('[ValueDisplay] No node, showing empty');
        this.showEmpty('No node selected');
        return;
      }

      const { node } = this.options;
      const frame = this.options.currentFrame;

      // Update frame display
      this.header.querySelector('.value-display-frame').textContent = `Frame ${frame}`;

      // Clear list
      this.list.innerHTML = '';

      // Get evaluated values
      const values = window.SplineEvaluator 
        ? window.SplineEvaluator.evaluateNodeAtFrame(node, frame)
        : this.getRawValues(node);
      
      console.log('[ValueDisplay] Values count:', Object.keys(values).length);

      // Group by table
      const grouped = this.groupByTable(values, node);
      console.log('[ValueDisplay] Groups:', Object.keys(grouped));

      // Render groups
      Object.entries(grouped).forEach(([tableName, params]) => {
        if (Object.keys(grouped).length > 1) {
          const section = document.createElement('div');
          section.className = 'value-section';
          section.textContent = tableName;
          this.list.appendChild(section);
        }

        params.forEach(([key, value]) => {
          const row = this.createParamRow(key, value);
          this.list.appendChild(row);
        });
      });

      if (this.list.children.length === 0) {
        console.log('[ValueDisplay] No children, showing empty');
        this.showEmpty('No parameters available');
      } else {
        console.log('[ValueDisplay] Rendered', this.list.children.length, 'items');
      }
    }

    getRawValues(node) {
      // Fallback if SplineEvaluator not available
      const values = {};
      const params = node.params || {};
      
      console.log('[ValueDisplay] getRawValues, params:', Object.keys(params));
      
      Object.entries(params).forEach(([tableKey, tableGroup]) => {
        console.log('[ValueDisplay] Processing tableKey:', tableKey, 'type:', typeof tableGroup, 'hasParams:', tableGroup?.params ? 'yes' : 'no');
        
        // Handle nested structure: { "0": { table: "Transform", params: { ... } } }
        if (tableGroup && typeof tableGroup === 'object' && tableGroup.params && Object.keys(tableGroup.params).length > 0) {
          const tableName = tableGroup.table || 'Parameters';
          const nestedParams = tableGroup.params;
          
          console.log('[ValueDisplay] Nested structure detected, table:', tableName, 'nested keys:', Object.keys(nestedParams));
          
          Object.entries(nestedParams).forEach(([key, param]) => {
            if (key.endsWith('_SourceOp') || key.startsWith('_')) return;
            
            const val = param?.v !== undefined ? param.v : param?.value;
            console.log('[ValueDisplay] Param', key, 'in', tableName, ':', val);
            
            values[key] = {
              value: val,
              raw: param?.raw || String(val),
              animated: !!(param?.keyframes && param.keyframes.length > 0),
              table: tableName,
              frame: this.options.currentFrame
            };
          });
        } else {
          // Handle flat structure (fallback) - but only if tableGroup looks like a param
          if (tableKey.endsWith('_SourceOp') || tableKey.startsWith('_')) return;
          
          // Skip if tableGroup is clearly a table wrapper (has 'table' property but no 'params')
          if (tableGroup && typeof tableGroup === 'object' && tableGroup.table && !tableGroup.params) {
            console.log('[ValueDisplay] Skipping table wrapper without params:', tableKey);
            return;
          }
          
          const val = tableGroup?.v !== undefined ? tableGroup.v : tableGroup?.value;
          console.log('[ValueDisplay] Flat param', tableKey, ':', val);
          
          // Skip if no valid value
          if (val === undefined || val === null) {
            console.log('[ValueDisplay] Skipping', tableKey, '- no value');
            return;
          }
          
          values[tableKey] = {
            value: val,
            raw: tableGroup?.raw || String(val),
            animated: !!(tableGroup?.keyframes && tableGroup.keyframes.length > 0),
            table: 'Parameters',
            frame: this.options.currentFrame
          };
        }
      });
      
      console.log('[ValueDisplay] Extracted values:', Object.keys(values));
      return values;
    }

    groupByTable(values, node) {
      const groups = {};

      Object.entries(values).forEach(([key, value]) => {
        // Use table property from value (set by getRawValues)
        const table = value.table || 'Parameters';
        
        if (!groups[table]) groups[table] = [];
        groups[table].push([key, value]);
      });

      return groups;
    }

    createParamRow(key, value) {
      const row = document.createElement('div');
      row.className = 'value-param-row' + (value.animated ? ' animated' : '');

      const paramInfo = document.createElement('div');
      paramInfo.className = 'value-param-info';

      const name = document.createElement('div');
      name.className = 'value-param-name';
      name.textContent = key;
      paramInfo.appendChild(name);

      // Find the parameter's keyframes by traversing nested structure
      const paramWithKeyframes = this.findParamWithKeyframes(key);

      // Mini spline for animated params
      if (value.animated && paramWithKeyframes?.keyframes) {
        const spline = document.createElement('div');
        spline.className = 'value-param-spline';
        paramInfo.appendChild(spline);
        
        // Render mini spline after DOM insertion
        setTimeout(() => {
          this.renderMiniSpline(spline, paramWithKeyframes.keyframes, value.frame);
        }, 0);
      }

      const valueContainer = document.createElement('div');
      valueContainer.className = 'value-param-value';

      const number = document.createElement('span');
      number.className = 'value-number';
      
      // Format value
      let displayValue;
      if (value.value === undefined || value.value === null) {
        displayValue = value.raw || 'N/A';
      } else if (typeof value.value === 'number') {
        displayValue = value.value.toFixed(3);
      } else {
        displayValue = String(value.value);
      }
      number.textContent = displayValue;
      valueContainer.appendChild(number);

      if (value.animated) {
        const anim = document.createElement('span');
        anim.className = 'value-anim-indicator';
        anim.textContent = '◆';
        anim.title = 'Animated';
        valueContainer.appendChild(anim);
      } else {
        const badge = document.createElement('span');
        badge.className = 'value-static-badge';
        badge.textContent = 'static';
        valueContainer.appendChild(badge);
      }

      row.appendChild(paramInfo);
      row.appendChild(valueContainer);

      // Click handler
      if (this.options.onParamClick && paramWithKeyframes) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          this.options.onParamClick(key, paramWithKeyframes);
        });
      }

      return row;
    }

    /**
     * Find a parameter with its keyframes by traversing nested structure
     * @param {string} key - Parameter name to find
     * @returns {Object|null} The parameter object with keyframes, or null
     */
    findParamWithKeyframes(key) {
      const node = this.options.node;
      if (!node || !node.params) return null;

      // Traverse nested structure: node.params[tableKey].params[paramKey]
      for (const tableKey of Object.keys(node.params)) {
        const tableGroup = node.params[tableKey];
        if (tableGroup && typeof tableGroup === 'object' && tableGroup.params) {
          if (tableGroup.params[key]) {
            return tableGroup.params[key];
          }
        }
      }

      // Fallback: flat structure
      return node.params[key] || null;
    }

    renderMiniSpline(container, keyframes, currentFrame) {
      if (!container || !keyframes || keyframes.length < 2) return;

      // Clear existing
      container.innerHTML = '';

      const canvas = document.createElement('canvas');
      const rect = container.getBoundingClientRect();
      canvas.width = 80;
      canvas.height = 20;
      canvas.style.width = '80px';
      canvas.style.height = '20px';
      
      container.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 80 * dpr;
      canvas.height = 20 * dpr;
      ctx.scale(dpr, dpr);

      // Calculate ranges
      const minF = keyframes[0].frame;
      const maxF = keyframes[keyframes.length - 1].frame;
      const frameRange = maxF - minF || 1;

      let minV = Infinity, maxV = -Infinity;
      keyframes.forEach(kf => {
        minV = Math.min(minV, kf.value);
        maxV = Math.max(maxV, kf.value);
      });
      const valueRange = maxV - minV || 0.1;

      // Transform functions
      const tx = f => ((f - minF) / frameRange) * 80;
      const ty = v => 20 - ((v - minV) / valueRange) * 20;

      // Draw spline
      ctx.strokeStyle = 'rgba(108, 123, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i < keyframes.length - 1; i++) {
        const k0 = keyframes[i];
        const k1 = keyframes[i + 1];
        const x0 = tx(k0.frame);
        const y0 = ty(k0.value);
        const x3 = tx(k1.frame);
        const y3 = ty(k1.value);

        if (i === 0) ctx.moveTo(x0, y0);

        if (k0.rh || k1.lh) {
          // Bezier with handles
          const cp1x = k0.rh ? tx(k0.rh.x) : x0 + (x3 - x0) / 3;
          const cp1y = k0.rh ? ty(k0.rh.y) : y0;
          const cp2x = k1.lh ? tx(k1.lh.x) : x3 - (x3 - x0) / 3;
          const cp2y = k1.lh ? ty(k1.lh.y) : y3;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
        } else {
          ctx.lineTo(x3, y3);
        }
      }
      ctx.stroke();

      // Draw playhead position
      if (currentFrame >= minF && currentFrame <= maxF) {
        const px = tx(currentFrame);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, 20);
        ctx.stroke();

        // Dot at value position
        const pv = window.SplineEvaluator?.evaluateSpline(keyframes, currentFrame);
        if (pv !== undefined) {
          const py = ty(pv);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw keyframe markers
      ctx.fillStyle = 'var(--violet, #6c7bff)';
      keyframes.forEach(kf => {
        const px = tx(kf.frame);
        ctx.beginPath();
        ctx.arc(px, 10, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    showEmpty(message) {
      this.list.innerHTML = `<div class="value-empty">${message}</div>`;
    }

    destroy() {
      this.container.innerHTML = '';
    }
  }

  // Expose globally
  window.ParameterValueDisplay = ParameterValueDisplay;

})();
