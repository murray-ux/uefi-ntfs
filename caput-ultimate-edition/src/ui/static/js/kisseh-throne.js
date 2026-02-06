/**
 * KISSEH THRONE CONTROL PANEL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * כסא (Kisseh) = Throne — The Seat of Sovereign Command
 *
 * Master control panel for GENESIS 2.0 system:
 *   - MERKAVA Command Center interface
 *   - Module orchestration
 *   - System health visualization
 *   - Alert management
 *   - Workflow execution
 *   - Sovereign controls
 *
 * "From the throne, all power flows — the sovereign commands, the system obeys."
 *
 * @module KISSEH
 * @author murray-ux <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

// ══════════════════════════════════════════════════════════════════════════════
// KISSEH THRONE CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

class KissehThrone {
  constructor() {
    this.initialized = false;
    this.connected = false;
    this.refreshInterval = null;
    this.systemState = null;
    this.modules = {};
    this.alerts = [];
    this.selectedModule = null;

    // API endpoints
    this.api = {
      merkava: '/api/merkava',
      tzofeh: '/api/tzofeh',
      malakh: '/api/malakh',
      modules: '/api/modules'
    };
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  async initialize() {
    console.log('[KISSEH] Initializing Throne Control Panel...');

    this.createUI();
    this.bindEvents();
    await this.connect();
    this.startAutoRefresh();

    this.initialized = true;
    console.log('[KISSEH] Throne Control Panel ready');
  }

  // ─── UI Creation ───────────────────────────────────────────────────────────

  createUI() {
    const container = document.createElement('div');
    container.id = 'kisseh-throne';
    container.innerHTML = `
      <div class="throne-overlay">
        <div class="throne-container">
          <div class="throne-header">
            <div class="throne-title">
              <span class="throne-icon">👑</span>
              <h1>KISSEH THRONE</h1>
              <span class="throne-subtitle">כסא — Sovereign Command Center</span>
            </div>
            <div class="throne-status">
              <span class="status-indicator" id="throne-connection-status"></span>
              <span class="status-text" id="throne-status-text">Disconnected</span>
            </div>
            <button class="throne-close" id="throne-close">&times;</button>
          </div>

          <div class="throne-body">
            <!-- Left Panel: Module Grid -->
            <div class="throne-modules">
              <h2>🔮 GENESIS MODULES</h2>
              <div class="module-grid" id="module-grid">
                <!-- Modules inserted dynamically -->
              </div>
            </div>

            <!-- Center Panel: System Overview -->
            <div class="throne-center">
              <div class="system-health" id="system-health">
                <h2>⚡ SYSTEM HEALTH</h2>
                <div class="health-ring">
                  <svg viewBox="0 0 100 100">
                    <circle class="health-bg" cx="50" cy="50" r="45"/>
                    <circle class="health-progress" id="health-ring-progress" cx="50" cy="50" r="45"/>
                    <text x="50" y="50" class="health-text" id="health-percentage">--</text>
                    <text x="50" y="65" class="health-label">HEALTH</text>
                  </svg>
                </div>
                <div class="health-stats" id="health-stats">
                  <!-- Stats inserted dynamically -->
                </div>
              </div>

              <div class="quick-actions">
                <h2>⚙️ QUICK ACTIONS</h2>
                <div class="action-grid">
                  <button class="action-btn" data-action="healthCheck">
                    <span class="action-icon">🏥</span>
                    <span>Health Check</span>
                  </button>
                  <button class="action-btn" data-action="securitySweep">
                    <span class="action-icon">🛡️</span>
                    <span>Security Sweep</span>
                  </button>
                  <button class="action-btn warning" data-action="lockdown">
                    <span class="action-icon">🔒</span>
                    <span>LOCKDOWN</span>
                  </button>
                  <button class="action-btn" data-action="broadcast">
                    <span class="action-icon">📡</span>
                    <span>Broadcast</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Panel: Alerts & Logs -->
            <div class="throne-alerts">
              <h2>🚨 ALERTS</h2>
              <div class="alert-list" id="alert-list">
                <!-- Alerts inserted dynamically -->
              </div>

              <h2>📜 COMMAND LOG</h2>
              <div class="command-log" id="command-log">
                <!-- Commands inserted dynamically -->
              </div>
            </div>
          </div>

          <!-- Bottom Panel: Module Detail -->
          <div class="throne-detail" id="throne-detail" style="display: none;">
            <div class="detail-header">
              <h2 id="detail-module-name">Module Details</h2>
              <button class="detail-close" id="detail-close">&times;</button>
            </div>
            <div class="detail-content" id="detail-content">
              <!-- Detail content inserted dynamically -->
            </div>
          </div>

          <!-- Sovereign Controls (Hidden by default) -->
          <div class="sovereign-panel" id="sovereign-panel" style="display: none;">
            <div class="sovereign-header">
              <h2>👁️ SOVEREIGN CONTROLS</h2>
              <span class="sovereign-warning">⚠️ PRIVILEGED ACCESS REQUIRED</span>
            </div>
            <div class="sovereign-auth" id="sovereign-auth">
              <input type="password" id="sovereign-passphrase" placeholder="Enter sovereign passphrase...">
              <button id="sovereign-authorize">AUTHORIZE</button>
            </div>
            <div class="sovereign-actions" id="sovereign-actions" style="display: none;">
              <button class="sovereign-btn danger" data-action="fullReset">🔄 Full Reset</button>
              <button class="sovereign-btn danger" data-action="dataWipe">🗑️ Secure Wipe</button>
              <button class="sovereign-btn" data-action="liftLockdown">🔓 Lift Lockdown</button>
              <button class="sovereign-btn" data-action="configOverride">⚙️ Config Override</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = this.getStyles();
    document.head.appendChild(styles);

    document.body.appendChild(container);
    this.container = container;

    // Initially hidden
    this.hide();
  }

  getStyles() {
    return `
      #kisseh-throne {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100000;
        display: none;
      }

      #kisseh-throne.visible {
        display: block;
      }

      .throne-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .throne-container {
        width: 100%;
        max-width: 1600px;
        height: 90vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border-radius: 20px;
        border: 2px solid #ffd700;
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .throne-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 25px;
        background: linear-gradient(90deg, #ffd700 0%, #b8860b 100%);
        color: #000;
      }

      .throne-title {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .throne-icon {
        font-size: 32px;
      }

      .throne-title h1 {
        margin: 0;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 3px;
      }

      .throne-subtitle {
        font-size: 14px;
        opacity: 0.8;
      }

      .throne-status {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ff4444;
        animation: pulse 2s infinite;
      }

      .status-indicator.connected {
        background: #00ff00;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .throne-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #000;
        padding: 5px 10px;
      }

      .throne-body {
        display: grid;
        grid-template-columns: 280px 1fr 300px;
        gap: 20px;
        padding: 20px;
        flex: 1;
        overflow: hidden;
      }

      .throne-modules, .throne-center, .throne-alerts {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 15px;
        padding: 15px;
        overflow-y: auto;
      }

      .throne-modules h2, .throne-center h2, .throne-alerts h2 {
        margin: 0 0 15px 0;
        font-size: 14px;
        color: #ffd700;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .module-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .module-card {
        background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%);
        border: 1px solid #3a5a7c;
        border-radius: 10px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .module-card:hover {
        border-color: #ffd700;
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(255, 215, 0, 0.2);
      }

      .module-card.active {
        border-color: #00ff00;
        background: linear-gradient(135deg, #1e4a3f 0%, #0d3727 100%);
      }

      .module-card.warning {
        border-color: #ffaa00;
      }

      .module-card.error {
        border-color: #ff4444;
      }

      .module-card .module-name {
        font-weight: bold;
        color: #fff;
        margin-bottom: 5px;
        font-size: 12px;
      }

      .module-card .module-hebrew {
        font-size: 16px;
        color: #ffd700;
        margin-bottom: 5px;
      }

      .module-card .module-status {
        font-size: 10px;
        color: #888;
      }

      .system-health {
        text-align: center;
        margin-bottom: 20px;
      }

      .health-ring {
        width: 180px;
        height: 180px;
        margin: 0 auto 20px;
      }

      .health-ring svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .health-bg {
        fill: none;
        stroke: #1a1a2e;
        stroke-width: 8;
      }

      .health-progress {
        fill: none;
        stroke: #00ff00;
        stroke-width: 8;
        stroke-linecap: round;
        stroke-dasharray: 283;
        stroke-dashoffset: 283;
        transition: stroke-dashoffset 1s ease, stroke 0.5s ease;
      }

      .health-text {
        fill: #fff;
        font-size: 24px;
        font-weight: bold;
        text-anchor: middle;
        dominant-baseline: middle;
        transform: rotate(90deg);
        transform-origin: 50% 50%;
      }

      .health-label {
        fill: #888;
        font-size: 8px;
        text-anchor: middle;
        transform: rotate(90deg);
        transform-origin: 50% 65%;
      }

      .health-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        text-align: left;
      }

      .health-stat {
        background: rgba(0, 0, 0, 0.3);
        padding: 10px;
        border-radius: 8px;
      }

      .health-stat-label {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
      }

      .health-stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #fff;
      }

      .action-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .action-btn {
        background: linear-gradient(135deg, #2a4a6a 0%, #1a3a5a 100%);
        border: 1px solid #3a5a7c;
        border-radius: 10px;
        padding: 15px 10px;
        cursor: pointer;
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      }

      .action-btn:hover {
        border-color: #ffd700;
        transform: translateY(-2px);
      }

      .action-btn.warning {
        background: linear-gradient(135deg, #6a4a2a 0%, #5a3a1a 100%);
        border-color: #ff6600;
      }

      .action-btn.warning:hover {
        border-color: #ff9900;
      }

      .action-icon {
        font-size: 24px;
      }

      .alert-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 20px;
      }

      .alert-item {
        background: rgba(255, 68, 68, 0.2);
        border-left: 3px solid #ff4444;
        padding: 10px;
        margin-bottom: 8px;
        border-radius: 0 8px 8px 0;
        font-size: 12px;
      }

      .alert-item.warning {
        background: rgba(255, 170, 0, 0.2);
        border-left-color: #ffaa00;
      }

      .alert-item.info {
        background: rgba(0, 170, 255, 0.2);
        border-left-color: #00aaff;
      }

      .alert-time {
        font-size: 10px;
        color: #888;
      }

      .command-log {
        max-height: 200px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 11px;
      }

      .log-entry {
        padding: 5px 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        color: #00ff00;
      }

      .log-entry.error {
        color: #ff4444;
      }

      .throne-detail {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(0deg, #1a1a2e 0%, #16213e 100%);
        border-top: 2px solid #ffd700;
        max-height: 40%;
        overflow-y: auto;
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      }

      .detail-header h2 {
        margin: 0;
        color: #ffd700;
      }

      .detail-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
      }

      .detail-content {
        padding: 20px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }

      .sovereign-panel {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #2a1a1a 0%, #1a0a0a 100%);
        border: 2px solid #ff4444;
        border-radius: 15px;
        padding: 30px;
        min-width: 400px;
        box-shadow: 0 0 50px rgba(255, 0, 0, 0.3);
      }

      .sovereign-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .sovereign-header h2 {
        color: #ff4444;
        margin: 0 0 10px 0;
      }

      .sovereign-warning {
        color: #ffaa00;
        font-size: 12px;
      }

      .sovereign-auth {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .sovereign-auth input {
        flex: 1;
        padding: 12px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #ff4444;
        border-radius: 8px;
        color: #fff;
      }

      .sovereign-auth button {
        padding: 12px 20px;
        background: #ff4444;
        border: none;
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        font-weight: bold;
      }

      .sovereign-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .sovereign-btn {
        padding: 15px;
        background: rgba(255, 68, 68, 0.2);
        border: 1px solid #ff4444;
        border-radius: 10px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .sovereign-btn:hover {
        background: rgba(255, 68, 68, 0.4);
      }

      .sovereign-btn.danger {
        background: rgba(255, 0, 0, 0.3);
        border-color: #ff0000;
      }
    `;
  }

  // ─── Event Binding ─────────────────────────────────────────────────────────

  bindEvents() {
    // Close button
    document.getElementById('throne-close').addEventListener('click', () => this.hide());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.container.classList.contains('visible')) {
        this.hide();
      }
    });

    // Action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.executeAction(action);
      });
    });

    // Detail close
    document.getElementById('detail-close').addEventListener('click', () => {
      document.getElementById('throne-detail').style.display = 'none';
    });

    // Sovereign authorize
    document.getElementById('sovereign-authorize').addEventListener('click', () => {
      this.authorizeSovereign();
    });

    // Sovereign actions
    document.querySelectorAll('.sovereign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.executeSovereignAction(action);
      });
    });

    // Keyboard shortcut to show sovereign panel (Ctrl+Shift+S)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.toggleSovereignPanel();
      }
    });
  }

  // ─── Connection ────────────────────────────────────────────────────────────

  async connect() {
    try {
      const response = await fetch(`${this.api.merkava}/status`);
      if (response.ok) {
        this.systemState = await response.json();
        this.connected = true;
        this.updateConnectionStatus(true);
        this.updateUI();
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      console.error('[KISSEH] Connection error:', error);
      this.connected = false;
      this.updateConnectionStatus(false);
    }
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById('throne-connection-status');
    const text = document.getElementById('throne-status-text');

    if (connected) {
      indicator.classList.add('connected');
      text.textContent = 'Connected';
    } else {
      indicator.classList.remove('connected');
      text.textContent = 'Disconnected';
    }
  }

  // ─── Auto Refresh ──────────────────────────────────────────────────────────

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.container.classList.contains('visible')) {
        this.refresh();
      }
    }, 5000);
  }

  async refresh() {
    await this.connect();
    await this.loadAlerts();
    await this.loadCommandLog();
  }

  // ─── UI Updates ────────────────────────────────────────────────────────────

  updateUI() {
    this.updateModuleGrid();
    this.updateHealthRing();
    this.updateHealthStats();
  }

  updateModuleGrid() {
    const grid = document.getElementById('module-grid');

    const modules = [
      { id: 'MERKAVA', hebrew: 'מרכבה', name: 'Command Center', domain: 'control' },
      { id: 'TZOFEH', hebrew: 'צופה', name: 'Sentinel', domain: 'monitoring' },
      { id: 'MALAKH', hebrew: 'מלאך', name: 'Message Bus', domain: 'communication' },
      { id: 'RUACH', hebrew: 'רוח', name: 'Neural Engine', domain: 'ai' },
      { id: 'OHR', hebrew: 'אור', name: 'Observability', domain: 'monitoring' },
      { id: 'HADAAT', hebrew: 'הדעת', name: 'Decision Engine', domain: 'ai' },
      { id: 'KERUV', hebrew: 'כרוב', name: 'Zero-Trust', domain: 'security' },
      { id: 'EBEN', hebrew: 'אבן', name: 'Evidence Vault', domain: 'storage' },
      { id: 'SHINOBI', japanese: '忍び', name: 'Shadow Security', domain: 'security' },
      { id: 'TETSUYA', japanese: '鉄夜', name: 'Defense System', domain: 'security' }
    ];

    grid.innerHTML = modules.map(mod => {
      const status = this.getModuleStatus(mod.id);
      const statusClass = status === 'active' ? 'active' : status === 'warning' ? 'warning' : status === 'error' ? 'error' : '';
      const script = mod.hebrew || mod.japanese;

      return `
        <div class="module-card ${statusClass}" data-module="${mod.id}">
          <div class="module-hebrew">${script}</div>
          <div class="module-name">${mod.id}</div>
          <div class="module-status">${mod.name}</div>
        </div>
      `;
    }).join('');

    // Bind click events
    grid.querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', () => {
        this.showModuleDetail(card.dataset.module);
      });
    });
  }

  getModuleStatus(moduleId) {
    if (!this.systemState?.modules?.list) return 'unknown';
    return this.systemState.modules.list.includes(moduleId) ? 'active' : 'inactive';
  }

  updateHealthRing() {
    const health = this.systemState?.health?.percentage || 0;
    const progress = document.getElementById('health-ring-progress');
    const text = document.getElementById('health-percentage');

    // Calculate stroke offset (283 is circumference of circle with r=45)
    const offset = 283 - (283 * health / 100);
    progress.style.strokeDashoffset = offset;

    // Update color based on health
    if (health >= 80) {
      progress.style.stroke = '#00ff00';
    } else if (health >= 50) {
      progress.style.stroke = '#ffaa00';
    } else {
      progress.style.stroke = '#ff4444';
    }

    text.textContent = `${health}%`;
  }

  updateHealthStats() {
    const stats = document.getElementById('health-stats');

    const data = [
      { label: 'Modules', value: this.systemState?.modules?.connected || 0 },
      { label: 'Uptime', value: this.formatUptime(this.systemState?.uptime || 0) },
      { label: 'State', value: this.systemState?.state || 'unknown' },
      { label: 'Alerts', value: this.systemState?.alerts?.active || 0 }
    ];

    stats.innerHTML = data.map(item => `
      <div class="health-stat">
        <div class="health-stat-label">${item.label}</div>
        <div class="health-stat-value">${item.value}</div>
      </div>
    `).join('');
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // ─── Alerts & Logs ─────────────────────────────────────────────────────────

  async loadAlerts() {
    try {
      const response = await fetch(`${this.api.merkava}/alerts`);
      if (response.ok) {
        const alerts = await response.json();
        this.updateAlertList(alerts);
      }
    } catch (error) {
      console.error('[KISSEH] Failed to load alerts:', error);
    }
  }

  updateAlertList(alerts) {
    const list = document.getElementById('alert-list');

    if (!alerts || alerts.length === 0) {
      list.innerHTML = '<div class="alert-item info">No active alerts</div>';
      return;
    }

    list.innerHTML = alerts.slice(0, 10).map(alert => `
      <div class="alert-item ${alert.severity}">
        <div class="alert-time">${new Date(alert.raisedAt).toLocaleTimeString()}</div>
        <div class="alert-message">${alert.message}</div>
      </div>
    `).join('');
  }

  async loadCommandLog() {
    try {
      const response = await fetch(`${this.api.merkava}/commands?limit=20`);
      if (response.ok) {
        const commands = await response.json();
        this.updateCommandLog(commands);
      }
    } catch (error) {
      console.error('[KISSEH] Failed to load command log:', error);
    }
  }

  updateCommandLog(commands) {
    const log = document.getElementById('command-log');

    if (!commands || commands.length === 0) {
      log.innerHTML = '<div class="log-entry">No commands executed</div>';
      return;
    }

    log.innerHTML = commands.map(cmd => {
      const time = new Date(cmd.timestamp).toLocaleTimeString();
      return `<div class="log-entry">[${time}] ${cmd.directive?.moduleId}.${cmd.directive?.command}</div>`;
    }).join('');
  }

  // ─── Module Detail ─────────────────────────────────────────────────────────

  async showModuleDetail(moduleId) {
    this.selectedModule = moduleId;

    const detail = document.getElementById('throne-detail');
    const title = document.getElementById('detail-module-name');
    const content = document.getElementById('detail-content');

    title.textContent = `${moduleId} Details`;
    content.innerHTML = '<div>Loading...</div>';
    detail.style.display = 'block';

    try {
      const response = await fetch(`${this.api.modules}/${moduleId}/status`);
      if (response.ok) {
        const status = await response.json();
        this.renderModuleDetail(status);
      } else {
        content.innerHTML = '<div>Failed to load module details</div>';
      }
    } catch (error) {
      content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  renderModuleDetail(status) {
    const content = document.getElementById('detail-content');

    content.innerHTML = Object.entries(status).map(([key, value]) => `
      <div class="health-stat">
        <div class="health-stat-label">${key}</div>
        <div class="health-stat-value">${typeof value === 'object' ? JSON.stringify(value) : value}</div>
      </div>
    `).join('');
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async executeAction(action) {
    this.logCommand(`Executing: ${action}`);

    try {
      let response;

      switch (action) {
        case 'healthCheck':
          response = await fetch(`${this.api.merkava}/workflow/system:healthCheck`, { method: 'POST' });
          break;
        case 'securitySweep':
          response = await fetch(`${this.api.merkava}/workflow/security:sweep`, { method: 'POST' });
          break;
        case 'lockdown':
          if (confirm('Are you sure you want to initiate LOCKDOWN?')) {
            response = await fetch(`${this.api.merkava}/lockdown`, { method: 'POST' });
          }
          break;
        case 'broadcast':
          const message = prompt('Enter broadcast message:');
          if (message) {
            response = await fetch(`${this.api.malakh}/broadcast`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic: 'system.broadcast', payload: { message } })
            });
          }
          break;
      }

      if (response?.ok) {
        this.logCommand(`${action}: Success`);
        this.refresh();
      } else {
        this.logCommand(`${action}: Failed`, true);
      }
    } catch (error) {
      this.logCommand(`${action}: Error - ${error.message}`, true);
    }
  }

  logCommand(message, isError = false) {
    const log = document.getElementById('command-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${isError ? 'error' : ''}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.insertBefore(entry, log.firstChild);
  }

  // ─── Sovereign Controls ────────────────────────────────────────────────────

  toggleSovereignPanel() {
    const panel = document.getElementById('sovereign-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  async authorizeSovereign() {
    const passphrase = document.getElementById('sovereign-passphrase').value;

    try {
      const response = await fetch(`${this.api.merkava}/sovereign/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase })
      });

      if (response.ok) {
        document.getElementById('sovereign-auth').style.display = 'none';
        document.getElementById('sovereign-actions').style.display = 'grid';
        this.logCommand('Sovereign: Authorized');
      } else {
        alert('Authorization failed');
      }
    } catch (error) {
      alert('Authorization error: ' + error.message);
    }
  }

  async executeSovereignAction(action) {
    if (!confirm(`Execute sovereign action: ${action}?`)) return;

    this.logCommand(`Sovereign: ${action}`);

    try {
      const response = await fetch(`${this.api.merkava}/sovereign/${action}`, { method: 'POST' });

      if (response.ok) {
        this.logCommand(`Sovereign ${action}: Success`);
        this.refresh();
      } else {
        this.logCommand(`Sovereign ${action}: Failed`, true);
      }
    } catch (error) {
      this.logCommand(`Sovereign ${action}: Error - ${error.message}`, true);
    }
  }

  // ─── Show/Hide ─────────────────────────────────────────────────────────────

  show() {
    this.container.classList.add('visible');
    this.refresh();
  }

  hide() {
    this.container.classList.remove('visible');
    document.getElementById('throne-detail').style.display = 'none';
    document.getElementById('sovereign-panel').style.display = 'none';
  }

  toggle() {
    if (this.container.classList.contains('visible')) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

// Create global instance
window.KissehThrone = new KissehThrone();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.KissehThrone.initialize();
});

// Global keyboard shortcut (Ctrl+Shift+K) to toggle throne
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'K') {
    e.preventDefault();
    window.KissehThrone.toggle();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KissehThrone;
}
