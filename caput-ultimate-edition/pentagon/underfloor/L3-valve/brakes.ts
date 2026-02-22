// L3-valve/brakes.ts
//
// ROOM: BRAKES — Emergency stop and graceful slowdown
//
// Three braking modes:
//   ABS    — Anti-lock: progressive throttling (reduce rate 25% per trigger)
//   EBRAKE — Emergency brake: instant full stop, queue everything
//   COAST  — Release brakes, resume normal operation
//
// When brakes are applied, all Manifold operations queue until released.
// Lives in L3 because braking is a control-flow concern.

import { Kernel, Timestamp } from "../layer0-kernel";

export type BrakeMode = "abs" | "ebrake" | "coast";

export interface BrakeState {
  mode: BrakeMode;
  appliedAt: Timestamp | null;
  reason: string | null;
  throttle: number;             // 1.0 = full speed, 0.0 = full stop
  queued: number;               // operations waiting
  absLevel: number;             // how many ABS pumps (0 = no braking)
}

export interface QueuedOperation {
  id: string;
  action: string;
  queuedAt: Timestamp;
  resolve: () => void;
  reject: (err: Error) => void;
}

export class Brakes {
  private readonly kernel: Kernel;
  private mode: BrakeMode = "coast";
  private appliedAt: Timestamp | null = null;
  private reason: string | null = null;
  private throttle = 1.0;
  private absLevel = 0;
  private readonly queue: QueuedOperation[] = [];
  private totalStops = 0;
  private totalQueued = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  // ── Apply ──────────────────────────────────────────────────────────────

  abs(reason: string): BrakeState {
    this.absLevel = Math.min(this.absLevel + 1, 4);
    this.throttle = Math.max(0.0, 1.0 - this.absLevel * 0.25);
    this.mode = this.throttle === 0 ? "ebrake" : "abs";
    this.appliedAt = this.kernel.now();
    this.reason = reason;
    return this.state();
  }

  ebrake(reason: string): BrakeState {
    this.mode = "ebrake";
    this.throttle = 0.0;
    this.absLevel = 4;
    this.appliedAt = this.kernel.now();
    this.reason = reason;
    this.totalStops++;
    return this.state();
  }

  coast(): BrakeState {
    this.mode = "coast";
    this.throttle = 1.0;
    this.absLevel = 0;
    this.appliedAt = null;
    this.reason = null;

    // Drain queue
    while (this.queue.length > 0) {
      const op = this.queue.shift()!;
      op.resolve();
    }

    return this.state();
  }

  // ── Gate ───────────────────────────────────────────────────────────────

  async gate(action: string): Promise<void> {
    // Coast = pass through
    if (this.mode === "coast") return;

    // ABS = probabilistic throttle
    if (this.mode === "abs") {
      if (Math.random() < this.throttle) return;
      // Throttled — queue it
    }

    // EBRAKE or throttled ABS — queue
    return new Promise<void>((resolve, reject) => {
      const op: QueuedOperation = {
        id: this.kernel.monotonicId(),
        action,
        queuedAt: this.kernel.now(),
        resolve,
        reject,
      };
      this.queue.push(op);
      this.totalQueued++;
    });
  }

  // ── State ──────────────────────────────────────────────────────────────

  state(): BrakeState {
    return {
      mode: this.mode,
      appliedAt: this.appliedAt,
      reason: this.reason,
      throttle: this.throttle,
      queued: this.queue.length,
      absLevel: this.absLevel,
    };
  }

  isEngaged(): boolean {
    return this.mode !== "coast";
  }

  stats(): Record<string, unknown> {
    return {
      ...this.state(),
      totalStops: this.totalStops,
      totalQueued: this.totalQueued,
    };
  }
}
