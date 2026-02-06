/**
 * GENESIS 2.0 — Data Visualization & Widgets Module
 *
 * Real-time visualizations:
 * - Animated gauges with needles
 * - Sparkline charts
 * - Mini bar charts
 * - Live network graphs
 * - Draggable dashboard widgets
 * - Notification center panel
 * - Rich tooltips with previews
 * - Animated activity timeline
 * - File upload with preview
 * - Theme customizer
 *
 * GENESIS 2.0 — Forbidden Ninja City
 * Copyright 2025 Murray Bembrick — Founder & Lead Developer
 */

// ═══════════════════════════════════════════════════════════════════════════
// Animated Gauges — Real-time circular/linear gauges
// ═══════════════════════════════════════════════════════════════════════════

const Gauges = {
  instances: new Map(),

  create(container, options = {}) {
    const {
      type = 'circular', // circular, linear, semi
      min = 0,
      max = 100,
      value = 0,
      label = '',
      unit = '%',
      thresholds = { warning: 70, danger: 90 },
      size = 120,
      animated = true,
      showValue = true,
      glowEffect = true
    } = options;

    const id = container.id || `gauge-${Date.now()}`;
    container.classList.add('gauge-container', `gauge-${type}`);

    if (type === 'circular' || type === 'semi') {
      this.createCircularGauge(container, { id, min, max, value, label, unit, thresholds, size, animated, showValue, glowEffect, type });
    } else {
      this.createLinearGauge(container, { id, min, max, value, label, unit, thresholds, size, animated, showValue });
    }

    const instance = {
      setValue: (newValue) => this.updateValue(id, newValue),
      getValue: () => this.instances.get(id)?.value || 0,
      setThresholds: (t) => { this.instances.get(id).thresholds = t; this.updateValue(id, this.instances.get(id).value); }
    };

    this.instances.set(id, { ...options, value, container, instance });
    return instance;
  },

  createCircularGauge(container, opts) {
    const { id, min, max, value, label, unit, thresholds, size, showValue, glowEffect, type } = opts;
    const isSemi = type === 'semi';
    const circumference = isSemi ? Math.PI * (size - 20) : 2 * Math.PI * ((size - 20) / 2);
    const rotation = isSemi ? 'rotate(-90deg)' : 'rotate(-90deg)';

    container.innerHTML = `
      <svg class="gauge-svg" width="${size}" height="${isSemi ? size / 2 + 20 : size}" viewBox="0 0 ${size} ${isSemi ? size / 2 + 20 : size}">
        <defs>
          <linearGradient id="gauge-gradient-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color: var(--color-accent-success)" />
            <stop offset="50%" style="stop-color: var(--color-accent-warning)" />
            <stop offset="100%" style="stop-color: var(--color-accent-danger)" />
          </linearGradient>
          <filter id="gauge-glow-${id}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle
          class="gauge-bg"
          cx="${size / 2}"
          cy="${isSemi ? size / 2 : size / 2}"
          r="${(size - 20) / 2}"
          stroke-dasharray="${isSemi ? circumference / 2 : circumference}"
          stroke-dashoffset="${isSemi ? -circumference / 4 : 0}"
          transform="${isSemi ? `rotate(180 ${size / 2} ${size / 2})` : ''}"
        />
        <circle
          class="gauge-progress"
          id="gauge-progress-${id}"
          cx="${size / 2}"
          cy="${isSemi ? size / 2 : size / 2}"
          r="${(size - 20) / 2}"
          stroke="url(#gauge-gradient-${id})"
          stroke-dasharray="${isSemi ? circumference / 2 : circumference}"
          stroke-dashoffset="${circumference}"
          transform="${isSemi ? `rotate(180 ${size / 2} ${size / 2})` : ''}"
          ${glowEffect ? `filter="url(#gauge-glow-${id})"` : ''}
        />
        <circle
          class="gauge-needle-pivot"
          cx="${size / 2}"
          cy="${isSemi ? size / 2 : size / 2}"
          r="6"
        />
      </svg>
      ${showValue ? `
        <div class="gauge-value-container">
          <span class="gauge-value" id="gauge-value-${id}">${value}</span>
          <span class="gauge-unit">${unit}</span>
        </div>
      ` : ''}
      ${label ? `<div class="gauge-label">${label}</div>` : ''}
      <div class="gauge-ticks">
        <span class="gauge-tick-min">${min}</span>
        <span class="gauge-tick-max">${max}</span>
      </div>
    `;

    this.updateValue(id, value);
  },

  createLinearGauge(container, opts) {
    const { id, min, max, value, label, unit, thresholds, showValue } = opts;

    container.innerHTML = `
      <div class="gauge-linear-container">
        ${label ? `<div class="gauge-linear-label">${label}</div>` : ''}
        <div class="gauge-linear-track">
          <div class="gauge-linear-fill" id="gauge-fill-${id}"></div>
          <div class="gauge-linear-marker gauge-warning" style="left: ${(thresholds.warning / max) * 100}%"></div>
          <div class="gauge-linear-marker gauge-danger" style="left: ${(thresholds.danger / max) * 100}%"></div>
        </div>
        ${showValue ? `
          <div class="gauge-linear-value">
            <span id="gauge-value-${id}">${value}</span>
            <span class="gauge-unit">${unit}</span>
          </div>
        ` : ''}
      </div>
    `;

    this.updateValue(id, value);
  },

  updateValue(id, newValue) {
    const gauge = this.instances.get(id);
    if (!gauge) return;

    const { min, max, thresholds, type } = gauge;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    const percentage = (clampedValue - min) / (max - min);

    gauge.value = clampedValue;

    // Determine color based on thresholds
    let colorClass = 'normal';
    if (clampedValue >= thresholds.danger) colorClass = 'danger';
    else if (clampedValue >= thresholds.warning) colorClass = 'warning';

    if (type === 'circular' || type === 'semi') {
      const progress = document.getElementById(`gauge-progress-${id}`);
      const valueEl = document.getElementById(`gauge-value-${id}`);
      if (progress) {
        const isSemi = type === 'semi';
        const size = gauge.size || 120;
        const circumference = isSemi ? Math.PI * (size - 20) / 2 : 2 * Math.PI * ((size - 20) / 2);
        const offset = circumference * (1 - percentage);
        progress.style.strokeDashoffset = offset;
        progress.classList.remove('normal', 'warning', 'danger');
        progress.classList.add(colorClass);
      }
      if (valueEl) {
        valueEl.textContent = Math.round(clampedValue);
        valueEl.className = `gauge-value ${colorClass}`;
      }
    } else {
      const fill = document.getElementById(`gauge-fill-${id}`);
      const valueEl = document.getElementById(`gauge-value-${id}`);
      if (fill) {
        fill.style.width = `${percentage * 100}%`;
        fill.classList.remove('normal', 'warning', 'danger');
        fill.classList.add(colorClass);
      }
      if (valueEl) {
        valueEl.textContent = Math.round(clampedValue);
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Sparklines — Compact inline charts
// ═══════════════════════════════════════════════════════════════════════════

const Sparklines = {
  create(container, data = [], options = {}) {
    const {
      type = 'line', // line, bar, area
      color = 'var(--color-accent-primary)',
      height = 40,
      width = 120,
      animated = true,
      showDots = false,
      showTooltip = true,
      fillOpacity = 0.2
    } = options;

    container.classList.add('sparkline-container');
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    if (type === 'bar') {
      this.createBarSparkline(container, data, { width, height, color, animated, maxVal, minVal, range, showTooltip });
    } else {
      this.createLineSparkline(container, data, { width, height, color, animated, maxVal, minVal, range, showDots, showTooltip, fillOpacity, type });
    }

    return {
      update: (newData) => {
        container.innerHTML = '';
        this.create(container, newData, options);
      }
    };
  },

  createLineSparkline(container, data, opts) {
    const { width, height, color, animated, maxVal, minVal, range, showDots, showTooltip, fillOpacity, type } = opts;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((val, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${padding + chartWidth},${height - padding} L ${padding},${height - padding} Z`;

    container.innerHTML = `
      <svg class="sparkline-svg" width="${width}" height="${height}">
        ${type === 'area' ? `<path class="sparkline-area" d="${areaD}" fill="${color}" fill-opacity="${fillOpacity}" />` : ''}
        <path class="sparkline-line ${animated ? 'animated' : ''}" d="${pathD}" stroke="${color}" fill="none" stroke-width="2" stroke-linecap="round" />
        ${showDots ? data.map((val, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
          return `<circle class="sparkline-dot" cx="${x}" cy="${y}" r="3" fill="${color}" />`;
        }).join('') : ''}
      </svg>
      ${showTooltip ? '<div class="sparkline-tooltip"></div>' : ''}
    `;

    if (showTooltip) {
      const tooltip = container.querySelector('.sparkline-tooltip');
      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const index = Math.round((x / width) * (data.length - 1));
        const value = data[Math.max(0, Math.min(index, data.length - 1))];
        tooltip.textContent = value;
        tooltip.style.left = `${x}px`;
        tooltip.classList.add('visible');
      });
      container.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    }
  },

  createBarSparkline(container, data, opts) {
    const { width, height, color, animated, maxVal, showTooltip } = opts;
    const barWidth = (width / data.length) - 2;

    container.innerHTML = `
      <svg class="sparkline-svg sparkline-bars" width="${width}" height="${height}">
        ${data.map((val, i) => {
          const barHeight = (val / maxVal) * (height - 4);
          const x = i * (barWidth + 2) + 1;
          const y = height - barHeight - 2;
          return `<rect class="sparkline-bar ${animated ? 'animated' : ''}" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2" style="animation-delay: ${i * 50}ms" data-value="${val}" />`;
        }).join('')}
      </svg>
      ${showTooltip ? '<div class="sparkline-tooltip"></div>' : ''}
    `;

    if (showTooltip) {
      const tooltip = container.querySelector('.sparkline-tooltip');
      container.querySelectorAll('.sparkline-bar').forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
          tooltip.textContent = bar.dataset.value;
          tooltip.style.left = `${parseFloat(bar.getAttribute('x')) + barWidth / 2}px`;
          tooltip.classList.add('visible');
        });
        bar.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });
      });
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Network Graph — Interactive node visualization
// ═══════════════════════════════════════════════════════════════════════════

const NetworkGraph = {
  create(container, options = {}) {
    const {
      nodes = [],
      edges = [],
      width = 400,
      height = 300,
      nodeRadius = 20,
      animated = true,
      interactive = true,
      physics = true
    } = options;

    container.classList.add('network-graph-container');
    container.innerHTML = `
      <svg class="network-graph-svg" width="${width}" height="${height}">
        <defs>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-border-emphasis)" />
          </marker>
        </defs>
        <g class="network-edges"></g>
        <g class="network-nodes"></g>
      </svg>
      <div class="network-tooltip"></div>
    `;

    const svg = container.querySelector('.network-graph-svg');
    const edgesG = container.querySelector('.network-edges');
    const nodesG = container.querySelector('.network-nodes');
    const tooltip = container.querySelector('.network-tooltip');

    // Initialize node positions if not set
    nodes.forEach((node, i) => {
      if (node.x === undefined) node.x = width / 2 + (Math.random() - 0.5) * width * 0.6;
      if (node.y === undefined) node.y = height / 2 + (Math.random() - 0.5) * height * 0.6;
      node.vx = 0;
      node.vy = 0;
    });

    // Render edges
    edges.forEach(edge => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('network-edge');
      line.dataset.source = edge.source;
      line.dataset.target = edge.target;
      if (edge.directed) line.setAttribute('marker-end', 'url(#arrowhead)');
      edgesG.appendChild(line);
    });

    // Render nodes
    nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('network-node');
      g.dataset.id = node.id;
      g.innerHTML = `
        <circle class="network-node-bg" r="${nodeRadius + 5}" fill="transparent" />
        <circle class="network-node-circle" r="${nodeRadius}" filter="url(#node-glow)" />
        <text class="network-node-label" dy="0.35em">${node.icon || node.label?.[0] || ''}</text>
      `;

      if (node.status) g.classList.add(`status-${node.status}`);

      // Interactivity
      if (interactive) {
        let dragging = false;
        g.addEventListener('mousedown', (e) => {
          dragging = true;
          g.classList.add('dragging');
        });

        svg.addEventListener('mousemove', (e) => {
          if (dragging) {
            const rect = svg.getBoundingClientRect();
            node.x = e.clientX - rect.left;
            node.y = e.clientY - rect.top;
            this.updatePositions(container, nodes, edges, nodeRadius);
          }
        });

        document.addEventListener('mouseup', () => {
          dragging = false;
          g.classList.remove('dragging');
        });

        g.addEventListener('mouseenter', () => {
          tooltip.innerHTML = `<strong>${node.label || node.id}</strong>${node.description ? `<br>${node.description}` : ''}`;
          tooltip.classList.add('visible');
        });

        g.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });
      }

      nodesG.appendChild(g);
    });

    // Physics simulation
    if (physics) {
      this.runPhysics(container, nodes, edges, nodeRadius, width, height);
    } else {
      this.updatePositions(container, nodes, edges, nodeRadius);
    }

    return {
      addNode: (node) => { nodes.push(node); /* re-render */ },
      removeNode: (id) => { /* remove and re-render */ },
      updateNode: (id, props) => {
        const node = nodes.find(n => n.id === id);
        if (node) Object.assign(node, props);
        this.updatePositions(container, nodes, edges, nodeRadius);
      }
    };
  },

  updatePositions(container, nodes, edges, nodeRadius) {
    const nodesG = container.querySelectorAll('.network-node');
    const edgesG = container.querySelectorAll('.network-edge');

    nodesG.forEach((g, i) => {
      const node = nodes[i];
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    });

    edgesG.forEach(line => {
      const source = nodes.find(n => n.id === line.dataset.source);
      const target = nodes.find(n => n.id === line.dataset.target);
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (dx / dist) * nodeRadius;
        const offsetY = (dy / dist) * nodeRadius;

        line.setAttribute('x1', source.x + offsetX);
        line.setAttribute('y1', source.y + offsetY);
        line.setAttribute('x2', target.x - offsetX);
        line.setAttribute('y2', target.y - offsetY);
      }
    });
  },

  runPhysics(container, nodes, edges, nodeRadius, width, height) {
    const iterations = 100;
    const repulsion = 5000;
    const attraction = 0.05;
    const damping = 0.9;

    const simulate = () => {
      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);

          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      // Attraction along edges
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          source.vx += dx * attraction;
          source.vy += dy * attraction;
          target.vx -= dx * attraction;
          target.vy -= dy * attraction;
        }
      });

      // Center gravity
      nodes.forEach(node => {
        node.vx += (width / 2 - node.x) * 0.01;
        node.vy += (height / 2 - node.y) * 0.01;
      });

      // Update positions
      nodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;

        // Keep in bounds
        node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, node.x));
        node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, node.y));
      });

      this.updatePositions(container, nodes, edges, nodeRadius);
    };

    // Run simulation
    for (let i = 0; i < iterations; i++) {
      simulate();
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Widgets — Draggable, resizable widget system
// ═══════════════════════════════════════════════════════════════════════════

const DashboardWidgets = {
  containers: new Map(),
  widgets: new Map(),

  init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.classList.add('widget-dashboard');
    this.containers.set(containerId, {
      element: container,
      layout: this.loadLayout(containerId) || []
    });

    // Make container a drop zone
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    return this;
  },

  register(type, config) {
    this.widgets.set(type, config);
  },

  add(containerId, widgetConfig) {
    const container = this.containers.get(containerId);
    if (!container) return;

    const {
      type,
      id = `widget-${Date.now()}`,
      title = 'Widget',
      x = 0,
      y = 0,
      width = 2,
      height = 2,
      data = {}
    } = widgetConfig;

    const widgetDef = this.widgets.get(type);
    if (!widgetDef) {
      console.warn(`Widget type "${type}" not registered`);
      return;
    }

    const widget = document.createElement('div');
    widget.className = 'dashboard-widget';
    widget.id = id;
    widget.draggable = true;
    widget.style.gridColumn = `span ${width}`;
    widget.style.gridRow = `span ${height}`;

    widget.innerHTML = `
      <div class="widget-header">
        <span class="widget-icon">${widgetDef.icon || '📊'}</span>
        <span class="widget-title">${title}</span>
        <div class="widget-actions">
          <button class="widget-action widget-refresh" title="Refresh">🔄</button>
          <button class="widget-action widget-settings" title="Settings">⚙️</button>
          <button class="widget-action widget-remove" title="Remove">✕</button>
        </div>
      </div>
      <div class="widget-content"></div>
      <div class="widget-resize-handle"></div>
    `;

    const content = widget.querySelector('.widget-content');

    // Render widget content
    if (widgetDef.render) {
      widgetDef.render(content, data);
    }

    // Drag handling
    widget.addEventListener('dragstart', (e) => {
      widget.classList.add('dragging');
      e.dataTransfer.setData('text/plain', id);
    });

    widget.addEventListener('dragend', () => {
      widget.classList.remove('dragging');
      this.saveLayout(containerId);
    });

    // Actions
    widget.querySelector('.widget-refresh').addEventListener('click', () => {
      if (widgetDef.refresh) {
        widget.classList.add('refreshing');
        Promise.resolve(widgetDef.refresh(content, data)).then(() => {
          widget.classList.remove('refreshing');
        });
      }
    });

    widget.querySelector('.widget-remove').addEventListener('click', () => {
      widget.classList.add('removing');
      setTimeout(() => {
        widget.remove();
        this.saveLayout(containerId);
      }, 300);
    });

    widget.querySelector('.widget-settings').addEventListener('click', () => {
      if (widgetDef.settings) {
        widgetDef.settings(widget, data);
      }
    });

    // Resize handling
    const resizeHandle = widget.querySelector('.widget-resize-handle');
    let resizing = false;
    let startWidth, startHeight, startX, startY;

    resizeHandle.addEventListener('mousedown', (e) => {
      resizing = true;
      startWidth = width;
      startHeight = height;
      startX = e.clientX;
      startY = e.clientY;
      widget.classList.add('resizing');
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const deltaX = Math.floor((e.clientX - startX) / 150);
      const deltaY = Math.floor((e.clientY - startY) / 100);
      const newWidth = Math.max(1, Math.min(4, startWidth + deltaX));
      const newHeight = Math.max(1, Math.min(4, startHeight + deltaY));
      widget.style.gridColumn = `span ${newWidth}`;
      widget.style.gridRow = `span ${newHeight}`;
    });

    document.addEventListener('mouseup', () => {
      if (resizing) {
        resizing = false;
        widget.classList.remove('resizing');
        this.saveLayout(containerId);
      }
    });

    container.element.appendChild(widget);
    this.saveLayout(containerId);

    return widget;
  },

  saveLayout(containerId) {
    const container = this.containers.get(containerId);
    if (!container) return;

    const layout = Array.from(container.element.querySelectorAll('.dashboard-widget')).map(w => ({
      id: w.id,
      width: parseInt(w.style.gridColumn.replace('span ', '')),
      height: parseInt(w.style.gridRow.replace('span ', ''))
    }));

    localStorage.setItem(`genesis_layout_${containerId}`, JSON.stringify(layout));
  },

  loadLayout(containerId) {
    try {
      return JSON.parse(localStorage.getItem(`genesis_layout_${containerId}`));
    } catch {
      return null;
    }
  }
};

// Register default widget types
DashboardWidgets.register('gauge', {
  icon: '⏱️',
  render: (container, data) => {
    Gauges.create(container, { value: data.value || 50, label: data.label || 'Metric' });
  },
  refresh: async (container, data) => {
    const newValue = Math.random() * 100;
    Gauges.instances.forEach(g => g.instance?.setValue?.(newValue));
  }
});

DashboardWidgets.register('sparkline', {
  icon: '📈',
  render: (container, data) => {
    const randomData = Array.from({ length: 20 }, () => Math.random() * 100);
    Sparklines.create(container, data.values || randomData, { type: data.type || 'area' });
  }
});

DashboardWidgets.register('stats', {
  icon: '📊',
  render: (container, data) => {
    container.innerHTML = `
      <div class="widget-stats">
        <div class="stat-item">
          <span class="stat-value">${data.value || '0'}</span>
          <span class="stat-label">${data.label || 'Total'}</span>
        </div>
        <div class="stat-change ${data.change >= 0 ? 'positive' : 'negative'}">
          ${data.change >= 0 ? '↑' : '↓'} ${Math.abs(data.change || 0)}%
        </div>
      </div>
    `;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Notification Center — Slide-out panel
// ═══════════════════════════════════════════════════════════════════════════

const NotificationPanel = {
  isOpen: false,
  notifications: [],
  panel: null,

  init() {
    this.createPanel();
    this.bindEvents();

    // Load from NotificationCenter if available
    if (typeof NotificationCenter !== 'undefined') {
      this.notifications = NotificationCenter.history || [];
    }
  },

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'notification-panel';
    this.panel.innerHTML = `
      <div class="notification-panel-header">
        <h3>Notifications</h3>
        <div class="notification-panel-actions">
          <button class="btn-ghost" id="notif-mark-read">Mark all read</button>
          <button class="btn-ghost" id="notif-close">✕</button>
        </div>
      </div>
      <div class="notification-panel-filters">
        <button class="notif-filter active" data-filter="all">All</button>
        <button class="notif-filter" data-filter="unread">Unread</button>
        <button class="notif-filter" data-filter="alerts">Alerts</button>
      </div>
      <div class="notification-panel-list"></div>
      <div class="notification-panel-empty">
        <span class="empty-icon">🔔</span>
        <span>No notifications</span>
      </div>
    `;

    document.body.appendChild(this.panel);

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'notification-panel-overlay';
    document.body.appendChild(this.overlay);
  },

  bindEvents() {
    this.panel.querySelector('#notif-close').addEventListener('click', () => this.close());
    this.panel.querySelector('#notif-mark-read').addEventListener('click', () => this.markAllRead());
    this.overlay.addEventListener('click', () => this.close());

    this.panel.querySelectorAll('.notif-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panel.querySelectorAll('.notif-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render(btn.dataset.filter);
      });
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.overlay.classList.add('visible');
    this.render();
    AudioEngine?.open?.();
  },

  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.overlay.classList.remove('visible');
    AudioEngine?.close?.();
  },

  add(notification) {
    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
      read: false,
      ...notification
    };
    this.notifications.unshift(notif);
    if (this.isOpen) this.render();
    this.updateBadge();
    return notif.id;
  },

  render(filter = 'all') {
    const list = this.panel.querySelector('.notification-panel-list');
    const empty = this.panel.querySelector('.notification-panel-empty');

    let filtered = this.notifications;
    if (filter === 'unread') filtered = filtered.filter(n => !n.read);
    if (filter === 'alerts') filtered = filtered.filter(n => n.type === 'warning' || n.type === 'error');

    if (filtered.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = filtered.map(notif => `
      <div class="notification-item ${notif.read ? 'read' : 'unread'} ${notif.type || 'info'}" data-id="${notif.id}">
        <div class="notification-icon">${this.getIcon(notif.type)}</div>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          ${notif.message ? `<div class="notification-message">${notif.message}</div>` : ''}
          <div class="notification-time">${this.formatTime(notif.timestamp)}</div>
        </div>
        <button class="notification-dismiss">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        this.markRead(item.dataset.id);
      });
      item.querySelector('.notification-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(item.dataset.id);
      });
    });
  },

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  },

  formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  },

  markRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
    this.render();
    this.updateBadge();
  },

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this.render();
    this.updateBadge();
  },

  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.render();
    this.updateBadge();
  },

  updateBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    let badge = document.querySelector('.notification-badge');

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notification-badge';
      const btn = document.querySelector('.notification-trigger');
      if (btn) btn.appendChild(badge);
    }

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Rich Tooltips — Preview tooltips with content
// ═══════════════════════════════════════════════════════════════════════════

