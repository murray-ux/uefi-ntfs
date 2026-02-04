// pentagon/underfloor/L2-reservoir/jack.ts
//
// ROOM: JACK — Data elevation, lifting payloads between layers.
// Lift operations move data upward through the Pentagon stack; lower
// operations push data back down. Every operation is tracked with
// status, timing, and retry support.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

type LiftStatus = "queued" | "lifting" | "delivered" | "failed";

interface LiftOp {
  id: string;
  payload: unknown;
  fromLayer: number;
  toLayer: number;
  status: LiftStatus;
  startedAt: number | null;
  completedAt: number | null;
}

export class Jack {
  private readonly kernel: Kernel;
  private readonly ops: Map<string, LiftOp> = new Map();
  private seq = 0;
  private delivered = 0;
  private failed = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  lift(payload: unknown, from: number, to: number): LiftOp {
    const id = `lift-${++this.seq}`;
    const op: LiftOp = {
      id, payload, fromLayer: from, toLayer: to,
      status: "queued", startedAt: null, completedAt: null,
    };
    this.ops.set(id, op);
    op.status = "lifting";
    op.startedAt = Date.now();
    return op;
  }

  lower(payload: unknown, from: number, to: number): LiftOp {
    const id = `lift-${++this.seq}`;
    const op: LiftOp = {
      id, payload, fromLayer: from, toLayer: to,
      status: "queued", startedAt: null, completedAt: null,
    };
    this.ops.set(id, op);
    op.status = "lifting";
    op.startedAt = Date.now();
    return op;
  }

  queue(): LiftOp[] {
    return [...this.ops.values()].filter(o => o.status === "queued" || o.status === "lifting");
  }

  complete(id: string): boolean {
    const op = this.ops.get(id);
    if (!op || op.status === "delivered" || op.status === "failed") return false;
    op.status = "delivered";
    op.completedAt = Date.now();
    this.delivered++;
    return true;
  }

  retry(id: string): boolean {
    const op = this.ops.get(id);
    if (!op || op.status !== "failed") return false;
    op.status = "lifting";
    op.startedAt = Date.now();
    op.completedAt = null;
    this.failed--;
    return true;
  }

  fail(id: string): boolean {
    const op = this.ops.get(id);
    if (!op || op.status === "delivered") return false;
    op.status = "failed";
    op.completedAt = Date.now();
    this.failed++;
    return true;
  }

  throughput(): { delivered: number; failed: number; pending: number } {
    const pending = [...this.ops.values()].filter(
      o => o.status === "queued" || o.status === "lifting",
    ).length;
    return { delivered: this.delivered, failed: this.failed, pending };
  }

  stats(): Record<string, unknown> {
    const all = [...this.ops.values()];
    return {
      totalOps: all.length,
      delivered: this.delivered,
      failed: this.failed,
      queued: all.filter(o => o.status === "queued").length,
      lifting: all.filter(o => o.status === "lifting").length,
    };
  }
}
