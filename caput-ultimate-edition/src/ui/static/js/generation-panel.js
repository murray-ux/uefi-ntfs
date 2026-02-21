/**
 * GENERATION PANEL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard integration for Master Generation Skeleton Ecosystem
 *
 * Features:
 *   - Real-time generation progress visualization
 *   - Parameter configuration UI
 *   - 3D preview of generated content
 *   - Export options
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module GENERATION_PANEL
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

// ══════════════════════════════════════════════════════════════════════════════
// GENERATION PANEL UI
// ══════════════════════════════════════════════════════════════════════════════

const GenerationPanel = {
  container: null,
  isOpen: false,
  config: {
    masterSeed: '',
    contentType: 'creature',
    density: 0.5,
    quality: 'medium',
    chunkX: 0,
    chunkY: 0,
    chunkZ: 0
  },
  progress: {
    currentLayer: 0,
    layerProgress: {},
    status: 'idle'
  },
  result: null,

  init() {
    this.createUI();
    this.bindEvents();
    console.log('[GenerationPanel] Initialized');
  },

  createUI() {
    // Create panel container
    this.container = document.createElement('div');
    this.container.id = 'generation-panel';
    this.container.className = 'generation-panel';
    this.container.innerHTML = `
      <div class="gen-panel-header">
        <h3>🧬 Master Generation</h3>
        <button class="gen-close-btn" title="Close">×</button>
      </div>

      <div class="gen-panel-body">
        <!-- Configuration Section -->
        <div class="gen-section">
          <h4>Configuration</h4>

          <div class="gen-field">
            <label for="gen-seed">Master Seed</label>
            <input type="text" id="gen-seed" placeholder="Random if empty">
          </div>

          <div class="gen-field">
            <label for="gen-content-type">Content Type</label>
            <select id="gen-content-type">
              <option value="creature">Creature</option>
              <option value="structure">Structure</option>
              <option value="terrain">Terrain</option>
              <option value="vegetation">Vegetation</option>
              <option value="generic">Generic</option>
            </select>
          </div>

          <div class="gen-field">
            <label for="gen-density">Density: <span id="gen-density-value">0.5</span></label>
            <input type="range" id="gen-density" min="0" max="1" step="0.05" value="0.5">
          </div>

          <div class="gen-field">
            <label for="gen-quality">Quality</label>
            <select id="gen-quality">
              <option value="low">Low (Fast)</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra (Slow)</option>
            </select>
          </div>

          <div class="gen-field-row">
            <div class="gen-field">
              <label>Chunk X</label>
              <input type="number" id="gen-chunk-x" value="0">
            </div>
            <div class="gen-field">
              <label>Chunk Y</label>
              <input type="number" id="gen-chunk-y" value="0">
            </div>
            <div class="gen-field">
              <label>Chunk Z</label>
              <input type="number" id="gen-chunk-z" value="0">
            </div>
          </div>
        </div>

        <!-- Progress Section -->
        <div class="gen-section gen-progress-section" style="display: none;">
          <h4>Generation Progress</h4>

          <div class="gen-layer-progress">
            <div class="gen-layer" data-layer="0">
              <span class="gen-layer-name">L0: Seed & Config</span>
              <div class="gen-layer-bar"><div class="gen-layer-fill"></div></div>
              <span class="gen-layer-status">Pending</span>
            </div>
            <div class="gen-layer" data-layer="1">
              <span class="gen-layer-name">L1: Spatial</span>
              <div class="gen-layer-bar"><div class="gen-layer-fill"></div></div>
              <span class="gen-layer-status">Pending</span>
            </div>
            <div class="gen-layer" data-layer="2">
              <span class="gen-layer-name">L2: Topology</span>
              <div class="gen-layer-bar"><div class="gen-layer-fill"></div></div>
              <span class="gen-layer-status">Pending</span>
            </div>
            <div class="gen-layer" data-layer="3">
              <span class="gen-layer-name">L3: Mesh</span>
              <div class="gen-layer-bar"><div class="gen-layer-fill"></div></div>
              <span class="gen-layer-status">Pending</span>
            </div>
            <div class="gen-layer" data-layer="4">
              <span class="gen-layer-name">L4: Assets</span>
              <div class="gen-layer-bar"><div class="gen-layer-fill"></div></div>
              <span class="gen-layer-status">Pending</span>
            </div>
            <div class="gen-layer" data-layer="5">
              <span class="gen-layer-name">L5: World</span>
              <div class="gen-layer-bar"><div class="gen-layer-fill"></div></div>
              <span class="gen-layer-status">Pending</span>
            </div>
          </div>

          <div class="gen-overall-progress">
            <div class="gen-overall-bar">
              <div class="gen-overall-fill"></div>
            </div>
            <span class="gen-overall-text">0%</span>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="gen-section gen-preview-section" style="display: none;">
          <h4>Preview</h4>
          <div class="gen-preview-container">
            <canvas id="gen-preview-canvas" width="400" height="300"></canvas>
          </div>
          <div class="gen-preview-stats">
            <span id="gen-stat-vertices">Vertices: -</span>
            <span id="gen-stat-triangles">Triangles: -</span>
            <span id="gen-stat-joints">Joints: -</span>
          </div>
        </div>

        <!-- Results Section -->
        <div class="gen-section gen-results-section" style="display: none;">
          <h4>Results</h4>
          <div class="gen-results-info">
            <div class="gen-result-item">
              <span class="gen-result-label">Generation Time:</span>
              <span class="gen-result-value" id="gen-result-time">-</span>
            </div>
            <div class="gen-result-item">
              <span class="gen-result-label">Cache Key:</span>
              <span class="gen-result-value gen-result-key" id="gen-result-key">-</span>
            </div>
          </div>

          <div class="gen-export-buttons">
            <button class="gen-export-btn" data-format="json">Export JSON</button>
            <button class="gen-export-btn" data-format="gltf">Export GLTF</button>
            <button class="gen-export-btn" data-format="fbx">Export FBX</button>
          </div>
        </div>
      </div>

      <div class="gen-panel-footer">
        <button id="gen-generate-btn" class="gen-primary-btn">
          ⚡ Generate
        </button>
        <button id="gen-cancel-btn" class="gen-secondary-btn" style="display: none;">
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(this.container);

    // Add styles
    this.addStyles();
  },

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .generation-panel {
        position: fixed;
        right: -450px;
        top: 60px;
        width: 420px;
        height: calc(100vh - 80px);
        background: var(--glass-bg, rgba(20, 25, 35, 0.95));
        backdrop-filter: blur(20px);
        border-left: 1px solid var(--border-color, rgba(255,255,255,0.1));
        border-radius: 12px 0 0 12px;
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        font-family: var(--font-sans, system-ui, sans-serif);
        overflow: hidden;
      }

      .generation-panel.open {
        right: 0;
      }

      .gen-panel-header {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .gen-panel-header h3 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary, #fff);
      }

      .gen-close-btn {
        background: none;
        border: none;
        color: var(--text-secondary, #888);
        font-size: 24px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .gen-close-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
      }

      .gen-panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
      }

      .gen-section {
        margin-bottom: 24px;
      }

      .gen-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--accent-color, #00d4ff);
      }

      .gen-field {
        margin-bottom: 12px;
      }

      .gen-field label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary, #888);
        margin-bottom: 4px;
      }

      .gen-field input[type="text"],
      .gen-field input[type="number"],
      .gen-field select {
        width: 100%;
        padding: 10px 12px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        transition: all 0.2s;
      }

      .gen-field input:focus,
      .gen-field select:focus {
        outline: none;
        border-color: var(--accent-color, #00d4ff);
        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
      }

      .gen-field input[type="range"] {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        cursor: pointer;
      }

      .gen-field input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: var(--accent-color, #00d4ff);
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .gen-field input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .gen-field-row {
        display: flex;
        gap: 12px;
      }

      .gen-field-row .gen-field {
        flex: 1;
      }

      .gen-field-row input[type="number"] {
        text-align: center;
      }

      /* Progress Section */
      .gen-layer-progress {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .gen-layer {
        display: grid;
        grid-template-columns: 120px 1fr 60px;
        gap: 8px;
        align-items: center;
        padding: 8px;
        background: rgba(0,0,0,0.2);
        border-radius: 6px;
      }

      .gen-layer.active {
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.3);
      }

      .gen-layer.complete {
        background: rgba(0, 255, 136, 0.1);
      }

      .gen-layer-name {
        font-size: 12px;
        color: var(--text-secondary, #888);
      }

      .gen-layer-bar {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .gen-layer-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00d4ff, #00ff88);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .gen-layer.complete .gen-layer-fill {
        width: 100%;
        background: #00ff88;
      }

      .gen-layer-status {
        font-size: 11px;
        text-align: right;
        color: var(--text-secondary, #888);
      }

      .gen-layer.active .gen-layer-status {
        color: #00d4ff;
      }

      .gen-layer.complete .gen-layer-status {
        color: #00ff88;
      }

      .gen-overall-progress {
        margin-top: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .gen-overall-bar {
        flex: 1;
        height: 10px;
        background: rgba(255,255,255,0.1);
        border-radius: 5px;
        overflow: hidden;
      }

      .gen-overall-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00d4ff, #00ff88, #ffcc00);
        border-radius: 5px;
        transition: width 0.3s ease;
      }

      .gen-overall-text {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        min-width: 40px;
        text-align: right;
      }

      /* Preview Section */
      .gen-preview-container {
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      #gen-preview-canvas {
        width: 100%;
        height: 200px;
        display: block;
      }

      .gen-preview-stats {
        display: flex;
        justify-content: space-around;
        font-size: 12px;
        color: var(--text-secondary, #888);
      }

      /* Results Section */
      .gen-results-info {
        margin-bottom: 16px;
      }

      .gen-result-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .gen-result-label {
        color: var(--text-secondary, #888);
        font-size: 13px;
      }

      .gen-result-value {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
      }

      .gen-result-key {
        font-family: monospace;
        font-size: 11px;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .gen-export-buttons {
        display: flex;
        gap: 8px;
      }

      .gen-export-btn {
        flex: 1;
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .gen-export-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: var(--accent-color, #00d4ff);
      }

      /* Footer */
      .gen-panel-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
        display: flex;
        gap: 12px;
      }

      .gen-primary-btn {
        flex: 1;
        padding: 14px 24px;
        background: linear-gradient(135deg, #00d4ff, #0099cc);
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }

      .gen-primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 212, 255, 0.4);
      }

      .gen-primary-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .gen-secondary-btn {
        padding: 14px 24px;
        background: rgba(255,100,100,0.2);
        border: 1px solid rgba(255,100,100,0.3);
        border-radius: 8px;
        color: #ff6464;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .gen-secondary-btn:hover {
        background: rgba(255,100,100,0.3);
      }

      /* Toggle button (external) */
      .gen-toggle-btn {
        position: fixed;
        right: 20px;
        bottom: 100px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #00d4ff, #0099cc);
        border: none;
        border-radius: 50%;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
        transition: all 0.3s;
        z-index: 999;
      }

      .gen-toggle-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(0, 212, 255, 0.6);
      }

      /* Animations */
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .gen-layer.active .gen-layer-status {
        animation: pulse 1s infinite;
      }
    `;
    document.head.appendChild(style);
  },

  bindEvents() {
    // Close button
    this.container.querySelector('.gen-close-btn').addEventListener('click', () => {
      this.close();
    });

    // Density slider
    const densitySlider = this.container.querySelector('#gen-density');
    const densityValue = this.container.querySelector('#gen-density-value');
    densitySlider.addEventListener('input', (e) => {
      densityValue.textContent = parseFloat(e.target.value).toFixed(2);
      this.config.density = parseFloat(e.target.value);
    });

    // Generate button
    this.container.querySelector('#gen-generate-btn').addEventListener('click', () => {
      this.generate();
    });

    // Cancel button
    this.container.querySelector('#gen-cancel-btn').addEventListener('click', () => {
      this.cancel();
    });

    // Export buttons
    this.container.querySelectorAll('.gen-export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        this.export(format);
      });
    });

    // Config inputs
    this.container.querySelector('#gen-seed').addEventListener('change', (e) => {
      this.config.masterSeed = e.target.value;
    });

    this.container.querySelector('#gen-content-type').addEventListener('change', (e) => {
      this.config.contentType = e.target.value;
    });

    this.container.querySelector('#gen-quality').addEventListener('change', (e) => {
      this.config.quality = e.target.value;
    });

    ['x', 'y', 'z'].forEach(axis => {
      this.container.querySelector(`#gen-chunk-${axis}`).addEventListener('change', (e) => {
        this.config[`chunk${axis.toUpperCase()}`] = parseInt(e.target.value) || 0;
      });
    });

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'gen-toggle-btn';
    toggleBtn.innerHTML = '🧬';
    toggleBtn.title = 'Open Generation Panel';
    toggleBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(toggleBtn);

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.container.classList.add('open');
    this.isOpen = true;
  },

  close() {
    this.container.classList.remove('open');
    this.isOpen = false;
  },

  async generate() {
    // Update UI
    this.progress.status = 'running';
    this.container.querySelector('#gen-generate-btn').disabled = true;
    this.container.querySelector('#gen-cancel-btn').style.display = 'block';
    this.container.querySelector('.gen-progress-section').style.display = 'block';
    this.container.querySelector('.gen-preview-section').style.display = 'none';
    this.container.querySelector('.gen-results-section').style.display = 'none';

    // Reset progress
    this.resetProgress();

    try {
      // Simulate generation (in real app, this would call the API)
      await this.simulateGeneration();

      // Show results
      this.showResults();
    } catch (error) {
      console.error('Generation failed:', error);
      this.showError(error.message);
    } finally {
      this.container.querySelector('#gen-generate-btn').disabled = false;
      this.container.querySelector('#gen-cancel-btn').style.display = 'none';
      this.progress.status = 'idle';
    }
  },

  resetProgress() {
    for (let i = 0; i <= 5; i++) {
      const layer = this.container.querySelector(`.gen-layer[data-layer="${i}"]`);
      layer.classList.remove('active', 'complete');
      layer.querySelector('.gen-layer-fill').style.width = '0%';
      layer.querySelector('.gen-layer-status').textContent = 'Pending';
    }
    this.container.querySelector('.gen-overall-fill').style.width = '0%';
    this.container.querySelector('.gen-overall-text').textContent = '0%';
  },

  async simulateGeneration() {
    const startTime = Date.now();
    const layerNames = ['Seed & Config', 'Spatial', 'Topology', 'Mesh', 'Assets', 'World'];

    for (let layer = 0; layer <= 5; layer++) {
      // Mark layer as active
      const layerEl = this.container.querySelector(`.gen-layer[data-layer="${layer}"]`);
      layerEl.classList.add('active');
      layerEl.querySelector('.gen-layer-status').textContent = 'Running...';

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        if (this.progress.status === 'cancelled') {
          throw new Error('Generation cancelled');
        }

        layerEl.querySelector('.gen-layer-fill').style.width = `${progress}%`;

        // Update overall progress
        const overall = ((layer * 100 + progress) / 600 * 100).toFixed(0);
        this.container.querySelector('.gen-overall-fill').style.width = `${overall}%`;
        this.container.querySelector('.gen-overall-text').textContent = `${overall}%`;

        await this.sleep(50 + Math.random() * 100);
      }

      // Mark layer as complete
      layerEl.classList.remove('active');
      layerEl.classList.add('complete');
      layerEl.querySelector('.gen-layer-status').textContent = 'Done';
    }

    // Store result
    this.result = {
      time: Date.now() - startTime,
      cacheKey: 'gen_' + Math.random().toString(36).substring(7),
      vertices: Math.floor(Math.random() * 5000) + 1000,
      triangles: Math.floor(Math.random() * 10000) + 2000,
      joints: Math.floor(Math.random() * 50) + 10
    };
  },

  showResults() {
    this.container.querySelector('.gen-preview-section').style.display = 'block';
    this.container.querySelector('.gen-results-section').style.display = 'block';

    // Update stats
    document.getElementById('gen-stat-vertices').textContent = `Vertices: ${this.result.vertices}`;
    document.getElementById('gen-stat-triangles').textContent = `Triangles: ${this.result.triangles}`;
    document.getElementById('gen-stat-joints').textContent = `Joints: ${this.result.joints}`;

    document.getElementById('gen-result-time').textContent = `${this.result.time}ms`;
    document.getElementById('gen-result-key').textContent = this.result.cacheKey;

    // Draw preview
    this.drawPreview();
  },

  drawPreview() {
    const canvas = document.getElementById('gen-preview-canvas');
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw skeleton visualization
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Simple skeleton representation
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 60);
    ctx.lineTo(centerX, centerY + 40);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 75, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY - 30);
    ctx.lineTo(centerX, centerY - 20);
    ctx.lineTo(centerX + 40, centerY - 30);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(centerX - 25, centerY + 80);
    ctx.lineTo(centerX, centerY + 40);
    ctx.lineTo(centerX + 25, centerY + 80);
    ctx.stroke();

    // Joints
    ctx.fillStyle = '#00ff88';
    const joints = [
      [centerX, centerY - 75],
      [centerX, centerY - 20],
      [centerX, centerY + 40],
      [centerX - 40, centerY - 30],
      [centerX + 40, centerY - 30],
      [centerX - 25, centerY + 80],
      [centerX + 25, centerY + 80]
    ];

    joints.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Label
    ctx.fillStyle = '#888';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(this.config.contentType.toUpperCase(), centerX, canvas.height - 20);
  },

  showError(message) {
    // Simple error display
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: rgba(255, 100, 100, 0.9);
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
    `;
    errorDiv.textContent = `Generation Error: ${message}`;
    document.body.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 5000);
  },

  cancel() {
    this.progress.status = 'cancelled';
  },

  export(format) {
    if (!this.result) {
      console.warn('No generation result to export');
      return;
    }

    const data = {
      format,
      config: this.config,
      result: this.result,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `genesis_${this.result.cacheKey}.${format === 'json' ? 'json' : format}`;
    a.click();

    URL.revokeObjectURL(url);
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GenerationPanel.init());
} else {
  GenerationPanel.init();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GenerationPanel;
}
