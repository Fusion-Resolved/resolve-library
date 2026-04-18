/**
 * Timeline Component
 * Interactive scrubber bar for navigating through animation frames
 * Shows keyframe markers, current frame indicator, and playback controls
 */

(function() {
  'use strict';

  // CSS styles for timeline component
  const timelineStyles = `
    .timeline-container {
      font-family: var(--font-mono, 'DM Mono', monospace);
      user-select: none;
    }
    .timeline-bar {
      position: relative;
      height: 32px;
      background: rgba(6, 6, 13, 0.8);
      border: 1px solid rgba(108, 123, 255, 0.2);
      border-radius: 6px;
      cursor: pointer;
      overflow: hidden;
    }
    .timeline-track {
      position: absolute;
      top: 50%;
      left: 8px;
      right: 8px;
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-50%);
    }
    .timeline-keyframe {
      position: absolute;
      top: 50%;
      width: 6px;
      height: 6px;
      background: var(--violet, #6c7bff);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .timeline-keyframe:hover {
      transform: translate(-50%, -50%) scale(1.3);
      box-shadow: 0 0 8px var(--violet, #6c7bff);
    }
    .timeline-playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #fff;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 10;
    }
    .timeline-playhead::before {
      content: '';
      position: absolute;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #fff;
    }
    .timeline-handle {
      position: absolute;
      top: 50%;
      width: 12px;
      height: 20px;
      background: var(--violet, #6c7bff);
      border-radius: 3px;
      transform: translate(-50%, -50%);
      cursor: grab;
      z-index: 20;
      box-shadow: 0 2px 8px rgba(108, 123, 255, 0.4);
    }
    .timeline-handle:active {
      cursor: grabbing;
      transform: translate(-50%, -50%) scale(1.1);
    }
    .timeline-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    .timeline-btn {
      background: rgba(108, 123, 255, 0.15);
      border: 1px solid rgba(108, 123, 255, 0.3);
      border-radius: 4px;
      color: var(--violet-light, #a0aeff);
      cursor: pointer;
      padding: 4px 10px;
      font-size: 11px;
      font-family: var(--font-mono, 'DM Mono', monospace);
      transition: all 0.15s;
    }
    .timeline-btn:hover {
      background: rgba(108, 123, 255, 0.25);
    }
    .timeline-btn.active {
      background: var(--violet, #6c7bff);
      color: #06060d;
    }
    .timeline-frame-display {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      min-width: 100px;
      text-align: center;
    }
    .timeline-frame-input {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(108, 123, 255, 0.2);
      border-radius: 3px;
      color: #fff;
      font-family: var(--font-mono, 'DM Mono', monospace);
      font-size: 11px;
      width: 50px;
      padding: 2px 6px;
      text-align: center;
    }
    .timeline-range {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.4);
      margin-left: auto;
    }
  `;

  // Inject styles once
  if (!document.getElementById('timeline-styles')) {
    const style = document.createElement('style');
    style.id = 'timeline-styles';
    style.textContent = timelineStyles;
    document.head.appendChild(style);
  }

  /**
   * Timeline Scrubber Component
   */
  class TimelineScrubber {
    constructor(container, options = {}) {
      this.container = container;
      this.options = {
        startFrame: 0,
        endFrame: 100,
        currentFrame: 0,
        keyframes: [], // Array of frame numbers where keyframes exist
        onFrameChange: null, // Callback(frame)
        onPlay: null,
        onPause: null,
        ...options
      };

      this.isPlaying = false;
      this.playInterval = null;
      this.dragging = false;
      
      this.init();
    }

    init() {
      this.createDOM();
      this.bindEvents();
      this.render();
      this.setFrame(this.options.currentFrame);
    }

    createDOM() {
      this.container.innerHTML = '';
      this.container.className = 'timeline-container';

      // Timeline bar
      this.bar = document.createElement('div');
      this.bar.className = 'timeline-bar';

      // Track
      this.track = document.createElement('div');
      this.track.className = 'timeline-track';
      this.bar.appendChild(this.track);

      // Keyframe markers
      this.keyframeContainer = document.createElement('div');
      this.bar.appendChild(this.keyframeContainer);

      // Playhead
      this.playhead = document.createElement('div');
      this.playhead.className = 'timeline-playhead';
      this.bar.appendChild(this.playhead);

      // Draggable handle
      this.handle = document.createElement('div');
      this.handle.className = 'timeline-handle';
      this.bar.appendChild(this.handle);

      this.container.appendChild(this.bar);

      // Controls
      this.controls = document.createElement('div');
      this.controls.className = 'timeline-controls';

      // Play/Pause button
      this.playBtn = document.createElement('button');
      this.playBtn.className = 'timeline-btn';
      this.playBtn.innerHTML = '▶';
      this.controls.appendChild(this.playBtn);

      // Frame display
      this.frameDisplay = document.createElement('div');
      this.frameDisplay.className = 'timeline-frame-display';
      this.controls.appendChild(this.frameDisplay);

      // Frame input for direct entry
      this.frameInput = document.createElement('input');
      this.frameInput.className = 'timeline-frame-input';
      this.frameInput.type = 'number';
      this.frameInput.min = this.options.startFrame;
      this.frameInput.max = this.options.endFrame;
      this.controls.appendChild(this.frameInput);

      // Range indicator
      this.rangeDisplay = document.createElement('div');
      this.rangeDisplay.className = 'timeline-range';
      this.rangeDisplay.textContent = `${this.options.startFrame} - ${this.options.endFrame}`;
      this.controls.appendChild(this.rangeDisplay);

      this.container.appendChild(this.controls);
    }

    bindEvents() {
      // Play/Pause
      this.playBtn.addEventListener('click', () => this.togglePlay());

      // Bar click to jump
      this.bar.addEventListener('click', (e) => {
        if (e.target === this.handle || e.target.classList.contains('timeline-keyframe')) {
          return;
        }
        const rect = this.bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frame = this.xToFrame(x);
        this.setFrame(frame);
      });

      // Drag handle
      this.handle.addEventListener('mousedown', (e) => {
        this.dragging = true;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!this.dragging) return;
        const rect = this.bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frame = this.xToFrame(x);
        this.setFrame(Math.round(frame));
      });

      document.addEventListener('mouseup', () => {
        this.dragging = false;
      });

      // Frame input
      this.frameInput.addEventListener('change', (e) => {
        const frame = parseInt(e.target.value);
        if (!isNaN(frame)) {
          this.setFrame(Math.max(this.options.startFrame, Math.min(this.options.endFrame, frame)));
        }
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            this.setFrame(this.options.currentFrame - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.setFrame(this.options.currentFrame + 1);
            break;
          case ' ':
            e.preventDefault();
            this.togglePlay();
            break;
        }
      });
    }

    render() {
      // Clear existing keyframes
      this.keyframeContainer.innerHTML = '';

      // Add keyframe markers
      const uniqueFrames = [...new Set(this.options.keyframes)];
      uniqueFrames.forEach(frame => {
        const marker = document.createElement('div');
        marker.className = 'timeline-keyframe';
        marker.style.left = this.frameToX(frame) + 'px';
        marker.title = `Frame ${frame}`;
        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setFrame(frame);
        });
        this.keyframeContainer.appendChild(marker);
      });

      // Update range display
      this.rangeDisplay.textContent = `${this.options.startFrame} - ${this.options.endFrame}`;
      this.frameInput.min = this.options.startFrame;
      this.frameInput.max = this.options.endFrame;
    }

    setFrame(frame) {
      // Clamp to range
      frame = Math.max(this.options.startFrame, Math.min(this.options.endFrame, frame));
      
      const changed = frame !== this.options.currentFrame;
      this.options.currentFrame = frame;

      // Update visual position
      const x = this.frameToX(frame);
      this.playhead.style.left = x + 'px';
      this.handle.style.left = x + 'px';

      // Update displays
      this.frameDisplay.textContent = `Frame ${frame}`;
      this.frameInput.value = frame;

      // Callback
      if (changed && this.options.onFrameChange) {
        this.options.onFrameChange(frame);
      }
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    play() {
      this.isPlaying = true;
      this.playBtn.innerHTML = '⏸';
      this.playBtn.classList.add('active');

      if (this.options.onPlay) {
        this.options.onPlay();
      }

      // Advance frame every 100ms (10 fps for preview)
      this.playInterval = setInterval(() => {
        let nextFrame = this.options.currentFrame + 1;
        if (nextFrame > this.options.endFrame) {
          nextFrame = this.options.startFrame; // Loop
        }
        this.setFrame(nextFrame);
      }, 100);
    }

    pause() {
      this.isPlaying = false;
      this.playBtn.innerHTML = '▶';
      this.playBtn.classList.remove('active');

      if (this.playInterval) {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }

      if (this.options.onPause) {
        this.options.onPause();
      }
    }

    // Convert frame number to X position
    frameToX(frame) {
      const rect = this.bar.getBoundingClientRect();
      const trackWidth = rect.width - 16; // 8px padding each side
      const range = this.options.endFrame - this.options.startFrame;
      if (range === 0) return 8;
      const ratio = (frame - this.options.startFrame) / range;
      return 8 + ratio * trackWidth;
    }

    // Convert X position to frame number
    xToFrame(x) {
      const rect = this.bar.getBoundingClientRect();
      const trackWidth = rect.width - 16;
      const clampedX = Math.max(0, Math.min(x - 8, trackWidth));
      const ratio = clampedX / trackWidth;
      const range = this.options.endFrame - this.options.startFrame;
      return this.options.startFrame + ratio * range;
    }

    // Update keyframes (e.g., when selecting different node)
    setKeyframes(keyframes) {
      this.options.keyframes = keyframes;
      this.render();
    }

    // Update frame range
    setRange(start, end) {
      this.options.startFrame = start;
      this.options.endFrame = end;
      this.render();
      this.setFrame(Math.max(start, Math.min(end, this.options.currentFrame)));
    }

    // Cleanup
    destroy() {
      this.pause();
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  // Expose globally
  window.TimelineScrubber = TimelineScrubber;

})();
