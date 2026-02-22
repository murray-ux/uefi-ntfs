// pentagon/underfloor/L3-valve/seatbelts.ts
//
// ROOM: SEATBELTS — Safety constraints and rollback guards.
// Each belt stores a checkpoint snapshot when fastened. On rollback,
// the checkpoint is returned so the caller can restore prior state.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface Belt {
  name: string;
  fastened: boolean;
  checkpoint: unknown;
  fastenedAt: number | null;
  trips: number;
}

export class Seatbelts {
  private readonly kernel: Kernel;
  private readonly belts: Map<string, Belt> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  fasten(name: string, checkpoint?: unknown): boolean {
    let belt = this.belts.get(name);
    if (!belt) {
      belt = { name, fastened: false, checkpoint: null, fastenedAt: null, trips: 0 };
      this.belts.set(name, belt);
    }
    belt.fastened = true;
    belt.checkpoint = checkpoint ?? belt.checkpoint;
    belt.fastenedAt = Date.now();
    return true;
  }

  unfasten(name: string): boolean {
    const belt = this.belts.get(name);
    if (!belt || !belt.fastened) return false;
    belt.fastened = false;
    return true;
  }

  check(name: string): Belt | null {
    return this.belts.get(name) ?? null;
  }

  trip(name: string): boolean {
    const belt = this.belts.get(name);
    if (!belt) return false;
    belt.trips++;
    return true;
  }

  rollback(name: string): unknown {
    const belt = this.belts.get(name);
    if (!belt || !belt.fastened) return null;
    const snapshot = belt.checkpoint;
    belt.fastened = false;
    belt.trips++;
    return snapshot;
  }

  allFastened(): boolean {
    if (this.belts.size === 0) return false;
    for (const belt of this.belts.values()) {
      if (!belt.fastened) return false;
    }
    return true;
  }

  stats(): Record<string, unknown> {
    const all = [...this.belts.values()];
    return {
      total: all.length,
      fastened: all.filter(b => b.fastened).length,
      unfastened: all.filter(b => !b.fastened).length,
      totalTrips: all.reduce((s, b) => s + b.trips, 0),
      withCheckpoints: all.filter(b => b.checkpoint !== null).length,
    };
  }
}
