// pentagon/underfloor/L0-kernel/clock.ts
//
// ROOM: CLOCK — Precision timing, scheduling, and epoch management.
// Monotonic timers, cron-style scheduling, drift detection, tick-tock heartbeats.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface ScheduledTask {
  id: string;
  name: string;
  intervalMs: number;
  fn: () => void | Promise<void>;
  lastRun: number;
  nextRun: number;
  runs: number;
  enabled: boolean;
}

interface Timer {
  id: string;
  label: string;
  startedAt: number;
  stoppedAt: number | null;
  laps: number[];
}

export class Clock {
  private readonly kernel: Kernel;
  private readonly tasks: Map<string, ScheduledTask> = new Map();
  private readonly timers: Map<string, Timer> = new Map();
  private readonly heartbeats: Map<string, { lastBeat: number; intervalMs: number; missed: number }> = new Map();
  private epochOffset = 0;
  private driftSamples: number[] = [];
  private readonly maxDriftSamples: number;

  constructor(kernel: Kernel, maxDriftSamples = 100) {
    this.kernel = kernel;
    this.maxDriftSamples = maxDriftSamples;
  }

  // ── Scheduling ──────────────────────────────────────────────────────

  schedule(name: string, intervalMs: number, fn: () => void | Promise<void>): string {
    const id = this.kernel.deriveId("clock", name);
    const now = Date.now();
    this.tasks.set(id, { id, name, intervalMs, fn, lastRun: 0, nextRun: now + intervalMs, runs: 0, enabled: true });
    return id;
  }

  unschedule(name: string): boolean {
    for (const [id, task] of this.tasks) {
      if (task.name === name) { this.tasks.delete(id); return true; }
    }
    return false;
  }

  async tick(): Promise<{ executed: string[]; skipped: string[] }> {
    const now = Date.now();
    const executed: string[] = [];
    const skipped: string[] = [];
    for (const task of this.tasks.values()) {
      if (!task.enabled) { skipped.push(task.name); continue; }
      if (now >= task.nextRun) {
        try { await task.fn(); } catch { /* task failure isolated */ }
        task.lastRun = now;
        task.nextRun = now + task.intervalMs;
        task.runs++;
        executed.push(task.name);
      }
    }
    return { executed, skipped };
  }

  // ── Stopwatch timers ────────────────────────────────────────────────

  startTimer(label: string): string {
    const id = this.kernel.monotonicId();
    this.timers.set(id, { id, label, startedAt: Date.now(), stoppedAt: null, laps: [] });
    return id;
  }

  lap(id: string): number {
    const timer = this.timers.get(id);
    if (!timer || timer.stoppedAt) return -1;
    const elapsed = Date.now() - timer.startedAt;
    timer.laps.push(elapsed);
    return elapsed;
  }

  stopTimer(id: string): number {
    const timer = this.timers.get(id);
    if (!timer || timer.stoppedAt) return -1;
    timer.stoppedAt = Date.now();
    return timer.stoppedAt - timer.startedAt;
  }

  getTimer(id: string): Timer | null {
    return this.timers.get(id) ?? null;
  }

  // ── Heartbeat monitoring ────────────────────────────────────────────

  registerHeartbeat(name: string, expectedIntervalMs: number): void {
    this.heartbeats.set(name, { lastBeat: Date.now(), intervalMs: expectedIntervalMs, missed: 0 });
  }

  beat(name: string): void {
    const hb = this.heartbeats.get(name);
    if (hb) { hb.lastBeat = Date.now(); hb.missed = 0; }
  }

  checkHeartbeats(): Array<{ name: string; healthy: boolean; missedMs: number; missed: number }> {
    const now = Date.now();
    const results: Array<{ name: string; healthy: boolean; missedMs: number; missed: number }> = [];
    for (const [name, hb] of this.heartbeats) {
      const elapsed = now - hb.lastBeat;
      const healthy = elapsed < hb.intervalMs * 2;
      if (!healthy) hb.missed++;
      results.push({ name, healthy, missedMs: Math.max(0, elapsed - hb.intervalMs), missed: hb.missed });
    }
    return results;
  }

  // ── Drift detection ─────────────────────────────────────────────────

  recordDrift(expectedMs: number, actualMs: number): void {
    this.driftSamples.push(actualMs - expectedMs);
    while (this.driftSamples.length > this.maxDriftSamples) this.driftSamples.shift();
  }

  drift(): { samples: number; avgMs: number; maxMs: number; stable: boolean } {
    if (this.driftSamples.length === 0) return { samples: 0, avgMs: 0, maxMs: 0, stable: true };
    const avg = this.driftSamples.reduce((a, b) => a + b, 0) / this.driftSamples.length;
    const max = Math.max(...this.driftSamples.map(Math.abs));
    return { samples: this.driftSamples.length, avgMs: Math.round(avg * 100) / 100, maxMs: max, stable: max < 100 };
  }

  // ── Stats ───────────────────────────────────────────────────────────

  stats(): Record<string, unknown> {
    return {
      scheduledTasks: this.tasks.size,
      activeTimers: [...this.timers.values()].filter(t => !t.stoppedAt).length,
      completedTimers: [...this.timers.values()].filter(t => t.stoppedAt).length,
      heartbeats: this.heartbeats.size,
      drift: this.drift(),
    };
  }
}
