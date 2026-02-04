// L3-valve/wipers.ts
//
// ROOM: WIPERS — Periodic cleanup and garbage collection
//
// Runs scheduled sweeps across the system. Clears expired entries,
// prunes dead letters, rotates logs, reaps stale locks. The Wipers
// run on a configurable schedule or on-demand.
//
// Lives in L3 because cleanup is a control-flow concern.

import { Kernel, Timestamp } from "../layer0-kernel";

export interface WiperTask {
  id: string;
  name: string;
  fn: () => Promise<WipeResult> | WipeResult;
  intervalMs: number;
  lastRun: Timestamp | null;
  nextRun: number;            // epochMs
  enabled: boolean;
}

export interface WipeResult {
  task: string;
  cleaned: number;
  freedBytes: number;
  durationMs: number;
  errors: string[];
}

export interface WiperSweepResult {
  tasks: WipeResult[];
  totalCleaned: number;
  totalFreed: number;
  totalDurationMs: number;
  ts: Timestamp;
}

export class Wipers {
  private readonly kernel: Kernel;
  private readonly tasks = new Map<string, WiperTask>();
  private totalSweeps = 0;
  private totalCleaned = 0;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  // ── Task registration ──────────────────────────────────────────────────

  register(name: string, fn: () => Promise<WipeResult> | WipeResult, intervalMs: number = 60000): void {
    const id = this.kernel.deriveId("wiper", name);
    this.tasks.set(id, {
      id,
      name,
      fn,
      intervalMs,
      lastRun: null,
      nextRun: Date.now() + intervalMs,
      enabled: true,
    });
  }

  unregister(name: string): boolean {
    for (const [id, task] of this.tasks) {
      if (task.name === name) {
        this.tasks.delete(id);
        return true;
      }
    }
    return false;
  }

  enable(name: string): boolean {
    for (const task of this.tasks.values()) {
      if (task.name === name) { task.enabled = true; return true; }
    }
    return false;
  }

  disable(name: string): boolean {
    for (const task of this.tasks.values()) {
      if (task.name === name) { task.enabled = false; return true; }
    }
    return false;
  }

  // ── Manual sweep ───────────────────────────────────────────────────────

  async sweep(force = false): Promise<WiperSweepResult> {
    const ts = this.kernel.now();
    const results: WipeResult[] = [];
    const now = Date.now();

    for (const task of this.tasks.values()) {
      if (!task.enabled) continue;
      if (!force && now < task.nextRun) continue;

      const start = performance.now();
      try {
        const result = await task.fn();
        result.durationMs = Math.round(performance.now() - start);
        results.push(result);
        this.totalCleaned += result.cleaned;
      } catch (err) {
        results.push({
          task: task.name,
          cleaned: 0,
          freedBytes: 0,
          durationMs: Math.round(performance.now() - start),
          errors: [String(err)],
        });
      }

      task.lastRun = this.kernel.now();
      task.nextRun = now + task.intervalMs;
    }

    this.totalSweeps++;

    return {
      tasks: results,
      totalCleaned: results.reduce((sum, r) => sum + r.cleaned, 0),
      totalFreed: results.reduce((sum, r) => sum + r.freedBytes, 0),
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      ts,
    };
  }

  // ── Auto-sweep (background) ────────────────────────────────────────────

  start(tickMs: number = 10000): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(async () => {
      try { await this.sweep(); } catch { /* swallow */ }
    }, tickMs);
    // Don't block process exit
    if (this.timer && typeof this.timer === "object" && "unref" in this.timer) {
      (this.timer as NodeJS.Timeout).unref();
    }
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ── Query ──────────────────────────────────────────────────────────────

  listTasks(): Array<{ name: string; enabled: boolean; lastRun: string | null; intervalMs: number }> {
    return [...this.tasks.values()].map((t) => ({
      name: t.name,
      enabled: t.enabled,
      lastRun: t.lastRun?.iso ?? null,
      intervalMs: t.intervalMs,
    }));
  }

  stats(): { tasks: number; enabled: number; totalSweeps: number; totalCleaned: number; running: boolean } {
    const enabled = [...this.tasks.values()].filter((t) => t.enabled).length;
    return { tasks: this.tasks.size, enabled, totalSweeps: this.totalSweeps, totalCleaned: this.totalCleaned, running: this.running };
  }
}
