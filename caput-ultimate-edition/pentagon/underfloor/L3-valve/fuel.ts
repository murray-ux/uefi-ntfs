// L3-valve/fuel.ts
//
// ROOM: FUEL — Resource allocation and consumption tracking
//
// Every operation consumes fuel. The Fuel room tracks allocation,
// consumption, and remaining capacity across named resource pools.
// When a pool runs dry, operations are rejected until refuelled.
//
// Lives in L3 because resource allocation is a control-flow concern.

import { Kernel, Timestamp } from "../layer0-kernel";

export interface FuelPool {
  id: string;
  name: string;
  capacity: number;
  remaining: number;
  consumed: number;
  refilled: number;
  unit: string;
  autoRefill: boolean;
  refillRate: number;      // units per second
  lastRefill: number;      // epochMs
  createdAt: string;
}

export interface FuelReceipt {
  pool: string;
  amount: number;
  remaining: number;
  operation: string;
  ts: Timestamp;
}

export class Fuel {
  private readonly kernel: Kernel;
  private readonly pools = new Map<string, FuelPool>();
  private readonly receipts: FuelReceipt[] = [];
  private readonly maxReceipts: number;

  constructor(kernel: Kernel, maxReceipts: number = 10000) {
    this.kernel = kernel;
    this.maxReceipts = maxReceipts;

    // Default pools
    this.createPool("compute", 10000, "ops", true, 100);
    this.createPool("io", 5000, "bytes", true, 500);
    this.createPool("network", 1000, "reqs", true, 10);
    this.createPool("crypto", 2000, "ops", true, 50);
    this.createPool("storage", 100 * 1024 * 1024, "bytes", false, 0);
  }

  // ── Pool management ────────────────────────────────────────────────────

  createPool(name: string, capacity: number, unit: string, autoRefill = false, refillRate = 0): FuelPool {
    const pool: FuelPool = {
      id: this.kernel.deriveId("fuel-pool", name),
      name,
      capacity,
      remaining: capacity,
      consumed: 0,
      refilled: 0,
      unit,
      autoRefill,
      refillRate,
      lastRefill: Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.pools.set(name, pool);
    return pool;
  }

  // ── Consume ────────────────────────────────────────────────────────────

  consume(poolName: string, amount: number, operation: string): FuelReceipt {
    const pool = this.pools.get(poolName);
    if (!pool) throw new Error(`Unknown fuel pool: ${poolName}`);

    // Auto-refill if enabled
    if (pool.autoRefill) this.refillAuto(pool);

    if (pool.remaining < amount) {
      throw new Error(`Fuel exhausted: ${poolName} needs ${amount} ${pool.unit}, has ${pool.remaining}`);
    }

    pool.remaining -= amount;
    pool.consumed += amount;

    const receipt: FuelReceipt = {
      pool: poolName,
      amount,
      remaining: pool.remaining,
      operation,
      ts: this.kernel.now(),
    };

    this.receipts.push(receipt);
    while (this.receipts.length > this.maxReceipts) this.receipts.shift();

    return receipt;
  }

  // ── Check (non-consuming) ──────────────────────────────────────────────

  canAfford(poolName: string, amount: number): boolean {
    const pool = this.pools.get(poolName);
    if (!pool) return false;
    if (pool.autoRefill) this.refillAuto(pool);
    return pool.remaining >= amount;
  }

  remaining(poolName: string): number {
    const pool = this.pools.get(poolName);
    if (!pool) return 0;
    if (pool.autoRefill) this.refillAuto(pool);
    return pool.remaining;
  }

  // ── Refill ─────────────────────────────────────────────────────────────

  refill(poolName: string, amount?: number): void {
    const pool = this.pools.get(poolName);
    if (!pool) throw new Error(`Unknown fuel pool: ${poolName}`);

    const toAdd = amount ?? pool.capacity;
    pool.remaining = Math.min(pool.capacity, pool.remaining + toAdd);
    pool.refilled += toAdd;
    pool.lastRefill = Date.now();
  }

  private refillAuto(pool: FuelPool): void {
    if (!pool.autoRefill || pool.refillRate === 0) return;
    const elapsed = (Date.now() - pool.lastRefill) / 1000;
    const toAdd = elapsed * pool.refillRate;
    if (toAdd >= 1) {
      pool.remaining = Math.min(pool.capacity, pool.remaining + Math.floor(toAdd));
      pool.refilled += Math.floor(toAdd);
      pool.lastRefill = Date.now();
    }
  }

  // ── Gauge (all pools) ──────────────────────────────────────────────────

  gauge(): Record<string, { remaining: number; capacity: number; percent: number; unit: string }> {
    const result: Record<string, { remaining: number; capacity: number; percent: number; unit: string }> = {};
    for (const [name, pool] of this.pools) {
      if (pool.autoRefill) this.refillAuto(pool);
      result[name] = {
        remaining: pool.remaining,
        capacity: pool.capacity,
        percent: Math.round((pool.remaining / pool.capacity) * 100),
        unit: pool.unit,
      };
    }
    return result;
  }

  recentReceipts(count = 50): FuelReceipt[] {
    return this.receipts.slice(-count);
  }

  stats(): { pools: number; totalConsumed: Record<string, number>; totalRefilled: Record<string, number> } {
    const consumed: Record<string, number> = {};
    const refilled: Record<string, number> = {};
    for (const [name, pool] of this.pools) {
      consumed[name] = pool.consumed;
      refilled[name] = pool.refilled;
    }
    return { pools: this.pools.size, totalConsumed: consumed, totalRefilled: refilled };
  }
}