const RichTooltips = {
  tooltip: null,
  hideTimeout: null,

  init() {
    this.createTooltip();
    this.bindEvents();
  },

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'rich-tooltip';
    this.tooltip.innerHTML = `
      <div class="rich-tooltip-arrow"></div>
      <div class="rich-tooltip-content"></div>
    `;
    document.body.appendChild(this.tooltip);
  },

  bindEvents() {
    document.addEventListener('mouseenter', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) this.show(target);
    }, true);

    document.addEventListener('mouseleave', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) this.scheduleHide();
    }, true);

    this.tooltip.addEventListener('mouseenter', () => {
      clearTimeout(this.hideTimeout);
    });

    this.tooltip.addEventListener('mouseleave', () => {
      this.hide();
    });
  },

  show(element) {
    clearTimeout(this.hideTimeout);

    const content = this.tooltip.querySelector('.rich-tooltip-content');
    const tooltipData = element.dataset.tooltip;
    const tooltipHtml = element.dataset.tooltipHtml;
    const tooltipPreview = element.dataset.tooltipPreview;

    if (tooltipHtml) {
      content.innerHTML = tooltipHtml;
    } else if (tooltipPreview) {
      content.innerHTML = `
        <div class="tooltip-preview">
          <img src="${tooltipPreview}" alt="Preview" />
        </div>
      `;
    } else {
      content.innerHTML = `<div class="tooltip-text">${tooltipData}</div>`;
    }

    // Position
    const rect = element.getBoundingClientRect();
    const position = element.dataset.tooltipPosition || 'top';

    this.tooltip.className = `rich-tooltip ${position}`;
    this.tooltip.classList.add('visible');

    const tooltipRect = this.tooltip.getBoundingClientRect();

    switch (position) {
      case 'top':
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        this.tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
        break;
      case 'bottom':
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        this.tooltip.style.top = `${rect.bottom + 10}px`;
        break;
      case 'left':
        this.tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
        this.tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        break;
      case 'right':
        this.tooltip.style.left = `${rect.right + 10}px`;
        this.tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        break;
    }

    // Keep in viewport
    const finalRect = this.tooltip.getBoundingClientRect();
    if (finalRect.left < 10) this.tooltip.style.left = '10px';
    if (finalRect.right > window.innerWidth - 10) {
      this.tooltip.style.left = `${window.innerWidth - finalRect.width - 10}px`;
    }
  },

  scheduleHide() {
    this.hideTimeout = setTimeout(() => this.hide(), 100);
  },

  hide() {
    this.tooltip.classList.remove('visible');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Activity Timeline — Animated activity feed
// ═══════════════════════════════════════════════════════════════════════════

const ActivityTimeline = {
  create(container, activities = [], options = {}) {
    const {
      animated = true,
      showConnectors = true,
      groupByDate = true
    } = options;

    container.classList.add('activity-timeline');

    // Group by date if enabled
    const grouped = groupByDate ? this.groupByDate(activities) : { '': activities };

    let html = '';

    Object.entries(grouped).forEach(([date, items]) => {
      if (date) {
        html += `<div class="timeline-date">${date}</div>`;
      }

      items.forEach((activity, index) => {
        const iconBg = this.getIconBackground(activity.type);
        html += `
          <div class="timeline-item ${animated ? 'animate-in' : ''}" style="animation-delay: ${index * 100}ms">
            ${showConnectors ? '<div class="timeline-connector"></div>' : ''}
            <div class="timeline-icon" style="background: ${iconBg}">
              ${activity.icon || this.getDefaultIcon(activity.type)}
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-title">${activity.title}</span>
                <span class="timeline-time">${this.formatTime(activity.timestamp)}</span>
              </div>
              ${activity.description ? `<div class="timeline-description">${activity.description}</div>` : ''}
              ${activity.meta ? `<div class="timeline-meta">${activity.meta}</div>` : ''}
              ${activity.actions ? `
                <div class="timeline-actions">
                  ${activity.actions.map(a => `<button class="btn-sm btn-ghost">${a.label}</button>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });
    });

    container.innerHTML = html;

    return {
      prepend: (activity) => {
        const item = this.createItem(activity, animated, showConnectors);
        container.insertBefore(item, container.firstChild);
      },
      append: (activity) => {
        const item = this.createItem(activity, animated, showConnectors);
        container.appendChild(item);
      }
    };
  },

  createItem(activity, animated, showConnectors) {
    const div = document.createElement('div');
    div.className = `timeline-item ${animated ? 'animate-in' : ''}`;
    const iconBg = this.getIconBackground(activity.type);
    div.innerHTML = `
      ${showConnectors ? '<div class="timeline-connector"></div>' : ''}
      <div class="timeline-icon" style="background: ${iconBg}">
        ${activity.icon || this.getDefaultIcon(activity.type)}
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">${activity.title}</span>
          <span class="timeline-time">${this.formatTime(activity.timestamp)}</span>
        </div>
        ${activity.description ? `<div class="timeline-description">${activity.description}</div>` : ''}
      </div>
    `;
    return div;
  },

  groupByDate(activities) {
    const groups = {};
    activities.forEach(a => {
      const date = new Date(a.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(a);
    });
    return groups;
  },

  getDefaultIcon(type) {
    const icons = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      login: '🔐',
      logout: '🔓',
      upload: '📤',
      download: '📥',
      share: '🔗',
      comment: '💬',
      alert: '⚠️',
      success: '✅',
      error: '❌'
    };
    return icons[type] || '📌';
  },

  getIconBackground(type) {
    const colors = {
      create: 'linear-gradient(135deg, #22c55e, #16a34a)',
      update: 'linear-gradient(135deg, #00d4ff, #0099cc)',
      delete: 'linear-gradient(135deg, #ef4444, #dc2626)',
      login: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      alert: 'linear-gradient(135deg, #f59e0b, #d97706)',
      success: 'linear-gradient(135deg, #22c55e, #16a34a)',
      error: 'linear-gradient(135deg, #ef4444, #dc2626)'
    };
    return colors[type] || 'linear-gradient(135deg, #64748b, #475569)';
  },

  formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleTimeString();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// File Upload — Drag-drop with preview
// ═══════════════════════════════════════════════════════════════════════════

const FileUpload = {
  create(container, options = {}) {
    const {
      accept = '*/*',
      multiple = true,
      maxSize = 10 * 1024 * 1024, // 10MB
      onUpload = null,
      preview = true
    } = options;

    container.classList.add('file-upload-container');
    container.innerHTML = `
      <input type="file" class="file-upload-input" accept="${accept}" ${multiple ? 'multiple' : ''} hidden>
      <div class="file-upload-dropzone">
        <div class="file-upload-icon">📁</div>
        <div class="file-upload-text">
          <span class="file-upload-primary">Drop files here or click to upload</span>
          <span class="file-upload-secondary">Max ${Math.round(maxSize / 1024 / 1024)}MB per file</span>
        </div>
      </div>
      <div class="file-upload-preview"></div>
      <div class="file-upload-progress hidden">
        <div class="file-upload-progress-bar"></div>
        <span class="file-upload-progress-text">0%</span>
      </div>
    `;

    const input = container.querySelector('.file-upload-input');
    const dropzone = container.querySelector('.file-upload-dropzone');
    const previewContainer = container.querySelector('.file-upload-preview');
    const progressContainer = container.querySelector('.file-upload-progress');
    const progressBar = container.querySelector('.file-upload-progress-bar');
    const progressText = container.querySelector('.file-upload-progress-text');

    const files = [];

    // Click to upload
    dropzone.addEventListener('click', () => input.click());

    // Drag events
    ['dragenter', 'dragover'].forEach(event => {
      dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const droppedFiles = Array.from(e.dataTransfer.files);
      this.processFiles(droppedFiles, { maxSize, preview, previewContainer, files, onUpload, progressContainer, progressBar, progressText });
    });

    input.addEventListener('change', () => {
      const selectedFiles = Array.from(input.files);
      this.processFiles(selectedFiles, { maxSize, preview, previewContainer, files, onUpload, progressContainer, progressBar, progressText });
    });

    return {
      getFiles: () => files,
      clear: () => {
        files.length = 0;
        previewContainer.innerHTML = '';
      },
      upload: () => this.uploadFiles(files, { onUpload, progressContainer, progressBar, progressText })
    };
  },

  processFiles(newFiles, opts) {
    const { maxSize, preview, previewContainer, files, onUpload } = opts;

    newFiles.forEach(file => {
      if (file.size > maxSize) {
        toast?.show?.({ type: 'error', title: 'File too large', message: `${file.name} exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit` });
        return;
      }

      files.push(file);

      if (preview) {
        this.createPreview(file, previewContainer, files);
      }
    });

    AudioEngine?.success?.();
  },

  createPreview(file, container, files) {
    const preview = document.createElement('div');
    preview.className = 'file-preview';

    const isImage = file.type.startsWith('image/');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}" />
          <div class="file-preview-overlay">
            <span class="file-preview-name">${file.name}</span>
            <span class="file-preview-size">${this.formatSize(file.size)}</span>
            <button class="file-preview-remove">✕</button>
          </div>
        `;
        this.bindPreviewEvents(preview, file, files, container);
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = `
        <div class="file-preview-icon">${this.getFileIcon(file.type)}</div>
        <div class="file-preview-overlay">
          <span class="file-preview-name">${file.name}</span>
          <span class="file-preview-size">${this.formatSize(file.size)}</span>
          <button class="file-preview-remove">✕</button>
        </div>
      `;
      this.bindPreviewEvents(preview, file, files, container);
    }

    container.appendChild(preview);
  },

  bindPreviewEvents(preview, file, files, container) {
    preview.querySelector('.file-preview-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = files.indexOf(file);
      if (index > -1) files.splice(index, 1);
      preview.classList.add('removing');
      setTimeout(() => preview.remove(), 300);
    });
  },

  async uploadFiles(files, opts) {
    const { onUpload, progressContainer, progressBar, progressText } = opts;

    if (files.length === 0) return;

    progressContainer.classList.remove('hidden');

    for (let i = 0; i < files.length; i++) {
      const progress = Math.round(((i + 1) / files.length) * 100);
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${progress}% (${i + 1}/${files.length})`;

      if (onUpload) {
        await onUpload(files[i], i, files.length);
      }
    }

    progressContainer.classList.add('hidden');
    toast?.show?.({ type: 'success', title: 'Upload complete', message: `${files.length} file(s) uploaded` });
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  },

  getFileIcon(type) {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎵';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    return '📎';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Theme Customizer — Color picker and theme settings
// ═══════════════════════════════════════════════════════════════════════════

const ThemeCustomizer = {
  panel: null,
  isOpen: false,
  presets: {
    default: { primary: '#00d4ff', secondary: '#7c3aed', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444' },
    ocean: { primary: '#0ea5e9', secondary: '#06b6d4', success: '#14b8a6', warning: '#eab308', danger: '#f43f5e' },
    forest: { primary: '#22c55e', secondary: '#10b981', success: '#84cc16', warning: '#facc15', danger: '#f97316' },
    sunset: { primary: '#f97316', secondary: '#ec4899', success: '#84cc16', warning: '#facc15', danger: '#ef4444' },
    midnight: { primary: '#8b5cf6', secondary: '#a855f7', success: '#22d3ee', warning: '#fbbf24', danger: '#fb7185' }
  },

  init() {
    this.createPanel();
    this.loadSavedTheme();
  },

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'theme-customizer';
    this.panel.innerHTML = `
      <div class="theme-customizer-header">
        <h3>🎨 Theme Customizer</h3>
        <button class="theme-customizer-close">✕</button>
      </div>
      <div class="theme-customizer-content">
        <div class="theme-section">
          <h4>Presets</h4>
          <div class="theme-presets">
            ${Object.entries(this.presets).map(([name, colors]) => `
              <button class="theme-preset" data-preset="${name}" title="${name}">
                <span class="preset-color" style="background: ${colors.primary}"></span>
                <span class="preset-color" style="background: ${colors.secondary}"></span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="theme-section">
          <h4>Colors</h4>
          <div class="theme-colors">
            <label class="theme-color-picker">
              <span>Primary</span>
              <input type="color" data-var="--color-accent-primary" value="#00d4ff">
            </label>
            <label class="theme-color-picker">
              <span>Secondary</span>
              <input type="color" data-var="--color-accent-secondary" value="#7c3aed">
            </label>
            <label class="theme-color-picker">
              <span>Success</span>
              <input type="color" data-var="--color-accent-success" value="#22c55e">
            </label>
            <label class="theme-color-picker">
              <span>Warning</span>
              <input type="color" data-var="--color-accent-warning" value="#f59e0b">
            </label>
            <label class="theme-color-picker">
              <span>Danger</span>
              <input type="color" data-var="--color-accent-danger" value="#ef4444">
            </label>
          </div>
        </div>
        <div class="theme-section">
          <h4>Options</h4>
          <div class="theme-options">
            <label class="toggle-advanced" id="theme-dark-toggle">
              <input type="checkbox" checked hidden>
              <span class="toggle-label">Dark Mode</span>
            </label>
            <label class="toggle-advanced" id="theme-glass-toggle">
              <input type="checkbox" checked hidden>
              <span class="toggle-label">Glassmorphism</span>
            </label>
            <label class="toggle-advanced" id="theme-animations-toggle">
              <input type="checkbox" checked hidden>
              <span class="toggle-label">Animations</span>
            </label>
          </div>
        </div>
      </div>
      <div class="theme-customizer-footer">
        <button class="btn btn-ghost" id="theme-reset">Reset</button>
        <button class="btn btn-primary" id="theme-save">Save</button>
      </div>
    `;

    document.body.appendChild(this.panel);
    this.bindEvents();
  },

  bindEvents() {
    this.panel.querySelector('.theme-customizer-close').addEventListener('click', () => this.close());

    // Presets
    this.panel.querySelectorAll('.theme-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = this.presets[btn.dataset.preset];
        this.applyColors(preset);
        this.updateColorInputs(preset);
      });
    });

    // Color pickers
    this.panel.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', () => {
        document.documentElement.style.setProperty(input.dataset.var, input.value);
      });
    });

    // Toggles
    const darkToggle = this.panel.querySelector('#theme-dark-toggle input');
    darkToggle?.addEventListener('change', () => {
      document.body.classList.toggle('light-theme', !darkToggle.checked);
    });

    const animToggle = this.panel.querySelector('#theme-animations-toggle input');
    animToggle?.addEventListener('change', () => {
      document.body.classList.toggle('reduce-motion', !animToggle.checked);
    });

    // Save/Reset
    this.panel.querySelector('#theme-save').addEventListener('click', () => this.save());
    this.panel.querySelector('#theme-reset').addEventListener('click', () => this.reset());

    // Initialize toggles
    if (typeof AdvancedToggles !== 'undefined') {
      this.panel.querySelectorAll('.toggle-advanced').forEach(t => {
        AdvancedToggles.enhance(t);
      });
    }
  },

  applyColors(colors) {
    Object.entries(colors).forEach(([key, value]) => {
      const varName = `--color-accent-${key}`;
      document.documentElement.style.setProperty(varName, value);
    });
  },

  updateColorInputs(colors) {
    const map = {
      primary: '--color-accent-primary',
      secondary: '--color-accent-secondary',
      success: '--color-accent-success',
      warning: '--color-accent-warning',
      danger: '--color-accent-danger'
    };

    Object.entries(colors).forEach(([key, value]) => {
      const input = this.panel.querySelector(`input[data-var="${map[key]}"]`);
      if (input) input.value = value;
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
    AudioEngine?.open?.();
  },

  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    AudioEngine?.close?.();
  },

  save() {
    const theme = {};
    this.panel.querySelectorAll('input[type="color"]').forEach(input => {
      theme[input.dataset.var] = input.value;
    });
    theme.darkMode = this.panel.querySelector('#theme-dark-toggle input')?.checked;
    theme.animations = this.panel.querySelector('#theme-animations-toggle input')?.checked;

    localStorage.setItem('genesis_theme_custom', JSON.stringify(theme));
    toast?.show?.({ type: 'success', title: 'Theme Saved' });
    this.close();
  },

  reset() {
    this.applyColors(this.presets.default);
    this.updateColorInputs(this.presets.default);
    document.body.classList.remove('light-theme', 'reduce-motion');
    localStorage.removeItem('genesis_theme_custom');
    toast?.show?.({ type: 'info', title: 'Theme Reset' });
  },

  loadSavedTheme() {
    try {
      const saved = JSON.parse(localStorage.getItem('genesis_theme_custom'));
      if (saved) {
        Object.entries(saved).forEach(([key, value]) => {
          if (key.startsWith('--')) {
            document.documentElement.style.setProperty(key, value);
          }
        });
        if (saved.darkMode === false) document.body.classList.add('light-theme');
        if (saved.animations === false) document.body.classList.add('reduce-motion');
      }
    } catch { }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Initialize All Visualization Components
// ═══════════════════════════════════════════════════════════════════════════

function initVisualizations() {
  NotificationPanel.init();
  RichTooltips.init();
  ThemeCustomizer.init();

  // Register commands
  if (typeof CommandPalette !== 'undefined') {
    CommandPalette.register({
      id: 'theme-customizer',
      label: 'Open Theme Customizer',
      category: 'System',
      icon: '🎨',
      action: () => ThemeCustomizer.toggle()
    });

    CommandPalette.register({
      id: 'notifications',
      label: 'Open Notifications',
      category: 'System',
      icon: '🔔',
      action: () => NotificationPanel.toggle()
    });
  }

  console.log('[GENESIS] Visualization & Widgets module initialized');
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualizations);
} else {
  initVisualizations();
}

// Export for external use
window.Gauges = Gauges;
window.Sparklines = Sparklines;
window.NetworkGraph = NetworkGraph;
window.DashboardWidgets = DashboardWidgets;
window.NotificationPanel = NotificationPanel;
window.RichTooltips = RichTooltips;
window.ActivityTimeline = ActivityTimeline;
window.FileUpload = FileUpload;
window.ThemeCustomizer = ThemeCustomizer;
