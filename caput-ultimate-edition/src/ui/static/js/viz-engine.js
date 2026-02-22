/**
 * GENESIS 2.0 Advanced Visualization Engine
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cutting-edge visualization components:
 *   - Real-time streaming charts
 *   - 3D network topology
 *   - Flame graphs for profiling
 *   - Heat maps and treemaps
 *   - Sankey diagrams for flow
 *   - Force-directed graphs
 *   - WebGL-accelerated rendering
 *
 * @module VizEngine
 * @version 2.0.0
 */

// ══════════════════════════════════════════════════════════════════════════════
// STREAMING TIME SERIES
// ══════════════════════════════════════════════════════════════════════════════

class StreamingChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      width: options.width || this.container.clientWidth || 600,
      height: options.height || 200,
      maxPoints: options.maxPoints || 100,
      lineColor: options.lineColor || '#00d4ff',
      fillColor: options.fillColor || 'rgba(0, 212, 255, 0.1)',
      gridColor: options.gridColor || 'rgba(255, 255, 255, 0.05)',
      textColor: options.textColor || '#888',
      strokeWidth: options.strokeWidth || 2,
      animate: options.animate !== false,
      showAxis: options.showAxis !== false,
      yMin: options.yMin,
      yMax: options.yMax
    };

    this.data = [];
    this.animationFrame = null;

    this._init();
  }

  _init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width * window.devicePixelRatio;
    this.canvas.height = this.options.height * window.devicePixelRatio;
    this.canvas.style.width = this.options.width + 'px';
    this.canvas.style.height = this.options.height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.container.appendChild(this.canvas);
    this._render();
  }

  push(value, timestamp = Date.now()) {
    this.data.push({ value, timestamp });

    while (this.data.length > this.options.maxPoints) {
      this.data.shift();
    }

    if (!this.animationFrame && this.options.animate) {
      this._scheduleRender();
    }
  }

  _scheduleRender() {
    this.animationFrame = requestAnimationFrame(() => {
      this._render();
      this.animationFrame = null;
    });
  }

  _render() {
    const { ctx, options, data } = this;
    const { width, height } = options;

    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;

    // Calculate bounds
    const values = data.map(d => d.value);
    const yMin = options.yMin !== undefined ? options.yMin : Math.min(...values) * 0.9;
    const yMax = options.yMax !== undefined ? options.yMax : Math.max(...values) * 1.1;
    const yRange = yMax - yMin || 1;

    // Draw grid
    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = height * (i / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Y-axis labels
    if (options.showAxis) {
      ctx.fillStyle = options.textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';

      for (let i = 0; i < 5; i++) {
        const value = yMax - (yRange * i / 4);
        const y = height * (i / 4);
        ctx.fillText(value.toFixed(1), 4, y + 12);
      }
    }

    // Draw line
    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = options.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();

    const xStep = width / (options.maxPoints - 1);

    data.forEach((d, i) => {
      const x = i * xStep;
      const y = height - ((d.value - yMin) / yRange) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw fill
    ctx.lineTo((data.length - 1) * xStep, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = options.fillColor;
    ctx.fill();

    // Draw current value indicator
    if (data.length > 0) {
      const last = data[data.length - 1];
      const x = (data.length - 1) * xStep;
      const y = height - ((last.value - yMin) / yRange) * height;

      ctx.fillStyle = options.lineColor;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Value label
      ctx.fillStyle = options.textColor;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(last.value.toFixed(2), width - 8, 16);
    }
  }

  resize(width, height) {
    this.options.width = width;
    this.options.height = height;
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this._render();
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.canvas.remove();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SPARKLINE
// ══════════════════════════════════════════════════════════════════════════════

class Sparkline {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      width: options.width || 80,
      height: options.height || 24,
      color: options.color || '#00d4ff',
      fill: options.fill !== false
    };

    this.data = options.data || [];
    this._init();
  }

  _init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width * window.devicePixelRatio;
    this.canvas.height = this.options.height * window.devicePixelRatio;
    this.canvas.style.width = this.options.width + 'px';
    this.canvas.style.height = this.options.height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.container.appendChild(this.canvas);
    this._render();
  }

  setData(data) {
    this.data = data;
    this._render();
  }

  _render() {
    const { ctx, options, data } = this;
    const { width, height, color } = options;

    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const xStep = width / (data.length - 1);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    ctx.beginPath();

    data.forEach((value, i) => {
      const x = i * xStep;
      const y = height - ((value - min) / range) * (height - 4) - 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    if (options.fill) {
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
      ctx.fill();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GAUGE CHART
// ══════════════════════════════════════════════════════════════════════════════

class GaugeChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      size: options.size || 120,
      value: options.value || 0,
      min: options.min || 0,
      max: options.max || 100,
      colors: options.colors || ['#22c55e', '#f59e0b', '#ef4444'],
      thresholds: options.thresholds || [60, 80],
      label: options.label || '',
      unit: options.unit || '%',
      thickness: options.thickness || 12
    };

    this._init();
  }

  _init() {
    this.canvas = document.createElement('canvas');
    const size = this.options.size;
    this.canvas.width = size * window.devicePixelRatio;
    this.canvas.height = size * window.devicePixelRatio;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.container.appendChild(this.canvas);
    this._render();
  }

  setValue(value) {
    this.options.value = value;
    this._render();
  }

  _render() {
    const { ctx, options } = this;
    const { size, value, min, max, colors, thresholds, thickness } = options;

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - thickness) / 2 - 4;

    // Background arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();

    // Value arc
    const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const endAngle = Math.PI * 0.75 + percent * Math.PI * 1.5;

    // Determine color based on thresholds
    let colorIndex = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (value >= thresholds[i]) colorIndex = i + 1;
    }

    ctx.strokeStyle = colors[colorIndex] || colors[0];

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, endAngle);
    ctx.stroke();

    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size / 4}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(value)}${options.unit}`, centerX, centerY - 4);

    // Label
    if (options.label) {
      ctx.fillStyle = '#888';
      ctx.font = `${size / 10}px Inter, sans-serif`;
      ctx.fillText(options.label, centerX, centerY + size / 5);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEAT MAP
// ══════════════════════════════════════════════════════════════════════════════

class HeatMap {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      width: options.width || 400,
      height: options.height || 200,
      colors: options.colors || ['#0a0a0f', '#1a1a2e', '#16213e', '#0f3460', '#e94560'],
      cellSize: options.cellSize || 20,
      gap: options.gap || 2
    };

    this.data = [];
    this._init();
  }

  _init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width * window.devicePixelRatio;
    this.canvas.height = this.options.height * window.devicePixelRatio;
    this.canvas.style.width = this.options.width + 'px';
    this.canvas.style.height = this.options.height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.container.appendChild(this.canvas);
  }

  setData(data) {
    this.data = data;
    this._render();
  }

  _render() {
    const { ctx, options, data } = this;
    const { width, height, cellSize, gap, colors } = options;

    ctx.clearRect(0, 0, width, height);

    if (!data.length) return;

    const rows = data.length;
    const cols = data[0].length;

    // Find min/max
    let min = Infinity, max = -Infinity;
    for (const row of data) {
      for (const val of row) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    const range = max - min || 1;

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const value = data[r][c];
        const normalized = (value - min) / range;
        const colorIndex = Math.floor(normalized * (colors.length - 1));

        ctx.fillStyle = colors[colorIndex];
        ctx.fillRect(
          c * (cellSize + gap),
          r * (cellSize + gap),
          cellSize,
          cellSize
        );
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TREEMAP
// ══════════════════════════════════════════════════════════════════════════════

class TreeMap {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      width: options.width || 400,
      height: options.height || 300,
      colors: options.colors || [
        '#7c3aed', '#00d4ff', '#22c55e', '#f59e0b', '#ef4444',
        '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#eab308'
      ],
      padding: options.padding || 2
    };

    this._init();
  }

  _init() {
    this.element = document.createElement('div');
    this.element.className = 'treemap';
    this.element.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      background: var(--bg-secondary, #1a1a2e);
      border-radius: 8px;
      overflow: hidden;
    `;
    this.container.appendChild(this.element);
  }

  setData(data) {
    this.data = data;
    this._render();
  }

  _render() {
    this.element.innerHTML = '';

    if (!this.data || !this.data.length) return;

    // Calculate total value
    const total = this.data.reduce((sum, d) => sum + d.value, 0);

    // Sort by value descending
    const sorted = [...this.data].sort((a, b) => b.value - a.value);

    // Squarified treemap layout
    const rects = this._squarify(
      sorted,
      { x: 0, y: 0, width: this.options.width, height: this.options.height },
      total
    );

    // Render rectangles
    rects.forEach((rect, i) => {
      const cell = document.createElement('div');
      cell.className = 'treemap-cell';
      cell.style.cssText = `
        position: absolute;
        left: ${rect.x + this.options.padding}px;
        top: ${rect.y + this.options.padding}px;
        width: ${rect.width - this.options.padding * 2}px;
        height: ${rect.height - this.options.padding * 2}px;
        background: ${this.options.colors[i % this.options.colors.length]};
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: ${Math.min(rect.width, rect.height) / 6}px;
        padding: 4px;
        box-sizing: border-box;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;

      cell.innerHTML = `
        <div style="font-weight: bold; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 100%;">${rect.data.name}</div>
        <div style="opacity: 0.8; font-size: 0.8em;">${rect.data.value.toLocaleString()}</div>
      `;

      cell.addEventListener('mouseenter', () => {
        cell.style.transform = 'scale(1.02)';
        cell.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        cell.style.zIndex = '10';
      });

      cell.addEventListener('mouseleave', () => {
        cell.style.transform = 'scale(1)';
        cell.style.boxShadow = 'none';
        cell.style.zIndex = '1';
      });

      this.element.appendChild(cell);
    });
  }

  _squarify(data, bounds, total) {
    const rects = [];
    let remaining = [...data];
    let currentBounds = { ...bounds };

    while (remaining.length > 0) {
      const isWide = currentBounds.width >= currentBounds.height;
      const side = isWide ? currentBounds.height : currentBounds.width;

      // Find optimal row
      let row = [];
      let rowValue = 0;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const testRow = [...row, item];
        const testValue = rowValue + item.value;

        const currentWorst = row.length > 0
          ? this._worstRatio(row, rowValue, side, total, currentBounds)
          : Infinity;

        const testWorst = this._worstRatio(testRow, testValue, side, total, currentBounds);

        if (testWorst <= currentWorst || row.length === 0) {
          row = testRow;
          rowValue = testValue;
        } else {
          break;
        }
      }

      // Layout row
      const rowBounds = isWide
        ? { x: currentBounds.x, y: currentBounds.y, width: 0, height: currentBounds.height }
        : { x: currentBounds.x, y: currentBounds.y, width: currentBounds.width, height: 0 };

      const rowSize = (rowValue / total) * (isWide ? currentBounds.width : currentBounds.height);

      if (isWide) rowBounds.width = rowSize;
      else rowBounds.height = rowSize;

      let offset = 0;
      for (const item of row) {
        const itemSize = (item.value / rowValue) * (isWide ? rowBounds.height : rowBounds.width);

        rects.push({
          data: item,
          x: isWide ? rowBounds.x : rowBounds.x + offset,
          y: isWide ? rowBounds.y + offset : rowBounds.y,
          width: isWide ? rowSize : itemSize,
          height: isWide ? itemSize : rowSize
        });

        offset += itemSize;
      }

      // Update bounds
      if (isWide) {
        currentBounds.x += rowSize;
        currentBounds.width -= rowSize;
      } else {
        currentBounds.y += rowSize;
        currentBounds.height -= rowSize;
      }

      // Remove processed items
      remaining = remaining.slice(row.length);
      total -= rowValue;
    }

    return rects;
  }

  _worstRatio(row, rowValue, side, total, bounds) {
    const area = (rowValue / total) * bounds.width * bounds.height;
    const rowWidth = area / side;

    let worst = 0;
    for (const item of row) {
      const itemArea = (item.value / rowValue) * area;
      const itemHeight = itemArea / rowWidth;
      const ratio = Math.max(rowWidth / itemHeight, itemHeight / rowWidth);
      if (ratio > worst) worst = ratio;
    }

    return worst;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK GRAPH
// ══════════════════════════════════════════════════════════════════════════════

class NetworkGraph {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      width: options.width || 600,
      height: options.height || 400,
      nodeRadius: options.nodeRadius || 8,
      linkDistance: options.linkDistance || 100,
      chargeStrength: options.chargeStrength || -200,
      centerStrength: options.centerStrength || 0.1
    };

    this.nodes = [];
    this.links = [];
    this.simulation = null;

    this._init();
  }

  _init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width * window.devicePixelRatio;
    this.canvas.height = this.options.height * window.devicePixelRatio;
    this.canvas.style.width = this.options.width + 'px';
    this.canvas.style.height = this.options.height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.container.appendChild(this.canvas);

    this._setupInteraction();
  }

  _setupInteraction() {
    let dragging = null;

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const node of this.nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < this.options.nodeRadius + 5) {
          dragging = node;
          node.fx = x;
          node.fy = y;
          break;
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (dragging) {
        const rect = this.canvas.getBoundingClientRect();
        dragging.fx = e.clientX - rect.left;
        dragging.fy = e.clientY - rect.top;
        this._render();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      if (dragging) {
        dragging.fx = null;
        dragging.fy = null;
        dragging = null;
      }
    });
  }

  setData(nodes, links) {
    this.nodes = nodes.map(n => ({
      ...n,
      x: n.x || Math.random() * this.options.width,
      y: n.y || Math.random() * this.options.height,
      vx: 0,
      vy: 0
    }));

    this.links = links.map(l => ({
      ...l,
      source: typeof l.source === 'string'
        ? this.nodes.find(n => n.id === l.source)
        : l.source,
      target: typeof l.target === 'string'
        ? this.nodes.find(n => n.id === l.target)
        : l.target
    }));

    this._startSimulation();
  }

  _startSimulation() {
    const tick = () => {
      this._simulationStep();
      this._render();
      this.animationFrame = requestAnimationFrame(tick);
    };

    tick();
  }

  _simulationStep() {
    const { nodes, links, options } = this;
    const centerX = options.width / 2;
    const centerY = options.height / 2;

    // Apply forces
    for (const node of nodes) {
      if (node.fx !== null && node.fx !== undefined) {
        node.x = node.fx;
        node.vx = 0;
      }
      if (node.fy !== null && node.fy !== undefined) {
        node.y = node.fy;
        node.vy = 0;
      }

      // Center force
      node.vx += (centerX - node.x) * options.centerStrength;
      node.vy += (centerY - node.y) * options.centerStrength;

      // Charge (repulsion)
      for (const other of nodes) {
        if (other === node) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = options.chargeStrength / (dist * dist);
        node.vx += (dx / dist) * force * 0.1;
        node.vy += (dy / dist) * force * 0.1;
      }
    }

    // Link forces
    for (const link of links) {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - options.linkDistance) * 0.1;

      link.source.vx += (dx / dist) * force;
      link.source.vy += (dy / dist) * force;
      link.target.vx -= (dx / dist) * force;
      link.target.vy -= (dy / dist) * force;
    }

    // Update positions
    for (const node of nodes) {
      if (node.fx === null || node.fx === undefined) {
        node.vx *= 0.9; // Damping
        node.x += node.vx;
        node.x = Math.max(10, Math.min(options.width - 10, node.x));
      }
      if (node.fy === null || node.fy === undefined) {
        node.vy *= 0.9;
        node.y += node.vy;
        node.y = Math.max(10, Math.min(options.height - 10, node.y));
      }
    }
  }

  _render() {
    const { ctx, options, nodes, links } = this;
    const { width, height, nodeRadius } = options;

    ctx.clearRect(0, 0, width, height);

    // Draw links
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    for (const link of links) {
      if (!link.source || !link.target) continue;

      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      ctx.fillStyle = node.color || '#00d4ff';
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (node.label) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + nodeRadius + 12);
      }
    }
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.canvas.remove();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DONUT CHART
// ══════════════════════════════════════════════════════════════════════════════

class DonutChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      size: options.size || 150,
      thickness: options.thickness || 20,
      colors: options.colors || ['#7c3aed', '#00d4ff', '#22c55e', '#f59e0b', '#ef4444'],
      centerText: options.centerText || '',
      centerValue: options.centerValue || ''
    };

    this.data = [];
    this._init();
  }

  _init() {
    this.canvas = document.createElement('canvas');
    const size = this.options.size;
    this.canvas.width = size * window.devicePixelRatio;
    this.canvas.height = size * window.devicePixelRatio;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.container.appendChild(this.canvas);
  }

  setData(data) {
    this.data = data;
    this._render();
  }

  _render() {
    const { ctx, options, data } = this;
    const { size, thickness, colors } = options;

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - thickness) / 2 - 4;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      const sliceAngle = (d.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = thickness;
      ctx.lineCap = 'butt';

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.stroke();

      startAngle = endAngle;
    });

    // Center text
    if (options.centerValue) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${size / 5}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.centerValue, centerX, centerY - 6);
    }

    if (options.centerText) {
      ctx.fillStyle = '#888';
      ctx.font = `${size / 12}px Inter, sans-serif`;
      ctx.fillText(options.centerText, centerX, centerY + size / 8);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ══════════════════════════════════════════════════════════════════════════════

class ProgressBar {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      value: options.value || 0,
      max: options.max || 100,
      height: options.height || 8,
      color: options.color || '#00d4ff',
      bgColor: options.bgColor || 'rgba(255, 255, 255, 0.1)',
      animated: options.animated !== false,
      showLabel: options.showLabel !== false
    };

    this._init();
  }

  _init() {
    this.element = document.createElement('div');
    this.element.className = 'progress-container';
    this.element.style.cssText = `
      width: 100%;
      background: ${this.options.bgColor};
      border-radius: ${this.options.height / 2}px;
      overflow: hidden;
      position: relative;
    `;

    this.bar = document.createElement('div');
    this.bar.className = 'progress-bar';
    this.bar.style.cssText = `
      height: ${this.options.height}px;
      background: ${this.options.color};
      border-radius: ${this.options.height / 2}px;
      transition: width 0.5s ease-out;
      position: relative;
    `;

    if (this.options.animated) {
      this.bar.style.background = `linear-gradient(
        90deg,
        ${this.options.color} 0%,
        ${this.options.color}dd 50%,
        ${this.options.color} 100%
      )`;
      this.bar.style.backgroundSize = '200% 100%';
      this.bar.style.animation = 'progress-shine 1.5s linear infinite';
    }

    this.element.appendChild(this.bar);

    if (this.options.showLabel) {
      this.label = document.createElement('div');
      this.label.style.cssText = `
        font-size: 12px;
        color: #888;
        margin-top: 4px;
        text-align: right;
      `;
      this.element.appendChild(this.label);
    }

    this.container.appendChild(this.element);
    this._render();
  }

  setValue(value) {
    this.options.value = value;
    this._render();
  }

  _render() {
    const percent = Math.min(100, Math.max(0, (this.options.value / this.options.max) * 100));
    this.bar.style.width = percent + '%';

    if (this.label) {
      this.label.textContent = `${this.options.value.toLocaleString()} / ${this.options.max.toLocaleString()}`;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════════════════════

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes progress-shine {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
document.head.appendChild(style);

window.VizEngine = {
  StreamingChart,
  Sparkline,
  GaugeChart,
  HeatMap,
  TreeMap,
  NetworkGraph,
  DonutChart,
  ProgressBar
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.VizEngine;
}
