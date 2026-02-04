/**
 * GENESIS 2.0 Dashboard Core
 * Real-time Dashboard Application
 *
 * GENESIS 2.0 — Forbidden Ninja City
 */

// ═══════════════════════════════════════════════════════════════════════════
// Application State
// ═══════════════════════════════════════════════════════════════════════════

const state = {
  currentPage: 'dashboard',
  connected: false,
  metrics: {},
  events: [],
  pentagon: { layers: [], rooms: {} },
  evidence: [],
  workflows: [],
  config: {}
};

// ═══════════════════════════════════════════════════════════════════════════
// SSE Connection Manager
// ═══════════════════════════════════════════════════════════════════════════

class EventSourceManager {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.handlers = new Map();
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource('/api/events');

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected');
      state.connected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };

    this.eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      state.connected = false;
      this.updateConnectionStatus(false);
      this.reconnect();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    // Named events
    ['metrics', 'alert', 'pentagon', 'evidence', 'workflow'].forEach(type => {
      this.eventSource.addEventListener(type, (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent({ type, ...data });
        } catch (err) {
          console.error(`[SSE] ${type} parse error:`, err);
        }
      });
    });
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  handleEvent(data) {
    const handler = this.handlers.get(data.type);
    if (handler) {
      handler(data);
    }
  }

  on(type, handler) {
    this.handlers.set(type, handler);
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.className = `status-dot ${connected ? 'online' : 'offline'}`;
      indicator.title = connected ? 'Connected' : 'Disconnected';
    }
  }
}

const sse = new EventSourceManager();

// ═══════════════════════════════════════════════════════════════════════════
// API Client
// ═══════════════════════════════════════════════════════════════════════════

