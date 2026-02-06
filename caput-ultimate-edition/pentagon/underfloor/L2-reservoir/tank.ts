// pentagon/underfloor/L2-reservoir/tank.ts
//
// ROOM: TANK — Buffered stream storage and backpressure management.
// Each tank holds a named stream with configurable capacity, fill/drain
// rates, and overflow tracking. Backpressure is derived from aggregate
// fill levels across all active tanks.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface TankEntry {
  id: string;
  stream: string;
  capacity: number;
  level: number;
  drainRate: number;
  fillRate: number;
  overflowCount: number;
  createdAt: number;
}

export class Tank {
  private readonly kernel: Kernel;
  private readonly tanks: Map<string, TankEntry> = new Map();
  private seq = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  create(stream: string, capacity: number): TankEntry {
    const id = `tank-${++this.seq}`;
    const entry: TankEntry = {
      id, stream, capacity, level: 0,
      drainRate: 0, fillRate: 0, overflowCount: 0,
      createdAt: Date.now(),
    };
    this.tanks.set(id, entry);
    return entry;
  }

  fill(id: string, amount: number): { level: number; overflow: boolean } {
    const t = this.tanks.get(id);
    if (!t) return { level: 0, overflow: false };

    t.fillRate = amount;
    t.level += amount;
    if (t.level > t.capacity) {
      t.overflowCount++;
      t.level = t.capacity;
      return { level: t.level, overflow: true };
    }
    return { level: t.level, overflow: false };
  }

  drain(id: string, amount: number): { level: number; drained: number } {
    const t = this.tanks.get(id);
    if (!t) return { level: 0, drained: 0 };

    const drained = Math.min(amount, t.level);
    t.drainRate = drained;
    t.level -= drained;
    return { level: t.level, drained };
  }

  level(id: string): number {
    return this.tanks.get(id)?.level ?? 0;
  }

  overflow(id: string): number {
    return this.tanks.get(id)?.overflowCount ?? 0;
  }

  flush(id: string): boolean {
    const t = this.tanks.get(id);
    if (!t) return false;
    t.level = 0;
    t.drainRate = 0;
    t.fillRate = 0;
    return true;
  }

  pressure(): number {
    const all = [...this.tanks.values()];
    if (all.length === 0) return 0;
    const totalRatio = all.reduce((s, t) => s + t.level / t.capacity, 0);
    return totalRatio / all.length;
  }

  stats(): Record<string, unknown> {
    const all = [...this.tanks.values()];
    return {
      totalTanks: all.length,
      totalCapacity: all.reduce((s, t) => s + t.capacity, 0),
      totalLevel: all.reduce((s, t) => s + t.level, 0),
      totalOverflows: all.reduce((s, t) => s + t.overflowCount, 0),
      pressure: this.pressure(),
    };
  }
}
