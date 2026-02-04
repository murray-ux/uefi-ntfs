// L4-manifold/exhaust.ts
//
// ROOM: EXHAUST — Output telemetry, metrics, and audit exhaust
//
// Everything that leaves the system passes through the Exhaust.
// Captures metrics, formats telemetry, compresses audit logs,
// and produces the diagnostic stream that operators monitor.
//
// Lives in L4 because output telemetry is an orchestration concern.

import { Kernel, Timestamp } from "../layer0-kernel";

export type MetricType = "counter" | "gauge" | "histogram";

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  ts: Timestamp;
}

export interface TelemetryEvent {
  id: string;
  source: string;
  event: string;
  data: Record<string, unknown>;
  ts: Timestamp;
}

export interface ExhaustStats {
  metricsEmitted: number;
  telemetryEvents: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histogramBuckets: Record<string, number[]>;
}

export class Exhaust {
  private readonly kernel: Kernel;
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  private readonly telemetry: TelemetryEvent[] = [];
  private readonly maxTelemetry: number;
  private readonly subscribers: Array<(event: TelemetryEvent) => void> = [];
  private metricsEmitted = 0;

  constructor(kernel: Kernel, maxTelemetry: number = 10000) {
    this.kernel = kernel;
    this.maxTelemetry = maxTelemetry;
  }

  // ── Counters ───────────────────────────────────────────────────────────

  increment(name: string, amount: number = 1): number {
    const current = this.counters.get(name) ?? 0;
    const next = current + amount;
    this.counters.set(name, next);
    this.metricsEmitted++;
    return next;
  }

  counter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  // ── Gauges ─────────────────────────────────────────────────────────────

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
    this.metricsEmitted++;
  }

  gauge(name: string): number {
    return this.gauges.get(name) ?? 0;
  }

  // ── Histograms ─────────────────────────────────────────────────────────

  observe(name: string, value: number): void {
    const values = this.histograms.get(name) ?? [];
    values.push(value);
    // Keep last 1000 observations
    while (values.length > 1000) values.shift();
    this.histograms.set(name, values);
    this.metricsEmitted++;
  }

  percentile(name: string, p: number): number | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  // ── Telemetry events ───────────────────────────────────────────────────

  emit(source: string, event: string, data: Record<string, unknown> = {}): TelemetryEvent {
    const te: TelemetryEvent = {
      id: this.kernel.monotonicId(),
      source,
      event,
      data,
      ts: this.kernel.now(),
    };

    this.telemetry.push(te);
    while (this.telemetry.length > this.maxTelemetry) this.telemetry.shift();

    // Notify subscribers
    for (const sub of this.subscribers) {
      try { sub(te); } catch { /* subscriber failure must not crash exhaust */ }
    }

    return te;
  }

  subscribe(fn: (event: TelemetryEvent) => void): void {
    this.subscribers.push(fn);
  }

  recent(count = 50): TelemetryEvent[] {
    return this.telemetry.slice(-count);
  }

  // ── Snapshot — full diagnostic dump ────────────────────────────────────

  snapshot(): Record<string, unknown> {
    const histogramStats: Record<string, { count: number; p50: number | null; p95: number | null; p99: number | null }> = {};
    for (const [name] of this.histograms) {
      histogramStats[name] = {
        count: this.histograms.get(name)?.length ?? 0,
        p50: this.percentile(name, 50),
        p95: this.percentile(name, 95),
        p99: this.percentile(name, 99),
      };
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
      telemetryEvents: this.telemetry.length,
      metricsEmitted: this.metricsEmitted,
      subscribers: this.subscribers.length,
    };
  }

  stats(): ExhaustStats {
    return {
      metricsEmitted: this.metricsEmitted,
      telemetryEvents: this.telemetry.length,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histogramBuckets: Object.fromEntries(
        [...this.histograms.entries()].map(([k, v]) => [k, v.slice(-10)])
      ),
    };
  }
}