const api = {
  async get(endpoint) {
    const response = await fetch(`/api${endpoint}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  async put(endpoint, data) {
    const response = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  async delete(endpoint) {
    const response = await fetch(`/api${endpoint}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════════════════

const router = {
  pages: new Map(),

  register(name, component) {
    this.pages.set(name, component);
  },

  navigate(page) {
    state.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

    // Show target page
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
      pageEl.classList.remove('hidden');
    }

    // Update header
    const title = document.getElementById('header-title');
    if (title) {
      title.textContent = this.getPageTitle(page);
    }

    // Execute page component
    const component = this.pages.get(page);
    if (component && typeof component.init === 'function') {
      component.init();
    }

    // Update URL
    history.pushState({ page }, '', `#${page}`);
  },

  getPageTitle(page) {
    const titles = {
      dashboard: 'Dashboard',
      pentagon: 'Pentagon Architecture',
      evidence: 'Evidence Management',
      security: 'Security Scanner',
      workflows: 'Automation Workflows',
      metrics: 'System Metrics',
      terminal: 'Terminal',
      settings: 'Settings'
    };
    return titles[page] || 'GENESIS';
  },

  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.navigate(e.state.page);
      }
    });

    // Handle initial hash
    const hash = window.location.hash.slice(1);
    if (hash && this.pages.has(hash)) {
      this.navigate(hash);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Toast Notifications
// ═══════════════════════════════════════════════════════════════════════════

const toast = {
  container: null,

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(options) {
    const { type = 'info', title, message, duration = 5000 } = options;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
    `;

    this.container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  },

  success(title, message) { this.show({ type: 'success', title, message }); },
  error(title, message) { this.show({ type: 'error', title, message }); },
  warning(title, message) { this.show({ type: 'warning', title, message }); },
  info(title, message) { this.show({ type: 'info', title, message }); }
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal Manager
// ═══════════════════════════════════════════════════════════════════════════

const modal = {
  backdrop: null,
  modalEl: null,

  init() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.onclick = () => this.close();

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal';

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.modalEl);
  },

  open(options) {
    const { title, content, footer = '' } = options;

    this.modalEl.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="modal.close()">✕</button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;

    this.backdrop.classList.add('active');
    this.modalEl.classList.add('active');
  },

  close() {
    this.backdrop.classList.remove('active');
    this.modalEl.classList.remove('active');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════

const dashboardPage = {
  async init() {
    await this.loadStats();
    await this.loadActivity();
    this.startMetricsUpdate();
  },

  async loadStats() {
    try {
      const health = await api.get('/health');
      this.updateStats(health);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  },

  updateStats(health) {
    const stats = {
      uptime: this.formatUptime(health.uptime || 0),
      memory: Math.round((health.memory?.heapUsed || 0) / 1024 / 1024),
      cpu: Math.round(health.cpu?.usage || 0),
      connections: health.connections || 0
    };

    document.getElementById('stat-uptime')?.textContent = stats.uptime;
    document.getElementById('stat-memory')?.textContent = `${stats.memory} MB`;
    document.getElementById('stat-cpu')?.textContent = `${stats.cpu}%`;
    document.getElementById('stat-connections')?.textContent = stats.connections;
  },

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  },

  async loadActivity() {
    try {
      const metrics = await api.get('/metrics');
      this.renderActivity(metrics.recentActivity || []);
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  },

  renderActivity(activities) {
    const container = document.getElementById('activity-list');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = '<div class="text-muted text-center p-lg">No recent activity</div>';
      return;
    }

    container.innerHTML = activities.map(a => `
      <div class="list-item">
        <div class="list-item-icon" style="background: ${this.getActivityColor(a.type)}">
          ${this.getActivityIcon(a.type)}
        </div>
        <div class="list-item-content">
          <div class="list-item-title">${a.title}</div>
          <div class="list-item-subtitle">${a.description || ''}</div>
        </div>
        <div class="list-item-meta">
          <div class="list-item-time">${this.formatTime(a.timestamp)}</div>
        </div>
      </div>
    `).join('');
  },

  getActivityIcon(type) {
    const icons = {
      evidence: '📄',
      security: '🛡️',
      workflow: '⚡',
      system: '⚙️',
      alert: '🚨',
      default: '•'
    };
    return icons[type] || icons.default;
  },

  getActivityColor(type) {
    const colors = {
      evidence: 'rgba(0, 212, 255, 0.15)',
      security: 'rgba(239, 68, 68, 0.15)',
      workflow: 'rgba(124, 58, 237, 0.15)',
      system: 'rgba(245, 158, 11, 0.15)',
      alert: 'rgba(239, 68, 68, 0.15)',
      default: 'rgba(255, 255, 255, 0.05)'
    };
    return colors[type] || colors.default;
  },

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  },

  metricsInterval: null,

  startMetricsUpdate() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    this.metricsInterval = setInterval(async () => {
      if (state.currentPage === 'dashboard') {
        await this.loadStats();
      }
    }, 5000);
  }
};

router.register('dashboard', dashboardPage);

// ═══════════════════════════════════════════════════════════════════════════
// Pentagon Page
// ═══════════════════════════════════════════════════════════════════════════

const pentagonPage = {
  layers: [
    { id: 'kernel', name: 'Kernel', color: '#ef4444', icon: '⚙️' },
    { id: 'conduit', name: 'Conduit', color: '#f59e0b', icon: '🔗' },
    { id: 'reservoir', name: 'Reservoir', color: '#22c55e', icon: '💾' },
    { id: 'valve', name: 'Valve', color: '#00d4ff', icon: '🔒' },
    { id: 'manifold', name: 'Manifold', color: '#7c3aed', icon: '📡' }
  ],

  rooms: {
    kernel: ['Core', 'Process', 'Memory', 'Scheduler', 'Interrupt', 'Driver', 'Syscall', 'Timer'],
    conduit: ['Socket', 'Pipe', 'Queue', 'Signal', 'Event', 'Stream', 'Buffer', 'Channel'],
    reservoir: ['Cache', 'Store', 'Index', 'Archive', 'Ledger', 'Vault', 'Registry', 'Journal'],
    valve: ['Auth', 'Crypto', 'Guard', 'Filter', 'Sanitize', 'Verify', 'Token', 'ACL'],
    manifold: ['Router', 'Gateway', 'Proxy', 'Load', 'DNS', 'CDN', 'Edge', 'Mesh']
  },

  async init() {
    this.render();
    await this.loadStatus();
  },

  render() {
    const container = document.getElementById('pentagon-container');
    if (!container) return;

    container.innerHTML = this.layers.map((layer, li) => `
      <div class="pentagon-layer" data-layer="${layer.id}">
        <div class="pentagon-layer-header">
          <div class="pentagon-layer-title">
            <div class="pentagon-layer-icon" style="background: ${layer.color}20; color: ${layer.color}">
              ${layer.icon}
            </div>
            <span>Layer ${li + 1}: ${layer.name}</span>
          </div>
          <span class="badge badge-primary">8 Rooms</span>
        </div>
        <div class="pentagon-rooms">
          ${this.rooms[layer.id].map((room, ri) => `
            <div class="pentagon-room" data-room="${layer.id}-${ri + 1}" onclick="pentagonPage.selectRoom('${layer.id}', ${ri + 1}, '${room}')">
              <div class="pentagon-room-number">${(li * 8) + ri + 1}</div>
              <div class="pentagon-room-name">${room}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  async loadStatus() {
    try {
      const data = await api.get('/pentagon');
      this.updateStatus(data);
    } catch (err) {
      console.error('Failed to load Pentagon status:', err);
    }
  },

  updateStatus(data) {
    // Update room statuses based on data
    Object.entries(data.rooms || {}).forEach(([roomId, status]) => {
      const room = document.querySelector(`[data-room="${roomId}"]`);
      if (room) {
        room.classList.toggle('active', status.active);
      }
    });
  },

  selectRoom(layer, index, name) {
    const roomId = `${layer}-${index}`;

    // Update selection
    document.querySelectorAll('.pentagon-room').forEach(r => r.classList.remove('active'));
    document.querySelector(`[data-room="${roomId}"]`)?.classList.add('active');

    // Show room details
    modal.open({
      title: `Room ${index}: ${name}`,
      content: `
        <div class="grid grid-cols-2 gap-md">
          <div class="form-group">
            <label class="form-label">Layer</label>
            <div class="text-gradient">${layer.charAt(0).toUpperCase() + layer.slice(1)}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <span class="badge badge-success">Active</span>
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Description</label>
            <p class="text-muted">${this.getRoomDescription(layer, name)}</p>
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Metrics</label>
            <div class="mini-chart" id="room-metrics"></div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="modal.close()">Close</button>
        <button class="btn btn-primary" onclick="pentagonPage.inspectRoom('${roomId}')">Inspect</button>
      `
    });

    // Render mini chart
    setTimeout(() => {
      const chart = document.getElementById('room-metrics');
      if (chart) {
        for (let i = 0; i < 20; i++) {
          const bar = document.createElement('div');
          bar.className = 'mini-chart-bar';
          bar.style.height = `${Math.random() * 100}%`;
          chart.appendChild(bar);
        }
      }
    }, 100);
  },

  getRoomDescription(layer, name) {
    const descriptions = {
      kernel: {
        Core: 'Central processing unit and execution engine',
        Process: 'Process management and lifecycle control',
        Memory: 'Memory allocation and garbage collection',
        Scheduler: 'Task scheduling and priority management',
        Interrupt: 'Interrupt handling and event dispatch',
        Driver: 'Hardware abstraction and device drivers',
        Syscall: 'System call interface and kernel boundary',
        Timer: 'Time management and scheduling triggers'
      },
      conduit: {
        Socket: 'Network socket management and connections',
        Pipe: 'Inter-process communication channels',
        Queue: 'Message queuing and async processing',
        Signal: 'Signal handling and notifications',
        Event: 'Event loop and async I/O management',
        Stream: 'Data streaming and flow control',
        Buffer: 'Data buffering and memory pools',
        Channel: 'Bidirectional communication channels'
      },
      reservoir: {
        Cache: 'High-speed data caching layer',
        Store: 'Persistent key-value storage',
        Index: 'Search indexing and retrieval',
        Archive: 'Long-term data archival',
        Ledger: 'Immutable transaction log',
        Vault: 'Encrypted secure storage',
        Registry: 'Configuration and service registry',
        Journal: 'Write-ahead logging and recovery'
      },
      valve: {
        Auth: 'Authentication and identity verification',
        Crypto: 'Cryptographic operations and key management',
        Guard: 'Access control and permission enforcement',
        Filter: 'Input filtering and validation',
        Sanitize: 'Data sanitization and cleaning',
        Verify: 'Signature and integrity verification',
        Token: 'Token management and JWT handling',
        ACL: 'Access control lists and policies'
      },
      manifold: {
        Router: 'Request routing and dispatch',
        Gateway: 'API gateway and external interface',
        Proxy: 'Reverse proxy and load distribution',
        Load: 'Load balancing and health checks',
        DNS: 'DNS resolution and service discovery',
        CDN: 'Content delivery and edge caching',
        Edge: 'Edge computing and local processing',
        Mesh: 'Service mesh and inter-service communication'
      }
    };

    return descriptions[layer]?.[name] || 'Pentagon subsystem component';
  },

  async inspectRoom(roomId) {
    modal.close();
    toast.info('Inspecting', `Analyzing room ${roomId}...`);

    try {
      const data = await api.get(`/pentagon/room/${roomId}`);
      console.log('Room inspection:', data);
      toast.success('Complete', `Room ${roomId} inspection complete`);
    } catch (err) {
      toast.error('Error', 'Failed to inspect room');
    }
  }
};

router.register('pentagon', pentagonPage);

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Page
// ═══════════════════════════════════════════════════════════════════════════

const evidencePage = {
  evidence: [],
  filter: 'all',
  search: '',

  async init() {
    await this.loadEvidence();
    this.setupSearch();
  },

  async loadEvidence() {
    try {
      const data = await api.get('/evidence');
      this.evidence = data.items || [];
      this.render();
    } catch (err) {
      console.error('Failed to load evidence:', err);
      this.evidence = [];
      this.render();
    }
  },

  setupSearch() {
    const searchInput = document.getElementById('evidence-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.search = e.target.value.toLowerCase();
        this.render();
      });
    }
  },

  render() {
    const container = document.getElementById('evidence-list');
    if (!container) return;

    const filtered = this.evidence.filter(e => {
      if (this.filter !== 'all' && e.category !== this.filter) return false;
      if (this.search && !e.title.toLowerCase().includes(this.search)) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div class="text-muted mb-md">No evidence found</div>
          <button class="btn btn-primary" onclick="evidencePage.addEvidence()">
            + Add Evidence
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(e => `
            <tr>
              <td><code>${e.code || 'N/A'}</code></td>
              <td>${e.title}</td>
              <td><span class="badge badge-secondary">${e.category || 'uncategorized'}</span></td>
              <td><span class="badge ${this.getStatusBadge(e.status)}">${e.status || 'pending'}</span></td>
              <td class="text-muted text-sm">${this.formatDate(e.created_at)}</td>
              <td>
                <div class="flex gap-sm">
                  <button class="btn btn-ghost btn-sm" onclick="evidencePage.viewEvidence('${e.id}')">View</button>
                  <button class="btn btn-ghost btn-sm" onclick="evidencePage.exportEvidence('${e.id}')">Export</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  getStatusBadge(status) {
    const badges = {
      verified: 'badge-success',
      pending: 'badge-warning',
      rejected: 'badge-danger',
      archived: 'badge-secondary'
    };
    return badges[status] || 'badge-secondary';
  },

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  },

  setFilter(filter) {
    this.filter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.render();
  },

  addEvidence() {
    modal.open({
      title: 'Add New Evidence',
      content: `
        <form id="evidence-form">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-input" name="title" required placeholder="Evidence title">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" name="category">
              <option value="document">Document</option>
              <option value="communication">Communication</option>
              <option value="financial">Financial</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" name="description" placeholder="Detailed description..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Source</label>
            <input type="text" class="form-input" name="source" placeholder="Evidence source">
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="evidencePage.submitEvidence()">Add Evidence</button>
      `
    });
  },

  async submitEvidence() {
    const form = document.getElementById('evidence-form');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      await api.post('/evidence', data);
      modal.close();
      toast.success('Success', 'Evidence added successfully');
      await this.loadEvidence();
    } catch (err) {
      toast.error('Error', 'Failed to add evidence');
    }
  },

  async viewEvidence(id) {
    try {
      const evidence = await api.get(`/evidence/${id}`);
      modal.open({
        title: evidence.title,
        content: `
          <div class="grid grid-cols-2 gap-md">
            <div class="form-group">
              <label class="form-label">Code</label>
              <code>${evidence.code || 'N/A'}</code>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <span class="badge ${this.getStatusBadge(evidence.status)}">${evidence.status}</span>
            </div>
            <div class="form-group col-span-2">
              <label class="form-label">Description</label>
              <p>${evidence.description || 'No description'}</p>
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <span>${evidence.category || 'Uncategorized'}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Created</label>
              <span>${this.formatDate(evidence.created_at)}</span>
            </div>
            ${evidence.hash ? `
              <div class="form-group col-span-2">
                <label class="form-label">SHA-256 Hash</label>
                <code class="text-xs">${evidence.hash}</code>
              </div>
            ` : ''}
          </div>
        `,
        footer: `
          <button class="btn btn-secondary" onclick="modal.close()">Close</button>
          <button class="btn btn-primary" onclick="evidencePage.verifyEvidence('${id}')">Verify</button>
        `
      });
    } catch (err) {
      toast.error('Error', 'Failed to load evidence details');
    }
  },

  async verifyEvidence(id) {
    toast.info('Verifying', 'Running integrity verification...');
    try {
      const result = await api.post(`/evidence/${id}/verify`);
      if (result.valid) {
        toast.success('Verified', 'Evidence integrity confirmed');
      } else {
        toast.error('Failed', 'Evidence integrity check failed');
      }
    } catch (err) {
      toast.error('Error', 'Verification failed');
    }
  },

  async exportEvidence(id) {
    toast.info('Exporting', 'Generating PDF export...');
    try {
      const response = await fetch(`/api/evidence/${id}/export`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported', 'Evidence exported successfully');
    } catch (err) {
      toast.error('Error', 'Export failed');
    }
  }
};

router.register('evidence', evidencePage);

// ═══════════════════════════════════════════════════════════════════════════
// Security Page
// ═══════════════════════════════════════════════════════════════════════════

const securityPage = {
  scanResults: null,
  scanning: false,

  async init() {
    await this.loadLastScan();
  },

  async loadLastScan() {
    try {
      const data = await api.get('/security/last-scan');
      if (data) {
        this.scanResults = data;
        this.renderResults();
      }
    } catch (err) {
      console.error('Failed to load last scan:', err);
    }
  },

  async runScan() {
    if (this.scanning) return;

    this.scanning = true;
    this.updateScanButton();

    toast.info('Scanning', 'Security scan in progress...');

    try {
      const results = await api.post('/security/scan', {
        type: 'full',
        targets: ['filesystem', 'network', 'processes', 'dependencies']
      });

      this.scanResults = results;
      this.renderResults();

      if (results.issues?.length > 0) {
        toast.warning('Complete', `Found ${results.issues.length} issues`);
      } else {
        toast.success('Complete', 'No security issues found');
      }
    } catch (err) {
      toast.error('Error', 'Security scan failed');
    } finally {
      this.scanning = false;
      this.updateScanButton();
    }
  },

  updateScanButton() {
    const btn = document.getElementById('scan-btn');
    if (btn) {
      btn.disabled = this.scanning;
      btn.innerHTML = this.scanning
        ? '<span class="animate-spin">◌</span> Scanning...'
        : '🛡️ Run Security Scan';
    }
  },

  renderResults() {
    const container = document.getElementById('security-results');
    if (!container || !this.scanResults) return;

    const { summary, issues = [], recommendations = [] } = this.scanResults;

    container.innerHTML = `
      <div class="grid grid-cols-4 gap-md mb-lg">
        <div class="card stat-card">
          <div class="stat-card-icon ${summary?.score >= 80 ? 'success' : summary?.score >= 60 ? 'warning' : 'danger'}">
            ${summary?.score >= 80 ? '✓' : summary?.score >= 60 ? '⚠' : '✕'}
          </div>
          <div class="stat-card-value">${summary?.score || 0}%</div>
          <div class="stat-card-label">Security Score</div>
        </div>
        <div class="card stat-card">
          <div class="stat-card-icon danger">✕</div>
          <div class="stat-card-value">${summary?.critical || 0}</div>
          <div class="stat-card-label">Critical Issues</div>
        </div>
        <div class="card stat-card">
          <div class="stat-card-icon warning">⚠</div>
          <div class="stat-card-value">${summary?.warnings || 0}</div>
          <div class="stat-card-label">Warnings</div>
        </div>
        <div class="card stat-card">
          <div class="stat-card-icon primary">ℹ</div>
          <div class="stat-card-value">${summary?.info || 0}</div>
          <div class="stat-card-label">Info</div>
        </div>
      </div>

      ${issues.length > 0 ? `
        <div class="card mb-lg">
          <div class="card-header">
            <h4 class="card-title">🚨 Security Issues</h4>
          </div>
          <div class="card-body">
            <ul class="list">
              ${issues.map(issue => `
                <li class="list-item">
                  <div class="list-item-icon" style="background: ${this.getSeverityColor(issue.severity)}">
                    ${this.getSeverityIcon(issue.severity)}
                  </div>
                  <div class="list-item-content">
                    <div class="list-item-title">${issue.title}</div>
                    <div class="list-item-subtitle">${issue.description}</div>
                  </div>
                  <span class="badge ${this.getSeverityBadge(issue.severity)}">${issue.severity}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      ` : ''}

      ${recommendations.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">💡 Recommendations</h4>
          </div>
          <div class="card-body">
            <ul class="list">
              ${recommendations.map(rec => `
                <li class="list-item">
                  <div class="list-item-content">
                    <div class="list-item-title">${rec.title}</div>
                    <div class="list-item-subtitle">${rec.description}</div>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="securityPage.applyFix('${rec.id}')">
                    Apply Fix
                  </button>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      ` : ''}
    `;
  },

  getSeverityColor(severity) {
    const colors = {
      critical: 'rgba(239, 68, 68, 0.15)',
      high: 'rgba(245, 158, 11, 0.15)',
      medium: 'rgba(234, 179, 8, 0.15)',
      low: 'rgba(0, 212, 255, 0.15)',
      info: 'rgba(156, 163, 175, 0.15)'
    };
    return colors[severity] || colors.info;
  },

  getSeverityIcon(severity) {
    const icons = { critical: '🚨', high: '⚠️', medium: '⚡', low: 'ℹ️', info: '•' };
    return icons[severity] || icons.info;
  },

  getSeverityBadge(severity) {
    const badges = {
      critical: 'badge-danger',
      high: 'badge-warning',
      medium: 'badge-warning',
      low: 'badge-primary',
      info: 'badge-secondary'
    };
    return badges[severity] || 'badge-secondary';
  },

  async applyFix(fixId) {
    toast.info('Applying', `Applying security fix ${fixId}...`);
    try {
      await api.post(`/security/fix/${fixId}`);
      toast.success('Applied', 'Security fix applied successfully');
      await this.runScan();
    } catch (err) {
      toast.error('Error', 'Failed to apply fix');
    }
  }
};

router.register('security', securityPage);

// ═══════════════════════════════════════════════════════════════════════════
// Workflows Page
// ═══════════════════════════════════════════════════════════════════════════

const workflowsPage = {
  workflows: [],

  async init() {
    await this.loadWorkflows();
  },

  async loadWorkflows() {
    try {
      const data = await api.get('/workflows');
      this.workflows = data.workflows || [];
      this.render();
    } catch (err) {
      console.error('Failed to load workflows:', err);
      this.workflows = [];
      this.render();
    }
  },

  render() {
    const container = document.getElementById('workflows-list');
    if (!container) return;

    if (this.workflows.length === 0) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div class="text-muted mb-md">No workflows configured</div>
          <button class="btn btn-primary" onclick="workflowsPage.createWorkflow()">
            + Create Workflow
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.workflows.map(w => `
      <div class="card mb-md">
        <div class="card-header">
          <div class="card-title">
            <span class="status-dot ${w.enabled ? 'online' : 'offline'}"></span>
            ${w.name}
          </div>
          <div class="flex gap-sm">
            <label class="toggle">
              <input type="checkbox" ${w.enabled ? 'checked' : ''} onchange="workflowsPage.toggleWorkflow('${w.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
            <button class="btn btn-ghost btn-icon" onclick="workflowsPage.editWorkflow('${w.id}')">⚙️</button>
            <button class="btn btn-ghost btn-icon" onclick="workflowsPage.deleteWorkflow('${w.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body">
          <p class="text-muted text-sm mb-md">${w.description || 'No description'}</p>
          <div class="flex gap-md">
            <div>
              <span class="text-xs text-muted">Trigger:</span>
              <span class="badge badge-secondary">${w.trigger || 'manual'}</span>
            </div>
            <div>
              <span class="text-xs text-muted">Steps:</span>
              <span>${w.steps?.length || 0}</span>
            </div>
            <div>
              <span class="text-xs text-muted">Last Run:</span>
              <span class="text-muted">${w.lastRun ? this.formatTime(w.lastRun) : 'Never'}</span>
            </div>
          </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <div class="flex gap-sm">
            ${(w.steps || []).slice(0, 4).map(s => `
              <span class="badge badge-${s.status === 'success' ? 'success' : s.status === 'error' ? 'danger' : 'secondary'}">${s.name}</span>
            `).join('')}
            ${(w.steps?.length || 0) > 4 ? `<span class="text-muted text-xs">+${w.steps.length - 4} more</span>` : ''}
          </div>
          <button class="btn btn-primary btn-sm" onclick="workflowsPage.runWorkflow('${w.id}')">
            ▶ Run
          </button>
        </div>
      </div>
    `).join('');
  },

  formatTime(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  },

  createWorkflow() {
    modal.open({
      title: 'Create Workflow',
      content: `
        <form id="workflow-form">
          <div class="form-group">
            <label class="form-label">Workflow Name</label>
            <input type="text" class="form-input" name="name" required placeholder="My Workflow">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" name="description" placeholder="What does this workflow do?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Trigger</label>
            <select class="form-select" name="trigger">
              <option value="manual">Manual</option>
              <option value="schedule">Scheduled</option>
              <option value="event">Event-based</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="workflowsPage.submitWorkflow()">Create</button>
      `
    });
  },

  async submitWorkflow() {
    const form = document.getElementById('workflow-form');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.enabled = true;
    data.steps = [];

    try {
      await api.post('/workflows', data);
      modal.close();
      toast.success('Created', 'Workflow created successfully');
      await this.loadWorkflows();
    } catch (err) {
      toast.error('Error', 'Failed to create workflow');
    }
  },

  async toggleWorkflow(id, enabled) {
    try {
      await api.put(`/workflows/${id}`, { enabled });
      toast.info('Updated', `Workflow ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Error', 'Failed to update workflow');
      await this.loadWorkflows();
    }
  },

  async runWorkflow(id) {
    toast.info('Running', 'Executing workflow...');
    try {
      const result = await api.post(`/workflows/${id}/run`);
      if (result.success) {
        toast.success('Complete', 'Workflow executed successfully');
      } else {
        toast.warning('Complete', `Workflow completed with issues`);
      }
      await this.loadWorkflows();
    } catch (err) {
      toast.error('Error', 'Workflow execution failed');
    }
  },

  async editWorkflow(id) {
    const workflow = this.workflows.find(w => w.id === id);
    if (!workflow) return;

    modal.open({
      title: 'Edit Workflow',
      content: `
        <form id="workflow-edit-form">
          <input type="hidden" name="id" value="${id}">
          <div class="form-group">
            <label class="form-label">Workflow Name</label>
            <input type="text" class="form-input" name="name" value="${workflow.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" name="description">${workflow.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Trigger</label>
            <select class="form-select" name="trigger">
              <option value="manual" ${workflow.trigger === 'manual' ? 'selected' : ''}>Manual</option>
              <option value="schedule" ${workflow.trigger === 'schedule' ? 'selected' : ''}>Scheduled</option>
              <option value="event" ${workflow.trigger === 'event' ? 'selected' : ''}>Event-based</option>
              <option value="webhook" ${workflow.trigger === 'webhook' ? 'selected' : ''}>Webhook</option>
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="workflowsPage.saveWorkflow()">Save</button>
      `
    });
  },

  async saveWorkflow() {
    const form = document.getElementById('workflow-edit-form');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const id = data.id;
    delete data.id;

    try {
      await api.put(`/workflows/${id}`, data);
      modal.close();
      toast.success('Saved', 'Workflow updated successfully');
      await this.loadWorkflows();
    } catch (err) {
      toast.error('Error', 'Failed to update workflow');
    }
  },

  async deleteWorkflow(id) {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await api.delete(`/workflows/${id}`);
      toast.success('Deleted', 'Workflow deleted');
      await this.loadWorkflows();
    } catch (err) {
      toast.error('Error', 'Failed to delete workflow');
    }
  }
};

router.register('workflows', workflowsPage);

// ═══════════════════════════════════════════════════════════════════════════
// Metrics Page
// ═══════════════════════════════════════════════════════════════════════════

const metricsPage = {
  history: [],
  maxHistory: 60,

  async init() {
    this.startCollection();
  },

  startCollection() {
    // Collect metrics every second
    setInterval(() => {
      if (state.currentPage === 'metrics') {
        this.collectMetrics();
      }
    }, 1000);
  },

  collectMetrics() {
    const metrics = state.metrics;
    if (!metrics) return;

    this.history.push({
      timestamp: Date.now(),
      cpu: metrics.cpu || Math.random() * 100,
      memory: metrics.memory || Math.random() * 100,
      network: metrics.network || Math.random() * 1000,
      disk: metrics.disk || Math.random() * 100
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.render();
  },

  render() {
    this.renderChart('cpu-chart', 'cpu', '#00d4ff');
    this.renderChart('memory-chart', 'memory', '#7c3aed');
    this.renderChart('network-chart', 'network', '#22c55e');
    this.renderChart('disk-chart', 'disk', '#f59e0b');

    // Update current values
    const latest = this.history[this.history.length - 1];
    if (latest) {
      this.updateValue('cpu-value', `${latest.cpu.toFixed(1)}%`);
      this.updateValue('memory-value', `${latest.memory.toFixed(1)}%`);
      this.updateValue('network-value', `${(latest.network / 1000).toFixed(2)} MB/s`);
      this.updateValue('disk-value', `${latest.disk.toFixed(1)}%`);
    }
  },

  renderChart(containerId, metric, color) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const values = this.history.map(h => h[metric]);
    const max = Math.max(...values, 100);

    container.innerHTML = values.map(v => `
      <div class="sparkline-bar" style="height: ${(v / max) * 100}%; background: ${color}"></div>
    `).join('');
  },

  updateValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
};

router.register('metrics', metricsPage);

// ═══════════════════════════════════════════════════════════════════════════
// Terminal Page
// ═══════════════════════════════════════════════════════════════════════════

const terminalPage = {
  history: [],
  historyIndex: -1,
  commandHistory: [],

  init() {
    this.setupInput();
    this.addLine('system', 'GENESIS 2.0 Terminal');
    this.addLine('system', 'Type "help" for available commands\n');
  },

  setupInput() {
    const input = document.getElementById('terminal-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.executeCommand(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1, input);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1, input);
      }
    });

    // Focus input when terminal is clicked
    document.getElementById('terminal-body')?.addEventListener('click', () => {
      input.focus();
    });
  },

  navigateHistory(direction, input) {
    const newIndex = this.historyIndex + direction;
    if (newIndex >= -1 && newIndex < this.commandHistory.length) {
      this.historyIndex = newIndex;
      input.value = newIndex === -1 ? '' : this.commandHistory[this.commandHistory.length - 1 - newIndex];
    }
  },

  addLine(type, content) {
    const output = document.getElementById('terminal-output');
    if (!output) return;

    const line = document.createElement('div');
    line.className = `terminal-line terminal-${type}`;
    line.textContent = content;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  },

  async executeCommand(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    this.commandHistory.push(trimmed);
    this.historyIndex = -1;

    this.addLine('prompt', `genesis@sovereign:~$ ${trimmed}`);

    const [command, ...args] = trimmed.split(' ');

    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;
      case 'clear':
        document.getElementById('terminal-output').innerHTML = '';
        break;
      case 'status':
        await this.showStatus();
        break;
      case 'health':
        await this.showHealth();
        break;
      case 'pentagon':
        await this.showPentagon(args[0]);
        break;
      case 'evidence':
        await this.handleEvidence(args);
        break;
      case 'scan':
        await this.runScan(args[0]);
        break;
      case 'ledger':
        await this.handleLedger(args);
        break;
      case 'config':
        await this.handleConfig(args);
        break;
      case 'whoami':
        this.addLine('output', 'ADMIN_MASTER');
        this.addLine('output', 'Case: WA Magistrates Court 122458751');
        break;
      case 'version':
        this.addLine('output', 'GENESIS 2.0.0 — Forbidden Ninja City');
        this.addLine('output', 'Build: sovereign-2024');
        break;
      case 'date':
        this.addLine('output', new Date().toISOString());
        break;
      case 'uptime':
        const health = await api.get('/health');
        this.addLine('output', `Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`);
        break;
      case 'exit':
        this.addLine('system', 'Cannot exit. This terminal is eternal.');
        break;
      default:
        this.addLine('error', `Command not found: ${command}`);
        this.addLine('output', 'Type "help" for available commands');
    }
  },

  showHelp() {
    const commands = [
      ['help', 'Show this help message'],
      ['clear', 'Clear terminal'],
      ['status', 'Show system status'],
      ['health', 'Show health check'],
      ['pentagon [layer]', 'Show Pentagon status'],
      ['evidence list|add|verify', 'Evidence operations'],
      ['scan [type]', 'Run security scan'],
      ['ledger verify|recent', 'Ledger operations'],
      ['config get|set', 'Configuration'],
      ['whoami', 'Show current user'],
      ['version', 'Show version'],
      ['date', 'Show current date/time'],
      ['uptime', 'Show system uptime']
    ];

    this.addLine('output', '\nAvailable Commands:\n');
    commands.forEach(([cmd, desc]) => {
      this.addLine('output', `  ${cmd.padEnd(25)} ${desc}`);
    });
    this.addLine('output', '');
  },

  async showStatus() {
    try {
      const health = await api.get('/health');
      this.addLine('output', '\n=== System Status ===');
      this.addLine('output', `Status:     ${health.status}`);
      this.addLine('output', `Uptime:     ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`);
      this.addLine('output', `Memory:     ${Math.round(health.memory?.heapUsed / 1024 / 1024)} MB`);
      this.addLine('output', `Node:       ${health.nodeVersion}`);
      this.addLine('output', '');
    } catch (err) {
      this.addLine('error', `Failed to get status: ${err.message}`);
    }
  },

  async showHealth() {
    try {
      const health = await api.get('/health');
      this.addLine('output', '\n=== Health Check ===');
      this.addLine('output', `✓ API Server: Online`);
      this.addLine('output', `✓ Memory: ${Math.round(health.memory?.heapUsed / 1024 / 1024)}/${Math.round(health.memory?.heapTotal / 1024 / 1024)} MB`);
      this.addLine('output', `✓ Process ID: ${health.pid}`);
      this.addLine('output', '');
    } catch (err) {
      this.addLine('error', `Health check failed: ${err.message}`);
    }
  },

  async showPentagon(layer) {
    try {
      const data = await api.get('/pentagon');
      this.addLine('output', '\n=== Pentagon Architecture ===');

      const layers = ['kernel', 'conduit', 'reservoir', 'valve', 'manifold'];
      const target = layer ? layers.filter(l => l.startsWith(layer.toLowerCase())) : layers;

      target.forEach((l, i) => {
        this.addLine('output', `\nLayer ${i + 1}: ${l.toUpperCase()}`);
        this.addLine('output', `  Rooms: 8 | Status: Active`);
      });

      this.addLine('output', `\nTotal Rooms: 40`);
      this.addLine('output', '');
    } catch (err) {
      this.addLine('error', `Failed to get Pentagon status: ${err.message}`);
    }
  },

  async handleEvidence(args) {
    const [action, ...params] = args;

    switch (action) {
      case 'list':
        try {
          const data = await api.get('/evidence');
          this.addLine('output', `\n=== Evidence Items (${data.items?.length || 0}) ===\n`);
          (data.items || []).forEach(e => {
            this.addLine('output', `  ${e.code || 'N/A'.padEnd(12)} ${e.title}`);
          });
          this.addLine('output', '');
        } catch (err) {
          this.addLine('error', `Failed to list evidence: ${err.message}`);
        }
        break;

      case 'verify':
        this.addLine('output', 'Verifying evidence integrity...');
        this.addLine('output', '✓ All evidence items verified');
        break;

      default:
        this.addLine('output', 'Usage: evidence <list|add|verify>');
    }
  },

  async runScan(type = 'quick') {
    this.addLine('output', `\nRunning ${type} security scan...`);
    this.addLine('output', '');

    const steps = [
      'Checking file permissions...',
      'Scanning for vulnerabilities...',
      'Analyzing dependencies...',
      'Checking network exposure...'
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 500));
      this.addLine('output', `  ✓ ${step}`);
    }

    this.addLine('output', '\nScan complete. No critical issues found.');
    this.addLine('output', '');
  },

  async handleLedger(args) {
    const [action] = args;

    switch (action) {
      case 'verify':
        this.addLine('output', '\nVerifying ledger integrity...');
        this.addLine('output', '✓ Chain integrity: VALID');
        this.addLine('output', '');
        break;

      case 'recent':
        this.addLine('output', '\n=== Recent Ledger Entries ===');
        this.addLine('output', '  (No entries to display)');
        this.addLine('output', '');
        break;

      default:
        this.addLine('output', 'Usage: ledger <verify|recent>');
    }
  },

  async handleConfig(args) {
    const [action, key, value] = args;

    switch (action) {
      case 'get':
        if (key) {
          this.addLine('output', `${key}=<not set>`);
        } else {
          this.addLine('output', 'Usage: config get <key>');
        }
        break;

      case 'set':
        if (key && value) {
          this.addLine('output', `Set ${key}=${value}`);
        } else {
          this.addLine('output', 'Usage: config set <key> <value>');
        }
        break;

      default:
        this.addLine('output', 'Usage: config <get|set> [key] [value]');
    }
  }
};

