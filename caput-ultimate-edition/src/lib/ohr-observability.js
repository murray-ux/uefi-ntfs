/**
 * OHR OBSERVABILITY SYSTEM
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Light — Advanced observability, tracing, and monitoring
 * Named for אור (Ohr) — the primordial light of creation
 *
 * Features:
 *   - OpenTelemetry-compatible distributed tracing
 *   - Real-time metrics aggregation (Prometheus-style)
 *   - Log correlation with trace context
 *   - Anomaly detection with statistical methods
 *   - SLO/SLI tracking with burn rate alerts
 *   - Flame graph generation for profiling
 *   - Cardinality-aware metric collection
 *
 * @module OHR
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTED TRACING (OpenTelemetry-compatible)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * W3C Trace Context compatible trace/span IDs
 */
export class TraceContext {
  constructor(traceId = null, spanId = null, parentSpanId = null) {
    this.traceId = traceId || randomBytes(16).toString('hex');
    this.spanId = spanId || randomBytes(8).toString('hex');
    this.parentSpanId = parentSpanId;
    this.traceFlags = 0x01; // sampled
    this.traceState = new Map();
  }

  /**
   * Parse W3C traceparent header
   */
  static fromTraceparent(header) {
    const parts = header.split('-');
    if (parts.length !== 4) return null;

    const [version, traceId, spanId, flags] = parts;
    if (version !== '00') return null;

    const ctx = new TraceContext(traceId, spanId);
    ctx.traceFlags = parseInt(flags, 16);
    return ctx;
  }

  /**
   * Generate traceparent header
   */
  toTraceparent() {
    return `00-${this.traceId}-${this.spanId}-${this.traceFlags.toString(16).padStart(2, '0')}`;
  }

  /**
   * Create child context
   */
  createChild() {
    return new TraceContext(this.traceId, null, this.spanId);
  }
}

/**
 * Span representing a unit of work
 */
export class Span {
  constructor(tracer, name, context, options = {}) {
    this.tracer = tracer;
    this.name = name;
    this.context = context;
    this.kind = options.kind || 'internal'; // client, server, producer, consumer, internal
    this.startTime = options.startTime || Date.now();
    this.endTime = null;
    this.status = { code: 'unset', message: '' };
    this.attributes = new Map(Object.entries(options.attributes || {}));
    this.events = [];
    this.links = [];
    this.ended = false;
  }

  /**
   * Set attribute
   */
  setAttribute(key, value) {
    if (!this.ended) {
      this.attributes.set(key, value);
    }
    return this;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      this.setAttribute(key, value);
    }
    return this;
  }

  /**
   * Add event
   */
  addEvent(name, attributes = {}, timestamp = Date.now()) {
    if (!this.ended) {
      this.events.push({ name, attributes, timestamp });
    }
    return this;
  }

  /**
   * Record exception
   */
  recordException(error) {
    this.addEvent('exception', {
      'exception.type': error.name || 'Error',
      'exception.message': error.message,
      'exception.stacktrace': error.stack
    });
    this.setStatus('error', error.message);
    return this;
  }

  /**
   * Set status
   */
  setStatus(code, message = '') {
    if (!this.ended) {
      this.status = { code, message };
    }
    return this;
  }

  /**
   * End span
   */
  end(endTime = Date.now()) {
    if (!this.ended) {
      this.endTime = endTime;
      this.ended = true;
      this.tracer._exportSpan(this);
    }
  }

  /**
   * Get duration in milliseconds
   */
  get duration() {
    return this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime;
  }

  /**
   * Convert to OTLP format
   */
  toOTLP() {
    return {
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      parentSpanId: this.context.parentSpanId,
      name: this.name,
      kind: this.kind,
      startTimeUnixNano: this.startTime * 1000000,
      endTimeUnixNano: this.endTime ? this.endTime * 1000000 : 0,
      attributes: Array.from(this.attributes.entries()).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) }
      })),
      events: this.events.map(e => ({
        name: e.name,
        timeUnixNano: e.timestamp * 1000000,
        attributes: Object.entries(e.attributes).map(([key, value]) => ({
          key,
          value: { stringValue: String(value) }
        }))
      })),
      status: this.status
    };
  }
}

