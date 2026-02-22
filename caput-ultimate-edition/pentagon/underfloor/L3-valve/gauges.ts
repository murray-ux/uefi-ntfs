// pentagon/underfloor/L3-valve/gauges.ts
//
// ROOM: GAUGES — Real-time metric monitoring and threshold alerts.
// Each gauge tracks a named value within min/max bounds, with optional
// alert thresholds. Readings are buffered for historical review.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface Gauge {
  name: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  threshold: number | null;
  alerted: boolean;
  readings: number;
}

export class Gauges {
  private readonly kernel: Kernel;
  private readonly gauges: Map<string, Gauge> = new Map();
  private readonly historyLog: Map<string, Array<{ value: number; ts: number }>> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string, unit: string, min: number, max: number, threshold?: number): void {
    this.gauges.set(name, {
      name, value: min, min, max, unit,
      threshold: threshold ?? null, alerted: false, readings: 0,
    });
    this.historyLog.set(name, []);
  }

  read(name: string, value: number): boolean {
    const gauge = this.gauges.get(name);
    if (!gauge) return false;
    gauge.value = Math.max(gauge.min, Math.min(gauge.max, value));
    gauge.readings++;
    const log = this.historyLog.get(name)!;
    log.push({ value: gauge.value, ts: Date.now() });
    while (log.length > 1000) log.shift();
    if (gauge.threshold !== null && gauge.value >= gauge.threshold) {
      gauge.alerted = true;
    }
    return true;
  }

  peek(name: string): Gauge | null {
    return this.gauges.get(name) ?? null;
  }

  alert(name: string): boolean {
    const gauge = this.gauges.get(name);
    return gauge ? gauge.alerted : false;
  }

  resetAlert(name: string): boolean {
    const gauge = this.gauges.get(name);
    if (!gauge) return false;
    gauge.alerted = false;
    return true;
  }

  dashboard(): Gauge[] {
    return [...this.gauges.values()];
  }

  history(name: string, last = 50): Array<{ value: number; ts: number }> {
    const log = this.historyLog.get(name);
    if (!log) return [];
    return log.slice(-last);
  }

  stats(): Record<string, unknown> {
    const all = [...this.gauges.values()];
    return {
      total: all.length,
      alerting: all.filter(g => g.alerted).length,
      totalReadings: all.reduce((s, g) => s + g.readings, 0),
      avgValue: all.length ? all.reduce((s, g) => s + g.value, 0) / all.length : 0,
      units: [...new Set(all.map(g => g.unit))],
    };
  }
}
