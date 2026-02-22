// L1-conduit/flares.ts
//
// ROOM: FLARES — Alert and notification system
//
// Fires structured alerts across the system. Severity-graded,
// de-duplicated, throttled. Other rooms fire flares; they never
// build their own alert mechanisms.
//
// Lives in L1 because alerts are messages that need routing.

import { Kernel, Timestamp } from "../layer0-kernel";
import { Conduit, LayerId } from "../layer1-conduit";

export type Severity = "info" | "warning" | "error" | "critical" | "fatal";

export interface Flare {
  readonly id: string;
  readonly severity: Severity;
  readonly source: string;
  readonly code: string;
  readonly message: string;
  readonly context: Record<string, unknown>;
  readonly firedAt: Timestamp;
  readonly fingerprint: string;
  acknowledged: boolean;
}

export type FlareHandler = (flare: Flare) => void | Promise<void>;

export class Flares {
  private readonly kernel: Kernel;
  private readonly conduit: Conduit;
  private readonly log: Flare[] = [];
  private readonly maxLog: number;
  private readonly dedup = new Map<string, number>(); // fingerprint → last fire epochMs
  private readonly dedupWindowMs: number;
  private readonly handlers: FlareHandler[] = [];
  private suppressed = 0;

  constructor(kernel: Kernel, conduit: Conduit, opts?: { maxLog?: number; dedupWindowMs?: number }) {
    this.kernel = kernel;
    this.conduit = conduit;
    this.maxLog = opts?.maxLog ?? 5000;
    this.dedupWindowMs = opts?.dedupWindowMs ?? 5000;
  }

  onFlare(handler: FlareHandler): void {
    this.handlers.push(handler);
  }

  async fire(severity: Severity, source: string, code: string, message: string, context: Record<string, unknown> = {}): Promise<Flare | null> {
    const fingerprint = this.kernel.hash(`${severity}:${source}:${code}`).hex.slice(0, 16);
    const now = this.kernel.now();

    // De-duplicate
    const lastFired = this.dedup.get(fingerprint);
    if (lastFired && now.epochMs - lastFired < this.dedupWindowMs) {
      this.suppressed++;
      return null;
    }
    this.dedup.set(fingerprint, now.epochMs);

    const flare: Flare = {
      id: this.kernel.monotonicId(),
      severity,
      source,
      code,
      message,
      context,
      firedAt: now,
      fingerprint,
      acknowledged: false,
    };

    this.log.push(flare);
    while (this.log.length > this.maxLog) this.log.shift();

    // Notify handlers
    for (const h of this.handlers) {
      try { await h(flare); } catch { /* handler failure must not crash flares */ }
    }

    // Signal via conduit
    await this.conduit.send("conduit", "reservoir", "flare:fired", {
      id: flare.id, severity, source, code,
    });

    return flare;
  }

  acknowledge(id: string): boolean {
    const flare = this.log.find((f) => f.id === id);
    if (!flare) return false;
    flare.acknowledged = true;
    return true;
  }

  active(minSeverity: Severity = "warning"): Flare[] {
    const levels: Record<Severity, number> = { info: 0, warning: 1, error: 2, critical: 3, fatal: 4 };
    const threshold = levels[minSeverity];
    return this.log.filter((f) => !f.acknowledged && levels[f.severity] >= threshold);
  }

  recent(count = 50): Flare[] {
    return this.log.slice(-count);
  }

  stats(): { total: number; active: number; suppressed: number; bySeverity: Record<string, number> } {
    const bySeverity: Record<string, number> = {};
    for (const f of this.log) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    }
    return {
      total: this.log.length,
      active: this.active().length,
      suppressed: this.suppressed,
      bySeverity,
    };
  }
}