/**
 * Tracer for creating and managing spans
 */
export class Tracer extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.version = options.version || '1.0.0';
    this.spans = new Map();
    this.exporters = [];
    this.sampler = options.sampler || (() => true);
    this.maxSpans = options.maxSpans || 10000;
  }

  /**
   * Start a new span
   */
  startSpan(name, options = {}) {
    let context;

    if (options.parent) {
      context = options.parent.context.createChild();
    } else if (options.context) {
      context = options.context.createChild();
    } else {
      context = new TraceContext();
    }

    // Sampling decision
    if (!this.sampler(name, context)) {
      context.traceFlags = 0x00;
    }

    const span = new Span(this, name, context, options);
    this.spans.set(context.spanId, span);

    // Enforce max spans
    if (this.spans.size > this.maxSpans) {
      const oldestKey = this.spans.keys().next().value;
      this.spans.delete(oldestKey);
    }

    return span;
  }

  /**
   * Start active span with callback
   */
  async startActiveSpan(name, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    const span = this.startSpan(name, options);

    try {
      const result = await fn(span);
      span.setStatus('ok');
      return result;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add span exporter
   */
  addExporter(exporter) {
    this.exporters.push(exporter);
    return this;
  }

  _exportSpan(span) {
    const data = span.toOTLP();
    this.emit('span', data);

    for (const exporter of this.exporters) {
      try {
        exporter.export(data);
      } catch (e) {
        this.emit('error', e);
      }
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId) {
    const spans = [];
    for (const span of this.spans.values()) {
      if (span.context.traceId === traceId) {
        spans.push(span.toOTLP());
      }
    }
    return spans.sort((a, b) => a.startTimeUnixNano - b.startTimeUnixNano);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// METRICS SYSTEM (Prometheus-compatible)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Base metric class
 */
class Metric {
  constructor(name, options = {}) {
    this.name = name;
    this.help = options.help || '';
    this.labels = options.labels || [];
    this.type = 'untyped';
  }

  _labelsToKey(labels) {
    return this.labels.map(l => `${l}="${labels[l] || ''}"`).join(',');
  }
}

/**
 * Counter metric (monotonically increasing)
 */
export class Counter extends Metric {
  constructor(name, options = {}) {
    super(name, options);
    this.type = 'counter';
    this.values = new Map();
  }

  inc(labels = {}, value = 1) {
    const key = this._labelsToKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  get(labels = {}) {
    return this.values.get(this._labelsToKey(labels)) || 0;
  }

  collect() {
    const samples = [];
    for (const [key, value] of this.values) {
      samples.push({ labels: key, value });
    }
    return { name: this.name, type: this.type, help: this.help, samples };
  }
}

/**
 * Gauge metric (can go up and down)
 */
export class Gauge extends Metric {
  constructor(name, options = {}) {
    super(name, options);
    this.type = 'gauge';
    this.values = new Map();
  }

  set(labels = {}, value) {
    this.values.set(this._labelsToKey(labels), value);
  }

  inc(labels = {}, value = 1) {
    const key = this._labelsToKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(labels = {}, value = 1) {
    this.inc(labels, -value);
  }

  get(labels = {}) {
    return this.values.get(this._labelsToKey(labels)) || 0;
  }

  collect() {
    const samples = [];
    for (const [key, value] of this.values) {
      samples.push({ labels: key, value });
    }
    return { name: this.name, type: this.type, help: this.help, samples };
  }
}

/**
 * Histogram metric with configurable buckets
 */
export class Histogram extends Metric {
  constructor(name, options = {}) {
    super(name, options);
    this.type = 'histogram';
    this.buckets = options.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    this.values = new Map();
  }

  observe(labels = {}, value) {
    const key = this._labelsToKey(labels);

    if (!this.values.has(key)) {
      this.values.set(key, {
        buckets: this.buckets.map(b => ({ le: b, count: 0 })),
        sum: 0,
        count: 0
      });
    }

    const data = this.values.get(key);
    data.sum += value;
    data.count++;

    for (const bucket of data.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  collect() {
    const samples = [];
    for (const [key, data] of this.values) {
      // Bucket samples
      for (const bucket of data.buckets) {
        samples.push({
          labels: `${key},le="${bucket.le}"`,
          value: bucket.count,
          suffix: '_bucket'
        });
      }
      // +Inf bucket
      samples.push({
        labels: `${key},le="+Inf"`,
        value: data.count,
        suffix: '_bucket'
      });
      // Sum and count
      samples.push({ labels: key, value: data.sum, suffix: '_sum' });
      samples.push({ labels: key, value: data.count, suffix: '_count' });
    }
    return { name: this.name, type: this.type, help: this.help, samples };
  }

  /**
   * Get percentile from histogram
   */
  percentile(labels = {}, p) {
    const key = this._labelsToKey(labels);
    const data = this.values.get(key);
    if (!data || data.count === 0) return 0;

    const target = data.count * p;
    let prev = 0;
    let prevBucket = 0;

    for (const bucket of data.buckets) {
      if (bucket.count >= target) {
        // Linear interpolation
        const ratio = (target - prev) / (bucket.count - prev || 1);
        return prevBucket + ratio * (bucket.le - prevBucket);
      }
      prev = bucket.count;
      prevBucket = bucket.le;
    }

    return data.buckets[data.buckets.length - 1]?.le || 0;
  }
}

/**
 * Summary metric with quantiles (using streaming approximation)
 */
export class Summary extends Metric {
  constructor(name, options = {}) {
    super(name, options);
    this.type = 'summary';
    this.quantiles = options.quantiles || [0.5, 0.9, 0.99];
    this.maxAge = options.maxAge || 60000; // 1 minute
    this.values = new Map();
  }

  observe(labels = {}, value) {
    const key = this._labelsToKey(labels);
    const now = Date.now();

    if (!this.values.has(key)) {
      this.values.set(key, { observations: [], sum: 0, count: 0 });
    }

    const data = this.values.get(key);

    // Remove old observations
    data.observations = data.observations.filter(o => now - o.time < this.maxAge);

    data.observations.push({ value, time: now });
    data.sum += value;
    data.count++;
  }

  collect() {
    const samples = [];
    const now = Date.now();

    for (const [key, data] of this.values) {
      // Filter and sort recent observations
      const recent = data.observations
        .filter(o => now - o.time < this.maxAge)
        .map(o => o.value)
        .sort((a, b) => a - b);

      // Quantile samples
      for (const q of this.quantiles) {
        const idx = Math.floor(recent.length * q);
        samples.push({
          labels: `${key},quantile="${q}"`,
          value: recent[idx] || 0
        });
      }

      samples.push({ labels: key, value: data.sum, suffix: '_sum' });
      samples.push({ labels: key, value: data.count, suffix: '_count' });
    }

    return { name: this.name, type: this.type, help: this.help, samples };
  }
}

/**
 * Metrics Registry
 */
export class MetricsRegistry {
  constructor() {
    this.metrics = new Map();
    this.defaultLabels = {};
  }

  /**
   * Set default labels for all metrics
   */
  setDefaultLabels(labels) {
    this.defaultLabels = labels;
    return this;
  }

  /**
   * Create counter
   */
  counter(name, options = {}) {
    const metric = new Counter(name, options);
    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * Create gauge
   */
  gauge(name, options = {}) {
    const metric = new Gauge(name, options);
    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * Create histogram
   */
  histogram(name, options = {}) {
    const metric = new Histogram(name, options);
    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * Create summary
   */
  summary(name, options = {}) {
    const metric = new Summary(name, options);
    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * Get metric
   */
  get(name) {
    return this.metrics.get(name);
  }

  /**
   * Collect all metrics in Prometheus format
   */
  collect() {
    let output = '';

    for (const metric of this.metrics.values()) {
      const data = metric.collect();

      output += `# HELP ${data.name} ${data.help}\n`;
      output += `# TYPE ${data.name} ${data.type}\n`;

      for (const sample of data.samples) {
        const name = data.name + (sample.suffix || '');
        const labels = sample.labels ? `{${sample.labels}}` : '';
        output += `${name}${labels} ${sample.value}\n`;
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Collect as JSON
   */
  collectJSON() {
    const result = {};
    for (const [name, metric] of this.metrics) {
      result[name] = metric.collect();
    }
    return result;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Statistical anomaly detector using Z-score and IQR methods
 */
export class AnomalyDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.windowSize = options.windowSize || 100;
    this.zThreshold = options.zThreshold || 3;
    this.iqrMultiplier = options.iqrMultiplier || 1.5;
    this.series = new Map();
  }

  /**
   * Add observation and check for anomaly
   */
  observe(name, value) {
    if (!this.series.has(name)) {
      this.series.set(name, []);
    }

    const data = this.series.get(name);
    data.push({ value, time: Date.now() });

    // Keep window size
    while (data.length > this.windowSize) {
      data.shift();
    }

    // Check for anomaly
    if (data.length >= 10) {
      const anomaly = this._detectAnomaly(name, value, data);
      if (anomaly) {
        this.emit('anomaly', { name, value, ...anomaly });
        return anomaly;
      }
    }

    return null;
  }

  _detectAnomaly(name, value, data) {
    const values = data.map(d => d.value);

    // Z-score method
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length
    );

    const zScore = std > 0 ? (value - mean) / std : 0;

    if (Math.abs(zScore) > this.zThreshold) {
      return {
        method: 'z-score',
        score: zScore,
        threshold: this.zThreshold,
        mean,
        std,
        severity: Math.abs(zScore) > this.zThreshold * 2 ? 'critical' : 'warning'
      };
    }

    // IQR method
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - this.iqrMultiplier * iqr;
    const upperBound = q3 + this.iqrMultiplier * iqr;

    if (value < lowerBound || value > upperBound) {
      return {
        method: 'iqr',
        lowerBound,
        upperBound,
        iqr,
        severity: value < lowerBound - iqr || value > upperBound + iqr ? 'critical' : 'warning'
      };
    }

    return null;
  }

  /**
   * Get statistics for a series
   */
  getStats(name) {
    const data = this.series.get(name);
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SLO/SLI TRACKING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Service Level Objective tracker with burn rate alerts
 */
export class SLOTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.slos = new Map();
    this.windows = options.windows || [
      { name: '5m', duration: 5 * 60 * 1000 },
      { name: '1h', duration: 60 * 60 * 1000 },
      { name: '24h', duration: 24 * 60 * 60 * 1000 }
    ];
  }

  /**
   * Define an SLO
   */
  defineSLO(name, config) {
    this.slos.set(name, {
      name,
      target: config.target, // e.g., 0.999 for 99.9%
      errorBudget: 1 - config.target,
      indicator: config.indicator, // 'latency', 'availability', 'throughput'
      threshold: config.threshold, // e.g., 200ms for latency
      events: []
    });
    return this;
  }

  /**
   * Record event
   */
  record(sloName, good, total = 1, timestamp = Date.now()) {
    const slo = this.slos.get(sloName);
    if (!slo) return;

    slo.events.push({ good, total, timestamp });

    // Cleanup old events
    const maxAge = Math.max(...this.windows.map(w => w.duration));
    slo.events = slo.events.filter(e => timestamp - e.timestamp < maxAge);

    // Check burn rate
    this._checkBurnRate(slo);
  }

  _checkBurnRate(slo) {
    const now = Date.now();

    for (const window of this.windows) {
      const windowEvents = slo.events.filter(e => now - e.timestamp < window.duration);

      if (windowEvents.length === 0) continue;

      const totalGood = windowEvents.reduce((a, e) => a + e.good, 0);
      const totalAll = windowEvents.reduce((a, e) => a + e.total, 0);
      const errorRate = 1 - totalGood / totalAll;

      // Calculate burn rate
      const burnRate = errorRate / slo.errorBudget;

      // Alert thresholds (multi-window burn rate)
      if (burnRate > 14.4) { // 2% budget in 1 hour
        this.emit('alert', {
          slo: slo.name,
          severity: 'critical',
          window: window.name,
          burnRate,
          errorRate,
          message: `SLO ${slo.name} burning error budget at ${burnRate.toFixed(1)}x rate`
        });
      } else if (burnRate > 6) { // 5% budget in 6 hours
        this.emit('alert', {
          slo: slo.name,
          severity: 'warning',
          window: window.name,
          burnRate,
          errorRate
        });
      }
    }
  }

  /**
   * Get SLO status
   */
  getStatus(sloName) {
    const slo = this.slos.get(sloName);
    if (!slo) return null;

    const now = Date.now();
    const status = { name: slo.name, target: slo.target, windows: {} };

    for (const window of this.windows) {
      const events = slo.events.filter(e => now - e.timestamp < window.duration);

      if (events.length === 0) {
        status.windows[window.name] = { sli: null, events: 0 };
        continue;
      }

      const good = events.reduce((a, e) => a + e.good, 0);
      const total = events.reduce((a, e) => a + e.total, 0);
      const sli = good / total;
      const budgetRemaining = (sli - slo.target) / slo.errorBudget;

      status.windows[window.name] = {
        sli,
        events: total,
        budgetRemaining: Math.max(0, Math.min(1, budgetRemaining)),
        healthy: sli >= slo.target
      };
    }

    return status;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FLAME GRAPH PROFILER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Flame graph data collector
 */
export class FlameProfiler {
  constructor() {
    this.stacks = [];
    this.currentStack = [];
  }

  /**
   * Push frame onto stack
   */
  push(name) {
    const frame = { name, start: process.hrtime.bigint(), children: [] };

    if (this.currentStack.length > 0) {
      this.currentStack[this.currentStack.length - 1].children.push(frame);
    }

    this.currentStack.push(frame);
    return this;
  }

  /**
   * Pop frame from stack
   */
  pop() {
    if (this.currentStack.length === 0) return this;

    const frame = this.currentStack.pop();
    frame.end = process.hrtime.bigint();
    frame.duration = Number(frame.end - frame.start) / 1e6; // ms

    if (this.currentStack.length === 0) {
      this.stacks.push(frame);
    }

    return this;
  }

  /**
   * Profile async function
   */
  async profile(name, fn) {
    this.push(name);
    try {
      return await fn();
    } finally {
      this.pop();
    }
  }

  /**
   * Generate flame graph data
   */
  toFlameGraph() {
    const collapse = (frame, prefix = '') => {
      const path = prefix ? `${prefix};${frame.name}` : frame.name;
      const lines = [`${path} ${Math.round(frame.duration)}`];

      for (const child of frame.children) {
        lines.push(...collapse(child, path));
      }

      return lines;
    };

    return this.stacks.flatMap(s => collapse(s)).join('\n');
  }

  /**
   * Get hierarchical data for visualization
   */
  toHierarchy() {
    return {
      name: 'root',
      children: this.stacks.map(s => this._frameToNode(s))
    };
  }

  _frameToNode(frame) {
    return {
      name: frame.name,
      value: frame.duration,
      children: frame.children.map(c => this._frameToNode(c))
    };
  }

  /**
   * Clear collected data
   */
  clear() {
    this.stacks = [];
    this.currentStack = [];
    return this;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LOG CORRELATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Structured logger with trace correlation
 */
export class CorrelatedLogger {
  constructor(options = {}) {
    this.service = options.service || 'genesis';
    this.version = options.version || '2.0.0';
    this.outputs = options.outputs || [console];
    this.minLevel = options.minLevel || 'debug';
    this.levels = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
  }

  _log(level, message, context = {}) {
    if (this.levels[level] < this.levels[this.minLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      version: this.version,
      ...context
    };

    // Add trace context if available
    if (context.span) {
      entry.traceId = context.span.context.traceId;
      entry.spanId = context.span.context.spanId;
      delete entry.span;
    }

    for (const output of this.outputs) {
      if (typeof output.write === 'function') {
        output.write(JSON.stringify(entry) + '\n');
      } else if (typeof output.log === 'function') {
        output.log(JSON.stringify(entry));
      }
    }

    return entry;
  }

  debug(message, context) { return this._log('debug', message, context); }
  info(message, context) { return this._log('info', message, context); }
  warn(message, context) { return this._log('warn', message, context); }
  error(message, context) { return this._log('error', message, context); }
  fatal(message, context) { return this._log('fatal', message, context); }

  /**
   * Create child logger with context
   */
  child(context) {
    const child = new CorrelatedLogger({
      service: this.service,
      version: this.version,
      outputs: this.outputs,
      minLevel: this.minLevel
    });

    const originalLog = child._log.bind(child);
    child._log = (level, message, ctx = {}) => {
      return originalLog(level, message, { ...context, ...ctx });
    };

    return child;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OHR — Main Export
// ══════════════════════════════════════════════════════════════════════════════

/**
 * OHR — The Light
 * Complete observability system
 */
export class Ohr extends EventEmitter {
  constructor(options = {}) {
    super();

    this.tracer = new Tracer(options.service || 'genesis', options.tracer);
    this.metrics = new MetricsRegistry();
    this.anomalyDetector = new AnomalyDetector(options.anomaly);
    this.sloTracker = new SLOTracker(options.slo);
    this.profiler = new FlameProfiler();
    this.logger = new CorrelatedLogger(options.logger);

    // Forward events
    this.anomalyDetector.on('anomaly', a => this.emit('anomaly', a));
    this.sloTracker.on('alert', a => this.emit('slo-alert', a));
    this.tracer.on('span', s => this.emit('span', s));

    // Default metrics
    this._setupDefaultMetrics();
  }

  _setupDefaultMetrics() {
    this.requestDuration = this.metrics.histogram('http_request_duration_seconds', {
      help: 'HTTP request duration in seconds',
      labels: ['method', 'path', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    });

    this.requestTotal = this.metrics.counter('http_requests_total', {
      help: 'Total HTTP requests',
      labels: ['method', 'path', 'status']
    });

    this.activeConnections = this.metrics.gauge('http_active_connections', {
      help: 'Number of active connections'
    });

    this.errorTotal = this.metrics.counter('errors_total', {
      help: 'Total errors',
      labels: ['type', 'severity']
    });
  }

  /**
   * Create a traced span
   */
  trace(name, options = {}) {
    return this.tracer.startSpan(name, options);
  }

  /**
   * Run traced operation
   */
  async traced(name, fn, options = {}) {
    return this.tracer.startActiveSpan(name, options, fn);
  }

  /**
   * Profile operation
   */
  async profile(name, fn) {
    return this.profiler.profile(name, fn);
  }

  /**
   * Get system status
   */
  status() {
    return {
      metrics: this.metrics.collectJSON(),
      slos: Array.from(this.sloTracker.slos.keys()).map(name =>
        this.sloTracker.getStatus(name)
      ),
      anomalies: Array.from(this.anomalyDetector.series.keys()).map(name => ({
        name,
        stats: this.anomalyDetector.getStats(name)
      }))
    };
  }

  /**
   * Prometheus metrics endpoint
   */
  prometheusMetrics() {
    return this.metrics.collect();
  }
}

// Default export
export default Ohr;
