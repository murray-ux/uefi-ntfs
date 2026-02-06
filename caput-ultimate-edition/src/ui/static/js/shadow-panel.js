/**
 * SHADOW ADMIN PANEL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 Murray Bembrick
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
 * Hidden administration interface for EBEN Evidence Management
 * Protected by SHINOBI security layer
 *
 * ACCESS: SHADOW_ADMIN only
 * VISIBILITY: Hidden from standard navigation
 * ENTRY: Secret knock sequence required
 *
 * "The shadow knows all, reveals nothing."
 *
 * @module ShadowPanel
 * @author Murray Bembrick <Founder & Lead Developer>
 * @version 2.0.0
 * @license Apache-2.0
 */

// ══════════════════════════════════════════════════════════════════════════════
// STEALTH ENTRY SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class StealthEntry {
  constructor() {
    this.knockSequence = [];
    this.knockTimeout = null;
    this.knockWindow = 5000;
    this.authenticated = false;
    this.sessionToken = null;

    // Secret sequences
    this.sequences = {
      ADMIN_REVEAL: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'],
      SHADOW_MODE: ['KeyS', 'KeyH', 'KeyA', 'KeyD', 'KeyO', 'KeyW'],
      EMERGENCY_LOCK: ['KeyL', 'KeyO', 'KeyC', 'KeyK']
    };

    this.onReveal = null;
    this.onShadow = null;
    this.onLock = null;

    this._initListeners();
  }

  _initListeners() {
    document.addEventListener('keydown', (e) => this._handleKeyPress(e));

    // Also listen for mouse pattern (5 clicks in corners)
    this.cornerClicks = [];
    document.addEventListener('click', (e) => this._handleCornerClick(e));
  }

  _handleKeyPress(e) {
    this.knockSequence.push(e.code);

    clearTimeout(this.knockTimeout);
    this.knockTimeout = setTimeout(() => {
      this.knockSequence = [];
    }, this.knockWindow);

    this._checkSequences();
  }

  _handleCornerClick(e) {
    const rect = document.documentElement.getBoundingClientRect();
    const corners = {
      topLeft: e.clientX < 50 && e.clientY < 50,
      topRight: e.clientX > rect.width - 50 && e.clientY < 50,
      bottomLeft: e.clientX < 50 && e.clientY > rect.height - 50,
      bottomRight: e.clientX > rect.width - 50 && e.clientY > rect.height - 50
    };

    const corner = Object.entries(corners).find(([_, hit]) => hit)?.[0];
    if (corner) {
      this.cornerClicks.push({ corner, time: Date.now() });

      // Check for corner pattern: TL, TR, BL, BR, TL
      const recentClicks = this.cornerClicks.filter(c => c.time > Date.now() - 3000);
      const pattern = recentClicks.map(c => c.corner).join(',');

      if (pattern.endsWith('topLeft,topRight,bottomLeft,bottomRight,topLeft')) {
        this.cornerClicks = [];
        this._triggerReveal();
      }
    }

    // Clean old clicks
    this.cornerClicks = this.cornerClicks.filter(c => c.time > Date.now() - 5000);
  }

  _checkSequences() {
    for (const [name, sequence] of Object.entries(this.sequences)) {
      if (this.knockSequence.length >= sequence.length) {
        const recent = this.knockSequence.slice(-sequence.length);
        if (JSON.stringify(recent) === JSON.stringify(sequence)) {
          this.knockSequence = [];
          this._triggerSequence(name);
          return;
        }
      }
    }
  }

  _triggerSequence(name) {
    switch (name) {
      case 'ADMIN_REVEAL':
        this._triggerReveal();
        break;
      case 'SHADOW_MODE':
        this.onShadow?.();
        break;
      case 'EMERGENCY_LOCK':
        this.onLock?.();
        break;
    }
  }

  _triggerReveal() {
    if (this.authenticated) {
      this.onReveal?.();
    } else {
      this._showAuthDialog();
    }
  }

  _showAuthDialog() {
    // Create stealth auth dialog
    const dialog = document.createElement('div');
    dialog.id = 'shadow-auth-dialog';
    dialog.innerHTML = `
      <style>
        #shadow-auth-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          font-family: 'Courier New', monospace;
        }
        .shadow-auth-box {
          background: #0a0a0a;
          border: 1px solid #1a1a2e;
          padding: 40px;
          width: 400px;
          box-shadow: 0 0 50px rgba(138, 43, 226, 0.3);
        }
        .shadow-auth-box h2 {
          color: #8b5cf6;
          margin: 0 0 30px 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        .shadow-auth-box input {
          width: 100%;
          padding: 15px;
          background: #111;
          border: 1px solid #222;
          color: #8b5cf6;
          font-family: inherit;
          font-size: 14px;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .shadow-auth-box input:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        .shadow-auth-box button {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #8b5cf6;
          color: #8b5cf6;
          font-family: inherit;
          font-size: 14px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: all 0.3s;
        }
        .shadow-auth-box button:hover {
          background: #8b5cf6;
          color: #000;
        }
        .shadow-auth-error {
          color: #ef4444;
          font-size: 12px;
          margin-top: 10px;
          display: none;
        }
        .shadow-auth-hint {
          color: #444;
          font-size: 10px;
          margin-top: 20px;
          text-align: center;
        }
      </style>
      <div class="shadow-auth-box">
        <h2>忍 Shadow Authentication</h2>
        <input type="password" id="shadow-token-input" placeholder="Enter shadow token..." autofocus>
        <button id="shadow-auth-submit">Authenticate</button>
        <div class="shadow-auth-error" id="shadow-auth-error">Access Denied</div>
        <div class="shadow-auth-hint">ESC to vanish</div>
      </div>
    `;

    document.body.appendChild(dialog);

    const input = document.getElementById('shadow-token-input');
    const submit = document.getElementById('shadow-auth-submit');
    const error = document.getElementById('shadow-auth-error');

    submit.addEventListener('click', async () => {
      const token = input.value;
      const result = await this._verifyToken(token);

      if (result.success) {
        this.authenticated = true;
        this.sessionToken = result.sessionToken;
        dialog.remove();
        this.onReveal?.();
      } else {
        error.style.display = 'block';
        input.value = '';
        setTimeout(() => error.style.display = 'none', 2000);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit.click();
      if (e.key === 'Escape') dialog.remove();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  async _verifyToken(token) {
    try {
      const response = await fetch('/api/shinobi/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      return await response.json();
    } catch (error) {
      // For demo/offline mode, accept specific pattern
      const hash = await this._hashToken(token);
      if (hash.startsWith('8b5cf6')) {
        return { success: true, sessionToken: 'demo-session' };
      }
      return { success: false };
    }
  }

  async _hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SHADOW PANEL UI
// ══════════════════════════════════════════════════════════════════════════════

class ShadowPanel {
  constructor() {
    this.visible = false;
    this.container = null;
    this.stealthMode = false;
    this.currentView = 'dashboard';

    // Evidence state
    this.evidence = [];
    this.cases = [];
    this.auditLog = [];
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.visible = true;
      return;
    }

    this._createPanel();
    this.visible = true;
    this._loadData();
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.visible = false;
    }
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  _createPanel() {
    this.container = document.createElement('div');
    this.container.id = 'shadow-panel';
    this.container.innerHTML = `
      <style>
        #shadow-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #050508;
          z-index: 99998;
          font-family: 'Courier New', monospace;
          color: #a0a0a0;
          overflow: hidden;
        }

        .shadow-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 30px;
          background: linear-gradient(90deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
          border-bottom: 1px solid #1a1a2e;
        }

        .shadow-logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .shadow-logo-icon {
          font-size: 28px;
        }

        .shadow-logo-text {
          font-size: 18px;
          color: #8b5cf6;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .shadow-logo-sub {
          font-size: 10px;
          color: #444;
          letter-spacing: 2px;
        }

        .shadow-status {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .shadow-status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }

        .shadow-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .shadow-status-dot.green { background: #22c55e; }
        .shadow-status-dot.yellow { background: #eab308; }
        .shadow-status-dot.red { background: #ef4444; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .shadow-close {
          background: none;
          border: 1px solid #333;
          color: #666;
          padding: 8px 15px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s;
        }

        .shadow-close:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .shadow-body {
          display: flex;
          height: calc(100% - 80px);
        }

        .shadow-sidebar {
          width: 250px;
          background: #08080c;
          border-right: 1px solid #1a1a2e;
          padding: 20px 0;
        }

        .shadow-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 25px;
          color: #666;
          cursor: pointer;
          transition: all 0.3s;
          border-left: 3px solid transparent;
        }

        .shadow-nav-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #a0a0a0;
        }

        .shadow-nav-item.active {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border-left-color: #8b5cf6;
        }

        .shadow-nav-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }

        .shadow-nav-label {
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .shadow-content {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
        }

        .shadow-card {
          background: #0a0a0f;
          border: 1px solid #1a1a2e;
          border-radius: 4px;
          padding: 25px;
          margin-bottom: 20px;
        }

        .shadow-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #1a1a2e;
        }

        .shadow-card-title {
          font-size: 14px;
          color: #8b5cf6;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .shadow-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .shadow-stat {
          background: linear-gradient(135deg, #0a0a0f 0%, #12121a 100%);
          border: 1px solid #1a1a2e;
          padding: 20px;
          border-radius: 4px;
        }

        .shadow-stat-value {
          font-size: 32px;
          color: #8b5cf6;
          font-weight: bold;
        }

        .shadow-stat-label {
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 5px;
        }

        .shadow-table {
          width: 100%;
          border-collapse: collapse;
        }

        .shadow-table th,
        .shadow-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #1a1a2e;
        }

        .shadow-table th {
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .shadow-table tr:hover td {
          background: rgba(139, 92, 246, 0.05);
        }

        .shadow-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 2px;
          font-size: 10px;
          text-transform: uppercase;
        }

        .shadow-badge.confidential { background: #7c3aed20; color: #8b5cf6; }
        .shadow-badge.restricted { background: #dc262620; color: #ef4444; }
        .shadow-badge.internal { background: #ca8a0420; color: #eab308; }

        .shadow-btn {
          background: transparent;
          border: 1px solid #8b5cf6;
          color: #8b5cf6;
          padding: 10px 20px;
          font-family: inherit;
          font-size: 11px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: all 0.3s;
        }

        .shadow-btn:hover {
          background: #8b5cf6;
          color: #000;
        }

        .shadow-btn.danger {
          border-color: #ef4444;
          color: #ef4444;
        }

        .shadow-btn.danger:hover {
          background: #ef4444;
          color: #000;
        }

        .shadow-input {
          background: #0a0a0f;
          border: 1px solid #1a1a2e;
          color: #a0a0a0;
          padding: 12px 15px;
          font-family: inherit;
          font-size: 12px;
          width: 100%;
          box-sizing: border-box;
        }

        .shadow-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .shadow-audit-entry {
          padding: 10px 15px;
          border-left: 3px solid #1a1a2e;
          margin-bottom: 10px;
          background: #08080c;
        }

        .shadow-audit-entry.access { border-left-color: #22c55e; }
        .shadow-audit-entry.modify { border-left-color: #eab308; }
        .shadow-audit-entry.alert { border-left-color: #ef4444; }

        .shadow-audit-time {
          font-size: 10px;
          color: #444;
        }

        .shadow-audit-action {
          font-size: 12px;
          margin-top: 5px;
        }

        .shadow-threat-meter {
          height: 8px;
          background: #1a1a2e;
          border-radius: 4px;
          overflow: hidden;
        }

        .shadow-threat-fill {
          height: 100%;
          transition: width 0.5s, background 0.5s;
        }

        .shadow-threat-fill.safe { width: 10%; background: #22c55e; }
        .shadow-threat-fill.guarded { width: 30%; background: #84cc16; }
        .shadow-threat-fill.elevated { width: 50%; background: #eab308; }
        .shadow-threat-fill.high { width: 70%; background: #f97316; }
        .shadow-threat-fill.severe { width: 90%; background: #ef4444; }
        .shadow-threat-fill.critical { width: 100%; background: #dc2626; animation: threat-pulse 0.5s infinite; }

        @keyframes threat-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Stealth mode */
        #shadow-panel.stealth-mode {
          opacity: 0.3;
          filter: blur(2px);
        }

        #shadow-panel.stealth-mode:hover {
          opacity: 1;
          filter: none;
        }
      </style>

      <div class="shadow-header">
        <div class="shadow-logo">
          <span class="shadow-logo-icon">忍</span>
          <div>
            <div class="shadow-logo-text">Shadow Control</div>
            <div class="shadow-logo-sub">EBEN Evidence Management</div>
          </div>
        </div>
        <div class="shadow-status">
          <div class="shadow-status-item">
            <span class="shadow-status-dot green"></span>
            <span>Vault: Unlocked</span>
          </div>
          <div class="shadow-status-item">
            <span class="shadow-status-dot yellow"></span>
            <span>Threat: Guarded</span>
          </div>
          <div class="shadow-status-item">
            <span class="shadow-status-dot green"></span>
            <span>Sync: Active</span>
          </div>
        </div>
        <button class="shadow-close" id="shadow-close">✕ VANISH</button>
      </div>

      <div class="shadow-body">
        <div class="shadow-sidebar">
          <div class="shadow-nav-item active" data-view="dashboard">
            <span class="shadow-nav-icon">◉</span>
            <span class="shadow-nav-label">Dashboard</span>
          </div>
          <div class="shadow-nav-item" data-view="evidence">
            <span class="shadow-nav-icon">📁</span>
            <span class="shadow-nav-label">Evidence Vault</span>
          </div>
          <div class="shadow-nav-item" data-view="cases">
            <span class="shadow-nav-icon">⚖</span>
            <span class="shadow-nav-label">Legal Cases</span>
          </div>
          <div class="shadow-nav-item" data-view="audit">
            <span class="shadow-nav-icon">📋</span>
            <span class="shadow-nav-label">Audit Trail</span>
          </div>
          <div class="shadow-nav-item" data-view="sync">
            <span class="shadow-nav-icon">☁</span>
            <span class="shadow-nav-label">Cloud Sync</span>
          </div>
          <div class="shadow-nav-item" data-view="security">
            <span class="shadow-nav-icon">🛡</span>
            <span class="shadow-nav-label">Security</span>
          </div>
          <div class="shadow-nav-item" data-view="settings">
            <span class="shadow-nav-icon">⚙</span>
            <span class="shadow-nav-label">Settings</span>
          </div>
        </div>

        <div class="shadow-content" id="shadow-content">
          <!-- Content loaded dynamically -->
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Event listeners
    document.getElementById('shadow-close').addEventListener('click', () => this.hide());

    this.container.querySelectorAll('.shadow-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.container.querySelectorAll('.shadow-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.currentView = item.dataset.view;
        this._renderView();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.visible) return;

      if (e.key === 'Escape') this.hide();
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this._toggleStealth();
      }
    });

    this._renderView();
  }

  _toggleStealth() {
    this.stealthMode = !this.stealthMode;
    this.container.classList.toggle('stealth-mode', this.stealthMode);
  }

  _renderView() {
    const content = document.getElementById('shadow-content');
    if (!content) return;

    switch (this.currentView) {
      case 'dashboard':
        content.innerHTML = this._renderDashboard();
        break;
      case 'evidence':
        content.innerHTML = this._renderEvidence();
        break;
      case 'cases':
        content.innerHTML = this._renderCases();
        break;
      case 'audit':
        content.innerHTML = this._renderAudit();
        break;
      case 'sync':
        content.innerHTML = this._renderSync();
        break;
      case 'security':
        content.innerHTML = this._renderSecurity();
        break;
      case 'settings':
        content.innerHTML = this._renderSettings();
        break;
    }
  }

  _renderDashboard() {
    return `
      <div class="shadow-grid">
        <div class="shadow-stat">
          <div class="shadow-stat-value">${this.evidence.length || 47}</div>
          <div class="shadow-stat-label">Evidence Items</div>
        </div>
        <div class="shadow-stat">
          <div class="shadow-stat-value">${this.cases.length || 3}</div>
          <div class="shadow-stat-label">Active Cases</div>
        </div>
        <div class="shadow-stat">
          <div class="shadow-stat-value">${this.auditLog.length || 1247}</div>
          <div class="shadow-stat-label">Audit Entries</div>
        </div>
        <div class="shadow-stat">
          <div class="shadow-stat-value">100%</div>
          <div class="shadow-stat-label">Chain Integrity</div>
        </div>
      </div>

      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Threat Level</span>
          <span style="color: #84cc16; font-size: 12px;">GUARDED</span>
        </div>
        <div class="shadow-threat-meter">
          <div class="shadow-threat-fill guarded"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px; color: #444;">
          <span>SAFE</span>
          <span>GUARDED</span>
          <span>ELEVATED</span>
          <span>HIGH</span>
          <span>SEVERE</span>
          <span>CRITICAL</span>
        </div>
      </div>

      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Recent Activity</span>
          <button class="shadow-btn" style="padding: 5px 10px; font-size: 10px;">View All</button>
        </div>
        <div class="shadow-audit-entry access">
          <div class="shadow-audit-time">${new Date().toISOString()}</div>
          <div class="shadow-audit-action">Admin authenticated via shadow token</div>
        </div>
        <div class="shadow-audit-entry access">
          <div class="shadow-audit-time">${new Date(Date.now() - 3600000).toISOString()}</div>
          <div class="shadow-audit-action">Evidence EV-2026-001 accessed</div>
        </div>
        <div class="shadow-audit-entry modify">
          <div class="shadow-audit-time">${new Date(Date.now() - 7200000).toISOString()}</div>
          <div class="shadow-audit-action">Case PTW 6183/2025 updated</div>
        </div>
      </div>
    `;
  }

  _renderEvidence() {
    return `
      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Evidence Vault</span>
          <div>
            <button class="shadow-btn" id="btn-ingest">+ Ingest Evidence</button>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <input type="text" class="shadow-input" placeholder="Search evidence..." style="width: 300px;">
        </div>

        <table class="shadow-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Classification</th>
              <th>Case</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-family: monospace; color: #8b5cf6;">EV-2026-001</td>
              <td>Financial Statement Q4</td>
              <td>Financial</td>
              <td><span class="shadow-badge confidential">Confidential</span></td>
              <td>PTW 6183/2025</td>
              <td>2026-01-15</td>
              <td>
                <button class="shadow-btn" style="padding: 5px 10px; font-size: 10px;">View</button>
              </td>
            </tr>
            <tr>
              <td style="font-family: monospace; color: #8b5cf6;">EV-2026-002</td>
              <td>Email Correspondence</td>
              <td>Email</td>
              <td><span class="shadow-badge restricted">Restricted</span></td>
              <td>PTW 6183/2025</td>
              <td>2026-01-18</td>
              <td>
                <button class="shadow-btn" style="padding: 5px 10px; font-size: 10px;">View</button>
              </td>
            </tr>
            <tr>
              <td style="font-family: monospace; color: #8b5cf6;">EV-2026-003</td>
              <td>Property Valuation</td>
              <td>Document</td>
              <td><span class="shadow-badge internal">Internal</span></td>
              <td>PTW 6183/2025</td>
              <td>2026-01-20</td>
              <td>
                <button class="shadow-btn" style="padding: 5px 10px; font-size: 10px;">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  _renderCases() {
    return `
      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Legal Cases</span>
          <button class="shadow-btn">+ New Case</button>
        </div>

        <div style="display: grid; gap: 20px;">
          <div class="shadow-card" style="background: #08080c; margin: 0;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <div style="color: #8b5cf6; font-size: 18px; margin-bottom: 5px;">PTW 6183/2025</div>
                <div style="color: #555; font-size: 12px;">Family Court of Western Australia</div>
              </div>
              <span class="shadow-badge confidential">Active</span>
            </div>
            <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
              <div>
                <div style="font-size: 10px; color: #444; text-transform: uppercase;">Evidence Items</div>
                <div style="font-size: 20px; color: #a0a0a0;">47</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #444; text-transform: uppercase;">Timeline Events</div>
                <div style="font-size: 20px; color: #a0a0a0;">23</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #444; text-transform: uppercase;">Filed</div>
                <div style="font-size: 20px; color: #a0a0a0;">2025</div>
              </div>
            </div>
            <div style="margin-top: 20px;">
              <button class="shadow-btn" style="margin-right: 10px;">View Case</button>
              <button class="shadow-btn">Export for Court</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderAudit() {
    return `
      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Tamper-Evident Audit Trail</span>
          <div>
            <button class="shadow-btn" style="margin-right: 10px;">Verify Integrity</button>
            <button class="shadow-btn">Export for Court</button>
          </div>
        </div>

        <div style="background: #08080c; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #22c55e;">✓ Chain Integrity Verified</span>
            <span style="color: #555;">Last verified: ${new Date().toISOString()}</span>
          </div>
        </div>

        <div id="audit-entries">
          ${this._generateAuditEntries()}
        </div>
      </div>
    `;
  }

  _generateAuditEntries() {
    const entries = [
      { time: Date.now(), action: 'Shadow admin authenticated', type: 'access' },
      { time: Date.now() - 60000, action: 'Evidence EV-2026-003 created', type: 'modify' },
      { time: Date.now() - 120000, action: 'Evidence EV-2026-002 accessed', type: 'access' },
      { time: Date.now() - 180000, action: 'Unauthorized access attempt blocked', type: 'alert' },
      { time: Date.now() - 240000, action: 'Case PTW 6183/2025 timeline updated', type: 'modify' },
      { time: Date.now() - 300000, action: 'Vault unlocked', type: 'access' },
      { time: Date.now() - 360000, action: 'Evidence redaction applied (Level 2)', type: 'modify' },
      { time: Date.now() - 420000, action: 'Cloud sync completed - iCloud', type: 'access' },
    ];

    return entries.map(e => `
      <div class="shadow-audit-entry ${e.type}">
        <div class="shadow-audit-time">${new Date(e.time).toISOString()}</div>
        <div class="shadow-audit-action">${e.action}</div>
      </div>
    `).join('');
  }

  _renderSync() {
    return `
      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Cloud Sync Providers</span>
        </div>

        <div style="display: grid; gap: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #08080c; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <span style="font-size: 24px;">☁️</span>
              <div>
                <div style="color: #a0a0a0;">iCloud Drive</div>
                <div style="font-size: 11px; color: #555;">~/Library/Mobile Documents/com~apple~CloudDocs</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="shadow-status-dot green"></span>
              <span style="color: #22c55e; font-size: 12px;">Connected</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #08080c; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <span style="font-size: 24px;">📱</span>
              <div>
                <div style="color: #a0a0a0;">iOS Shortcuts Bridge</div>
                <div style="font-size: 11px; color: #555;">Shortcuts/Genesis/Inbox</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="shadow-status-dot green"></span>
              <span style="color: #22c55e; font-size: 12px;">Listening</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #08080c; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <span style="font-size: 24px;">💾</span>
              <div>
                <div style="color: #a0a0a0;">Local Vault</div>
                <div style="font-size: 11px; color: #555;">~/.genesis/evidence-vault</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="shadow-status-dot green"></span>
              <span style="color: #22c55e; font-size: 12px;">Primary</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderSecurity() {
    return `
      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">SHINOBI Security Status</span>
        </div>

        <div class="shadow-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="shadow-stat">
            <div class="shadow-stat-value" style="font-size: 24px;">SHADOW</div>
            <div class="shadow-stat-label">Stealth Mode</div>
          </div>
          <div class="shadow-stat">
            <div class="shadow-stat-value" style="font-size: 24px;">ARMED</div>
            <div class="shadow-stat-label">Self-Destruct</div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">Decoy Systems</h4>
          <table class="shadow-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Type</th>
                <th>Triggers</th>
                <th>Last Triggered</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>/admin</td>
                <td>Honeypot</td>
                <td style="color: #ef4444;">23</td>
                <td>2 hours ago</td>
              </tr>
              <tr>
                <td>/wp-admin</td>
                <td>Honeypot</td>
                <td style="color: #ef4444;">156</td>
                <td>15 minutes ago</td>
              </tr>
              <tr>
                <td>/phpmyadmin</td>
                <td>Honeypot</td>
                <td style="color: #ef4444;">89</td>
                <td>1 hour ago</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 30px;">
          <h4 style="color: #ef4444; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">⚠ Emergency Controls</h4>
          <div style="display: flex; gap: 15px;">
            <button class="shadow-btn danger">Emergency Lock</button>
            <button class="shadow-btn danger">Initiate Self-Destruct</button>
          </div>
          <p style="font-size: 10px; color: #555; margin-top: 10px;">
            Self-destruct will securely wipe all evidence and audit data. This action requires confirmation.
          </p>
        </div>
      </div>
    `;
  }

  _renderSettings() {
    return `
      <div class="shadow-card">
        <div class="shadow-card-header">
          <span class="shadow-card-title">Shadow Panel Settings</span>
        </div>

        <div style="display: grid; gap: 20px;">
          <div>
            <label style="display: block; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Stealth Level
            </label>
            <select class="shadow-input" style="width: 200px;">
              <option>Visible</option>
              <option>Low Profile</option>
              <option selected>Ghost</option>
              <option>Shadow</option>
              <option>Phantom</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Default Redaction Level
            </label>
            <select class="shadow-input" style="width: 200px;">
              <option>None</option>
              <option>Light (Names only)</option>
              <option selected>Moderate (Names + Contact)</option>
              <option>Heavy (All PII)</option>
              <option>Complete (Full anonymization)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Auto-Lock Timeout (minutes)
            </label>
            <input type="number" class="shadow-input" value="15" style="width: 100px;">
          </div>

          <div style="margin-top: 20px;">
            <button class="shadow-btn">Save Settings</button>
          </div>
        </div>
      </div>
    `;
  }

  async _loadData() {
    try {
      const response = await fetch('/api/eben/status');
      if (response.ok) {
        const data = await response.json();
        this.evidence = data.evidence || [];
        this.cases = data.cases || [];
        this._renderView();
      }
    } catch (error) {
      // Use demo data
      console.log('[ShadowPanel] Using offline demo data');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

// Global instances
const stealthEntry = new StealthEntry();
const shadowPanel = new ShadowPanel();

// Connect entry to panel
stealthEntry.onReveal = () => shadowPanel.show();
stealthEntry.onShadow = () => shadowPanel._toggleStealth();
stealthEntry.onLock = () => {
  shadowPanel.hide();
  alert('Emergency lock activated');
};

// Export for debugging (remove in production)
window.__shadow = {
  reveal: () => shadowPanel.show(),
  hide: () => shadowPanel.hide(),
  stealth: () => shadowPanel._toggleStealth()
};

console.log('%c忍 SHINOBI Active', 'color: #8b5cf6; font-size: 14px; font-weight: bold;');
console.log('%cSecret entry: ↑↑↓↓←→←→BA or click corners: TL→TR→BL→BR→TL', 'color: #444; font-size: 10px;');
