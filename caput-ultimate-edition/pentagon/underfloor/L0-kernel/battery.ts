// L0-kernel/battery.ts
//
// ROOM: BATTERY — Entropy pool and power budget
//
// Manages the system's entropy supply and computational budget.
// Every crypto operation costs energy. The Battery tracks how much
// entropy has been consumed, refills from OS sources, and enforces
// power budgets so no single operation can drain the pool.
//
// Lives in L0 because entropy is the most primitive resource.

import { randomBytes, randomFillSync } from "crypto";
import { Kernel, Timestamp } from "../layer0-kernel";

export interface ChargeLevel {
  available: number;       // bytes of entropy available
  capacity: number;        // max pool size
  consumed: number;        // total consumed since boot
  refilled: number;        // total refilled since boot
  percent: number;
  status: "full" | "good" | "low" | "critical" | "dead";
}

export interface PowerBudget {
  id: string;
  allocated: number;       // bytes
  consumed: number;
  remaining: number;
  expired: boolean;
  expiresAt: number;       // epochMs
}

export class Battery {
  private readonly kernel: Kernel;
  private pool: Buffer;
  private readonly capacity: number;
  private offset: number;          // read cursor into pool
  private totalConsumed: number = 0;
  private totalRefilled: number = 0;
  private readonly budgets = new Map<string, PowerBudget>();

  constructor(kernel: Kernel, capacityBytes: number = 8192) {
    this.kernel = kernel;
    this.capacity = capacityBytes;
    this.pool = randomBytes(capacityBytes);
    this.offset = 0;
    this.totalRefilled = capacityBytes;
  }

  // ── Draw entropy ───────────────────────────────────────────────────────

  draw(bytes: number, budgetId?: string): Buffer {
    // Budget enforcement
    if (budgetId) {
      const budget = this.budgets.get(budgetId);
      if (!budget) throw new Error(`Unknown budget: ${budgetId}`);
      if (budget.expired || Date.now() > budget.expiresAt) {
        budget.expired = true;
        throw new Error(`Budget ${budgetId} expired`);
      }
      if (budget.remaining < bytes) {
        throw new Error(`Budget ${budgetId} exhausted: need ${bytes}, have ${budget.remaining}`);
      }
      budget.consumed += bytes;
      budget.remaining -= bytes;
    }

    // If pool has enough, slice from it
    if (this.available() >= bytes) {
      const chunk = this.pool.subarray(this.offset, this.offset + bytes);
      const result = Buffer.from(chunk); // copy
      // Wipe consumed region
      chunk.fill(0);
      this.offset += bytes;
      this.totalConsumed += bytes;
      return result;
    }

    // Pool depleted — refill and try again
    this.refill();
    if (this.available() < bytes) {
      throw new Error(`Battery critical: cannot supply ${bytes} bytes after refill`);
    }
    return this.draw(bytes, undefined); // don't double-charge budget
  }

  // ── Refill from OS entropy ─────────────────────────────────────────────

  refill(): void {
    this.pool = randomBytes(this.capacity);
    this.offset = 0;
    this.totalRefilled += this.capacity;
  }

  // ── Charge level ───────────────────────────────────────────────────────

  available(): number {
    return this.capacity - this.offset;
  }

  charge(): ChargeLevel {
    const available = this.available();
    const percent = Math.round((available / this.capacity) * 100);
    let status: ChargeLevel["status"];
    if (percent >= 80) status = "full";
    else if (percent >= 50) status = "good";
    else if (percent >= 20) status = "low";
    else if (percent > 0) status = "critical";
    else status = "dead";

    return {
      available,
      capacity: this.capacity,
      consumed: this.totalConsumed,
      refilled: this.totalRefilled,
      percent,
      status,
    };
  }

  // ── Power budgets ──────────────────────────────────────────────────────

  allocateBudget(id: string, bytes: number, ttlMs: number = 60000): PowerBudget {
    const budget: PowerBudget = {
      id,
      allocated: bytes,
      consumed: 0,
      remaining: bytes,
      expired: false,
      expiresAt: Date.now() + ttlMs,
    };
    this.budgets.set(id, budget);
    return budget;
  }

  releaseBudget(id: string): boolean {
    return this.budgets.delete(id);
  }

  getBudget(id: string): PowerBudget | null {
    return this.budgets.get(id) ?? null;
  }

  // ── Secure wipe ────────────────────────────────────────────────────────

  zeroPool(): void {
    this.pool.fill(0);
    this.offset = this.capacity;
  }

  // ── Diagnostics ────────────────────────────────────────────────────────

  status(): Record<string, unknown> {
    const charge = this.charge();
    return {
      charge,
      activeBudgets: this.budgets.size,
      budgets: [...this.budgets.values()].map((b) => ({
        id: b.id,
        allocated: b.allocated,
        remaining: b.remaining,
        expired: b.expired,
      })),
    };
  }
}
