// L0-kernel/thermostat.ts
//
// ROOM: THERMOSTAT — System temperature monitoring
//
// Tracks thermal metrics across every layer: CPU load, memory pressure,
// event throughput, error rates. Sets thresholds. Trips alarms.
// Other rooms read the thermostat; they never measure temperature themselves.
//
// Lives in L0 because temperature is a primitive signal — like voltage.

import { Kernel, Timestamp } from "../layer0-kernel";

export interface ThermalReading {
  zone: string;
  value: number;
  unit: string;
  ts: Timestamp;
  status: "nominal" | "warm" | "hot" | "critical";
}

export interface ThermalThresholds {
  warm: number;
  hot: number;
  critical: number;
}

interface ThermalZone {
  name: string;
  unit: string;
  thresholds: ThermalThresholds;
  readings: ThermalReading[];
  maxHistory: number;
}

export class Thermostat {
  private readonly kernel: Kernel;
  private readonly zones = new Map<string, ThermalZone>();

  constructor(kernel: Kernel) {
    this.kernel = kernel;

    // Default zones
    this.addZone("cpu.load", "%", { warm: 60, hot: 80, critical: 95 });
    this.addZone("memory.used", "%", { warm: 70, hot: 85, critical: 95 });
    this.addZone("disk.used", "%", { warm: 75, hot: 90, critical: 97 });
    this.addZone("events.per_sec", "evt/s", { warm: 500, hot: 1000, critical: 5000 });
    this.addZone("errors.per_min", "err/m", { warm: 5, hot: 20, critical: 100 });
    this.addZone("latency.p99_ms", "ms", { warm: 200, hot: 500, critical: 2000 });
    this.addZone("queue.depth", "msgs", { warm: 100, hot: 500, critical: 2000 });
    this.addZone("entropy.available", "bits", { warm: 512, hot: 256, critical: 64 });
  }

  addZone(name: string, unit: string, thresholds: ThermalThresholds, maxHistory = 120): void {
    this.zones.set(name, { name, unit, thresholds, readings: [], maxHistory });
  }

  record(zone: string, value: number): ThermalReading {
    const z = this.zones.get(zone);
    if (!z) throw new Error(`Unknown thermal zone: ${zone}`);

    const status = this.classify(value, z.thresholds, zone);
    const reading: ThermalReading = { zone, value, unit: z.unit, ts: this.kernel.now(), status };

    z.readings.push(reading);
    while (z.readings.length > z.maxHistory) z.readings.shift();

    return reading;
  }

  private classify(value: number, t: ThermalThresholds, zone: string): ThermalReading["status"] {
    // For entropy, logic is inverted — lower is worse
    if (zone.startsWith("entropy")) {
      if (value <= t.critical) return "critical";
      if (value <= t.hot) return "hot";
      if (value <= t.warm) return "warm";
      return "nominal";
    }
    if (value >= t.critical) return "critical";
    if (value >= t.hot) return "hot";
    if (value >= t.warm) return "warm";
    return "nominal";
  }

  read(zone: string): ThermalReading | null {
    const z = this.zones.get(zone);
    if (!z || z.readings.length === 0) return null;
    return z.readings[z.readings.length - 1];
  }

  readAll(): ThermalReading[] {
    const readings: ThermalReading[] = [];
    for (const z of this.zones.values()) {
      if (z.readings.length > 0) readings.push(z.readings[z.readings.length - 1]);
    }
    return readings;
  }

  trend(zone: string, windowSize = 10): { avg: number; min: number; max: number; direction: "rising" | "falling" | "stable" } | null {
    const z = this.zones.get(zone);
    if (!z || z.readings.length < 2) return null;

    const window = z.readings.slice(-windowSize);
    const values = window.map((r) => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const first = values[0];
    const last = values[values.length - 1];
    const delta = last - first;
    const direction = Math.abs(delta) < avg * 0.05 ? "stable" : delta > 0 ? "rising" : "falling";

    return { avg: Math.round(avg * 100) / 100, min, max, direction };
  }

  alarms(): ThermalReading[] {
    return this.readAll().filter((r) => r.status === "hot" || r.status === "critical");
  }

  sweep(): Record<string, unknown> {
    const zones: Record<string, unknown> = {};
    for (const [name, z] of this.zones) {
      const last = z.readings.length > 0 ? z.readings[z.readings.length - 1] : null;
      zones[name] = {
        current: last?.value ?? null,
        status: last?.status ?? "unknown",
        unit: z.unit,
        readings: z.readings.length,
        trend: this.trend(name),
      };
    }
    const alarms = this.alarms();
    return { zones, alarmCount: alarms.length, alarms: alarms.map((a) => ({ zone: a.zone, value: a.value, status: a.status })) };
  }
}
