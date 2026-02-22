/**
 * GENESIS 2.0 — Immersive Experience Module
 *
 * Enhances user immersion through:
 * - Command Palette (Cmd/Ctrl+K)
 * - Keyboard shortcuts
 * - Ambient animations
 * - Audio feedback
 * - Interactive visualizations
 *
 * GENESIS 2.0 — Forbidden Ninja City
 * Copyright 2025 murray-ux — Founder & Lead Developer
 */

// ═══════════════════════════════════════════════════════════════════════════
// Audio Engine — Subtle sound feedback
// ═══════════════════════════════════════════════════════════════════════════

const AudioEngine = {
  enabled: true,
  volume: 0.3,
  context: null,

  init() {
    // Lazy-init AudioContext on first user interaction
    const initContext = () => {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.removeEventListener('click', initContext);
      document.removeEventListener('keydown', initContext);
    };
    document.addEventListener('click', initContext, { once: true });
    document.addEventListener('keydown', initContext, { once: true });

    // Load preference
    this.enabled = localStorage.getItem('genesis_sound') !== 'false';
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('genesis_sound', this.enabled);
    return this.enabled;
  },

  // Generate tones programmatically (no external files needed)
  playTone(frequency, duration = 0.1, type = 'sine') {
    if (!this.enabled || !this.context) return;

    try {
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(this.volume * 0.5, this.context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

      oscillator.start(this.context.currentTime);
      oscillator.stop(this.context.currentTime + duration);
    } catch (e) {
      // Silently fail if audio not available
    }
  },

  // Preset sounds
  click() { this.playTone(800, 0.05, 'sine'); },
  success() {
    this.playTone(523, 0.1);
    setTimeout(() => this.playTone(659, 0.1), 100);
    setTimeout(() => this.playTone(784, 0.15), 200);
  },
  error() { this.playTone(200, 0.2, 'sawtooth'); },
  warning() { this.playTone(400, 0.15, 'triangle'); },
  notification() { this.playTone(880, 0.08); this.playTone(1100, 0.08); },
  open() { this.playTone(600, 0.08); },
  close() { this.playTone(400, 0.08); },
  type() { this.playTone(1200, 0.02, 'square'); }
};

// ═══════════════════════════════════════════════════════════════════════════
// Command Palette — Spotlight-style command interface (Cmd/Ctrl+K)
// ═══════════════════════════════════════════════════════════════════════════

const CommandPalette = {
  isOpen: false,
  selectedIndex: 0,
  commands: [],
  filteredCommands: [],

  init() {
    this.registerDefaultCommands();
    this.createDOM();
    this.bindEvents();
  },

  registerDefaultCommands() {
    this.commands = [
      // Navigation
      { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: '📊', action: () => router.navigate('dashboard') },
      { id: 'nav-pentagon', label: 'Go to Pentagon', category: 'Navigation', icon: '🏛️', action: () => router.navigate('pentagon') },
      { id: 'nav-evidence', label: 'Go to Evidence Manager', category: 'Navigation', icon: '📁', action: () => router.navigate('evidence') },
      { id: 'nav-security', label: 'Go to Security Scanner', category: 'Navigation', icon: '🛡️', action: () => router.navigate('security') },
      { id: 'nav-workflows', label: 'Go to Workflows', category: 'Navigation', icon: '⚡', action: () => router.navigate('workflows') },
      { id: 'nav-metrics', label: 'Go to Metrics', category: 'Navigation', icon: '📈', action: () => router.navigate('metrics') },
      { id: 'nav-terminal', label: 'Go to Terminal', category: 'Navigation', icon: '💻', action: () => router.navigate('terminal') },
      { id: 'nav-settings', label: 'Go to Settings', category: 'Navigation', icon: '⚙️', action: () => router.navigate('settings') },
      { id: 'nav-mabul', label: 'Go to MABUL Layer', category: 'Navigation', icon: '🕊️', action: () => router.navigate('mabul') },
      { id: 'nav-maestro', label: 'Go to MAESTRO', category: 'Navigation', icon: '🎭', action: () => router.navigate('maestro') },

      // Actions
      { id: 'action-refresh', label: 'Refresh Page', category: 'Actions', icon: '🔄', action: () => location.reload() },
      { id: 'action-fullscreen', label: 'Toggle Fullscreen', category: 'Actions', icon: '⛶', action: () => this.toggleFullscreen() },
      { id: 'action-login', label: 'Login / Authenticate', category: 'Actions', icon: '🔐', action: () => showLoginModal() },
      { id: 'action-logout', label: 'Logout', category: 'Actions', icon: '🔓', action: () => { api.logout(); updateAuthIndicator(false); toast.show({ type: 'info', title: 'Logged Out' }); } },

      // Evidence Actions
      { id: 'evidence-new', label: 'Create New Evidence', category: 'Evidence', icon: '➕', action: () => { router.navigate('evidence'); setTimeout(() => evidencePage.showNewModal(), 100); } },
      { id: 'evidence-scan', label: 'Run Security Scan', category: 'Security', icon: '🔍', action: () => { router.navigate('security'); setTimeout(() => securityPage.runScan(), 100); } },

      // System
      { id: 'sys-theme', label: 'Toggle Dark/Light Theme', category: 'System', icon: '🌓', action: () => this.toggleTheme() },
      { id: 'sys-sound', label: 'Toggle Sound Effects', category: 'System', icon: '🔊', action: () => { const enabled = AudioEngine.toggle(); toast.show({ type: 'info', title: enabled ? 'Sound Enabled' : 'Sound Disabled' }); } },
      { id: 'sys-shortcuts', label: 'Show Keyboard Shortcuts', category: 'System', icon: '⌨️', action: () => KeyboardShortcuts.showHelp() },

      // Quick Info
      { id: 'info-health', label: 'Check System Health', category: 'Info', icon: '💚', action: async () => { const h = await api.get('/health'); toast.show({ type: 'success', title: 'System Healthy', message: `Uptime: ${Math.round(h.uptime)}s` }); } },
      { id: 'info-metrics', label: 'Show Quick Metrics', category: 'Info', icon: '📊', action: async () => { const m = await api.get('/metrics'); toast.show({ type: 'info', title: 'Metrics', message: `Requests: ${m.requests?.total || 0}, Avg Latency: ${m.latency?.average || 0}ms` }); } },
    ];

    this.filteredCommands = [...this.commands];
  },

  createDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'command-palette-overlay';
    overlay.className = 'command-palette-overlay';
    overlay.innerHTML = `
      <div class="command-palette">
        <div class="command-palette-header">
          <span class="command-palette-icon">⌘</span>
          <input type="text" class="command-palette-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false" />
          <kbd class="command-palette-hint">ESC</kbd>
        </div>
        <div class="command-palette-results"></div>
        <div class="command-palette-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.input = overlay.querySelector('.command-palette-input');
    this.results = overlay.querySelector('.command-palette-results');
  },

  bindEvents() {
    // Global keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Overlay click to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Input events
    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.handleInputKey(e));
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.overlay.classList.add('active');
    this.input.value = '';
    this.selectedIndex = 0;
    this.filter();
    this.input.focus();
    AudioEngine.open();
  },

  close() {
    this.isOpen = false;
    this.overlay.classList.remove('active');
    AudioEngine.close();
  },

  filter() {
    const query = this.input.value.toLowerCase().trim();

    if (!query) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        cmd.id.includes(query)
      );
    }

    this.selectedIndex = 0;
    this.render();
  },

  render() {
    if (this.filteredCommands.length === 0) {
      this.results.innerHTML = '<div class="command-palette-empty">No commands found</div>';
      return;
    }

    // Group by category
    const groups = {};
    this.filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });

    let html = '';
    let globalIndex = 0;

    for (const [category, cmds] of Object.entries(groups)) {
      html += `<div class="command-palette-group"><span class="command-palette-group-label">${category}</span></div>`;
      cmds.forEach(cmd => {
        const selected = globalIndex === this.selectedIndex ? 'selected' : '';
        html += `
          <div class="command-palette-item ${selected}" data-index="${globalIndex}">
            <span class="command-palette-item-icon">${cmd.icon}</span>
            <span class="command-palette-item-label">${cmd.label}</span>
          </div>
        `;
        globalIndex++;
      });
    }

    this.results.innerHTML = html;

    // Click handlers
    this.results.querySelectorAll('.command-palette-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.execute();
      });
      item.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.updateSelection();
      });
    });
  },

  updateSelection() {
    this.results.querySelectorAll('.command-palette-item').forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
    });

    // Scroll into view
    const selected = this.results.querySelector('.command-palette-item.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  },

  handleInputKey(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
        this.updateSelection();
        AudioEngine.click();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        AudioEngine.click();
        break;
      case 'Enter':
        e.preventDefault();
        this.execute();
        break;
    }
  },

  execute() {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd) {
      this.close();
      AudioEngine.success();
      try {
        cmd.action();
      } catch (e) {
        console.error('Command failed:', e);
        toast.show({ type: 'error', title: 'Command Failed', message: e.message });
      }
    }
  },

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  },

  toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('genesis_theme', isLight ? 'light' : 'dark');
    toast.show({ type: 'info', title: isLight ? 'Light Theme' : 'Dark Theme' });
  },

  // Allow external command registration
  register(command) {
    this.commands.push(command);
    this.filteredCommands = [...this.commands];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Keyboard Shortcuts — Global hotkeys
// ═══════════════════════════════════════════════════════════════════════════

const KeyboardShortcuts = {
  shortcuts: [],

  init() {
    this.registerDefaults();
    document.addEventListener('keydown', (e) => this.handle(e));
  },

  registerDefaults() {
    this.shortcuts = [
      { key: '1', ctrl: true, label: 'Dashboard', action: () => router.navigate('dashboard') },
      { key: '2', ctrl: true, label: 'Pentagon', action: () => router.navigate('pentagon') },
      { key: '3', ctrl: true, label: 'Evidence', action: () => router.navigate('evidence') },
      { key: '4', ctrl: true, label: 'Security', action: () => router.navigate('security') },
      { key: '5', ctrl: true, label: 'Workflows', action: () => router.navigate('workflows') },
      { key: '6', ctrl: true, label: 'Metrics', action: () => router.navigate('metrics') },
      { key: '/', label: 'Focus Search / Command Palette', action: () => CommandPalette.open() },
      { key: '?', shift: true, label: 'Show Shortcuts Help', action: () => this.showHelp() },
      { key: 'r', ctrl: true, shift: true, label: 'Refresh Data', action: () => location.reload() },
      { key: 'f', ctrl: true, shift: true, label: 'Toggle Fullscreen', action: () => CommandPalette.toggleFullscreen() },
    ];
  },

  handle(e) {
    // Don't trigger when typing in inputs
    if (e.target.matches('input, textarea, [contenteditable]')) return;

    for (const shortcut of this.shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;

      if (e.key === shortcut.key && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        AudioEngine.click();
        shortcut.action();
        return;
      }
    }
  },

  showHelp() {
    const html = `
      <div class="shortcuts-help">
        <table class="shortcuts-table">
          <thead>
            <tr><th>Shortcut</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${this.shortcuts.map(s => {
              const keys = [];
              if (s.ctrl) keys.push('Ctrl');
              if (s.shift) keys.push('Shift');
              if (s.alt) keys.push('Alt');
              keys.push(s.key.toUpperCase());
              return `<tr><td><kbd>${keys.join(' + ')}</kbd></td><td>${s.label}</td></tr>`;
            }).join('')}
            <tr><td><kbd>Ctrl + K</kbd></td><td>Open Command Palette</td></tr>
            <tr><td><kbd>ESC</kbd></td><td>Close dialogs</td></tr>
          </tbody>
        </table>
      </div>
    `;

    modal.show({
      title: '⌨️ Keyboard Shortcuts',
      content: html,
      actions: [{ label: 'Close', primary: true, action: () => modal.hide() }]
    });
  },

  register(shortcut) {
    this.shortcuts.push(shortcut);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Ambient Animations — Subtle background effects
// ═══════════════════════════════════════════════════════════════════════════

const AmbientEffects = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  enabled: true,

  init() {
    this.enabled = localStorage.getItem('genesis_ambient') !== 'false';
    if (!this.enabled) return;

    this.createCanvas();
    this.createParticles();
    this.animate();

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  },

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'ambient-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      opacity: 0.4;
    `;
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  createParticles() {
    this.particles = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 25000);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#00d4ff' : '#7c3aed',
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  },

  animate() {
    if (!this.enabled) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    }

    // Draw connections between nearby particles
    this.ctx.globalAlpha = 0.1;
    this.ctx.strokeStyle = '#00d4ff';
    this.ctx.lineWidth = 0.5;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.globalAlpha = (1 - dist / 150) * 0.15;
          this.ctx.stroke();
        }
      }
    }

    this.ctx.globalAlpha = 1;
    this.animationId = requestAnimationFrame(() => this.animate());
  },

  pause() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  resume() {
    if (!this.animationId && this.enabled) {
      this.animate();
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('genesis_ambient', this.enabled);

    if (this.enabled) {
      this.canvas.style.display = 'block';
      this.resume();
    } else {
      this.canvas.style.display = 'none';
      this.pause();
    }

    return this.enabled;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Notification Center — Desktop notifications + in-app alerts
// ═══════════════════════════════════════════════════════════════════════════

const NotificationCenter = {
  permission: 'default',
  history: [],
  maxHistory: 50,

  async init() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      if (this.permission === 'default') {
        // Don't ask immediately, wait for user action
      }
    }

    // Listen for SSE events and show notifications
    if (typeof sse !== 'undefined') {
      sse.on('alert', (data) => this.notify(data));
      sse.on('security', (data) => this.notify({ ...data, type: 'warning', title: 'Security Alert' }));
    }
  },

  async requestPermission() {
    if ('Notification' in window && this.permission !== 'granted') {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
    return this.permission === 'granted';
  },

  notify({ title, message, type = 'info', sound = true, desktop = true }) {
    // Play sound
    if (sound) {
      switch (type) {
        case 'success': AudioEngine.success(); break;
        case 'error': AudioEngine.error(); break;
        case 'warning': AudioEngine.warning(); break;
        default: AudioEngine.notification();
      }
    }

    // In-app toast
    if (typeof toast !== 'undefined') {
      toast.show({ type, title, message });
    }

    // Desktop notification
    if (desktop && this.permission === 'granted' && document.hidden) {
      new Notification(`GENESIS: ${title}`, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'genesis-notification'
      });
    }

    // Add to history
    this.history.unshift({
      title,
      message,
      type,
      timestamp: Date.now()
    });

    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  },

  getHistory() {
    return this.history;
  },

  clearHistory() {
    this.history = [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// System Health Pulse — Real-time health indicator
// ═══════════════════════════════════════════════════════════════════════════

const HealthPulse = {
  indicator: null,
  status: 'unknown',
  lastCheck: null,
  interval: null,

  init() {
    this.createIndicator();
    this.startMonitoring();
  },

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'health-pulse';
    this.indicator.className = 'health-pulse';
    this.indicator.innerHTML = `
      <div class="health-pulse-ring"></div>
      <div class="health-pulse-dot"></div>
    `;
    this.indicator.title = 'System Health';

    // Insert near connection status
    const header = document.querySelector('.header-right');
    if (header) {
      header.insertBefore(this.indicator, header.firstChild);
    }
  },

  async check() {
    try {
      const health = await api.get('/health');
      this.status = health.status === 'healthy' ? 'healthy' : 'degraded';
      this.lastCheck = Date.now();
      this.updateUI();
    } catch (e) {
      this.status = 'unhealthy';
      this.updateUI();
    }
  },

  updateUI() {
    if (!this.indicator) return;

    this.indicator.className = `health-pulse ${this.status}`;
    this.indicator.title = `System: ${this.status.charAt(0).toUpperCase() + this.status.slice(1)}`;

    if (this.status === 'unhealthy') {
      NotificationCenter.notify({
        title: 'System Issue',
        message: 'Health check failed',
        type: 'error'
      });
    }
  },

  startMonitoring() {
    this.check();
    this.interval = setInterval(() => this.check(), 30000); // Every 30s
  },

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Focus Mode — Distraction-free interface
// ═══════════════════════════════════════════════════════════════════════════

const FocusMode = {
  active: false,

  toggle() {
    this.active = !this.active;
    document.body.classList.toggle('focus-mode', this.active);

    if (this.active) {
      AmbientEffects.pause();
      toast.show({ type: 'info', title: 'Focus Mode', message: 'Distractions minimized' });
    } else {
      if (AmbientEffects.enabled) AmbientEffects.resume();
      toast.show({ type: 'info', title: 'Focus Mode Off' });
    }

    return this.active;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Initialize All Immersive Features
// ═══════════════════════════════════════════════════════════════════════════

function initImmersive() {
  AudioEngine.init();
  CommandPalette.init();
  KeyboardShortcuts.init();
  AmbientEffects.init();
  NotificationCenter.init();
  HealthPulse.init();

  // Register focus mode command
  CommandPalette.register({
    id: 'sys-focus',
    label: 'Toggle Focus Mode',
    category: 'System',
    icon: '🎯',
    action: () => FocusMode.toggle()
  });

  // Register ambient toggle command
  CommandPalette.register({
    id: 'sys-ambient',
    label: 'Toggle Ambient Effects',
    category: 'System',
    icon: '✨',
    action: () => {
      const enabled = AmbientEffects.toggle();
      toast.show({ type: 'info', title: enabled ? 'Ambient Effects On' : 'Ambient Effects Off' });
    }
  });

  // Register notification permission command
  CommandPalette.register({
    id: 'sys-notifications',
    label: 'Enable Desktop Notifications',
    category: 'System',
    icon: '🔔',
    action: async () => {
      const granted = await NotificationCenter.requestPermission();
      toast.show({
        type: granted ? 'success' : 'warning',
        title: granted ? 'Notifications Enabled' : 'Notifications Denied'
      });
    }
  });

  console.log('[GENESIS] Immersive features initialized');
  console.log('[GENESIS] Press Cmd/Ctrl+K for command palette');
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImmersive);
} else {
  initImmersive();
}

// Export for external use
window.CommandPalette = CommandPalette;
window.KeyboardShortcuts = KeyboardShortcuts;
window.AudioEngine = AudioEngine;
window.AmbientEffects = AmbientEffects;
window.NotificationCenter = NotificationCenter;
window.HealthPulse = HealthPulse;
window.FocusMode = FocusMode;