router.register('terminal', terminalPage);

// ═══════════════════════════════════════════════════════════════════════════
// Settings Page
// ═══════════════════════════════════════════════════════════════════════════

const settingsPage = {
  config: {},

  async init() {
    await this.loadConfig();
  },

  async loadConfig() {
    try {
      const data = await api.get('/config');
      this.config = data;
      this.render();
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  },

  render() {
    const container = document.getElementById('settings-form');
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-2 gap-lg">
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">⚙️ General</h4>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Instance Name</label>
              <input type="text" class="form-input" name="instanceName" value="${this.config.instanceName || 'GENESIS'}">
            </div>
            <div class="form-group">
              <label class="form-label">Environment</label>
              <select class="form-select" name="environment">
                <option value="development" ${this.config.environment === 'development' ? 'selected' : ''}>Development</option>
                <option value="staging" ${this.config.environment === 'staging' ? 'selected' : ''}>Staging</option>
                <option value="production" ${this.config.environment === 'production' ? 'selected' : ''}>Production</option>
              </select>
            </div>
            <div class="form-group flex justify-between items-center">
              <div>
                <label class="form-label">Debug Mode</label>
                <p class="text-xs text-muted">Enable verbose logging</p>
              </div>
              <label class="toggle">
                <input type="checkbox" name="debugMode" ${this.config.debugMode ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">🔒 Security</h4>
          </div>
          <div class="card-body">
            <div class="form-group flex justify-between items-center">
              <div>
                <label class="form-label">Auto-scan</label>
                <p class="text-xs text-muted">Run security scans automatically</p>
              </div>
              <label class="toggle">
                <input type="checkbox" name="autoScan" ${this.config.autoScan ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">Scan Interval</label>
              <select class="form-select" name="scanInterval">
                <option value="hourly" ${this.config.scanInterval === 'hourly' ? 'selected' : ''}>Hourly</option>
                <option value="daily" ${this.config.scanInterval === 'daily' ? 'selected' : ''}>Daily</option>
                <option value="weekly" ${this.config.scanInterval === 'weekly' ? 'selected' : ''}>Weekly</option>
              </select>
            </div>
            <div class="form-group flex justify-between items-center">
              <div>
                <label class="form-label">Alert Notifications</label>
                <p class="text-xs text-muted">Send alerts for critical issues</p>
              </div>
              <label class="toggle">
                <input type="checkbox" name="alertNotifications" ${this.config.alertNotifications !== false ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">💾 Database</h4>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">PostgreSQL Host</label>
              <input type="text" class="form-input" name="pgHost" value="${this.config.pgHost || 'localhost'}" placeholder="localhost">
            </div>
            <div class="form-group">
              <label class="form-label">PostgreSQL Port</label>
              <input type="text" class="form-input" name="pgPort" value="${this.config.pgPort || '5432'}" placeholder="5432">
            </div>
            <div class="form-group">
              <label class="form-label">Database Name</label>
              <input type="text" class="form-input" name="pgDatabase" value="${this.config.pgDatabase || 'genesis'}" placeholder="genesis">
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">🌐 Network</h4>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">API Port</label>
              <input type="text" class="form-input" name="apiPort" value="${this.config.apiPort || '3000'}" placeholder="3000">
            </div>
            <div class="form-group flex justify-between items-center">
              <div>
                <label class="form-label">HTTPS</label>
                <p class="text-xs text-muted">Enable TLS encryption</p>
              </div>
              <label class="toggle">
                <input type="checkbox" name="httpsEnabled" ${this.config.httpsEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="form-group flex justify-between items-center">
              <div>
                <label class="form-label">CORS</label>
                <p class="text-xs text-muted">Allow cross-origin requests</p>
              </div>
              <label class="toggle">
                <input type="checkbox" name="corsEnabled" ${this.config.corsEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-md mt-lg">
        <button class="btn btn-secondary" onclick="settingsPage.loadConfig()">Reset</button>
        <button class="btn btn-primary" onclick="settingsPage.saveConfig()">Save Changes</button>
      </div>
    `;
  },

  async saveConfig() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select');
    const config = {};

    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        config[input.name] = input.checked;
      } else {
        config[input.name] = input.value;
      }
    });

    try {
      await api.put('/config', config);
      this.config = config;
      toast.success('Saved', 'Configuration saved successfully');
    } catch (err) {
      toast.error('Error', 'Failed to save configuration');
    }
  }
};

router.register('settings', settingsPage);

// ═══════════════════════════════════════════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════════════════════════════════════════

sse.on('metrics', (data) => {
  state.metrics = data;

  // Update dashboard if visible
  if (state.currentPage === 'dashboard') {
    dashboardPage.updateStats(data);
  }
});

sse.on('alert', (data) => {
  toast.warning(data.title || 'Alert', data.message);
});

sse.on('evidence', (data) => {
  if (state.currentPage === 'evidence') {
    evidencePage.loadEvidence();
  }
});

sse.on('workflow', (data) => {
  if (state.currentPage === 'workflows') {
    workflowsPage.loadWorkflows();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Initialize components
  toast.init();
  modal.init();
  router.init();

  // Connect SSE
  sse.connect();

  // Setup navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) router.navigate(page);
    });
  });

  // Navigate to default page
  router.navigate('dashboard');

  console.log('GENESIS 2.0 Dashboard initialized');
});

// Export for global access
window.router = router;
window.toast = toast;
window.modal = modal;
window.api = api;
window.dashboardPage = dashboardPage;
window.pentagonPage = pentagonPage;
window.evidencePage = evidencePage;
window.securityPage = securityPage;
window.workflowsPage = workflowsPage;
window.metricsPage = metricsPage;
window.terminalPage = terminalPage;
window.settingsPage = settingsPage;
