// pentagon/underfloor/L0-kernel/fuse.ts
//
// ROOM: FUSE — Circuit protection and hard limits.
// When a fuse blows, the circuit is dead until manually reset.
// Tracks blow counts, cooldown periods, and cascade detection.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

type FuseState = "intact" | "blown" | "cooldown";

interface FuseEntry {
  name: string;
  state: FuseState;
  maxCurrent: number;
  currentLoad: number;
  blowCount: number;
  lastBlown: number | null;
  cooldownMs: number;
  cooldownUntil: number;
}

export class Fuse {
  private readonly kernel: Kernel;
  private readonly fuses: Map<string, FuseEntry> = new Map();
  private cascadeLog: Array<{ fuse: string; ts: number; load: number }> = [];

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string, maxCurrent: number, cooldownMs = 0): void {
    this.fuses.set(name, {
      name, state: "intact", maxCurrent, currentLoad: 0,
      blowCount: 0, lastBlown: null, cooldownMs, cooldownUntil: 0,
    });
  }

  load(name: string, amount: number): { passed: boolean; state: FuseState } {
    const fuse = this.fuses.get(name);
    if (!fuse) return { passed: false, state: "blown" };

    const now = Date.now();
    if (fuse.state === "cooldown" && now >= fuse.cooldownUntil) {
      fuse.state = "intact";
      fuse.currentLoad = 0;
    }
    if (fuse.state !== "intact") return { passed: false, state: fuse.state };

    fuse.currentLoad += amount;
    if (fuse.currentLoad > fuse.maxCurrent) {
      fuse.state = fuse.cooldownMs > 0 ? "cooldown" : "blown";
      fuse.blowCount++;
      fuse.lastBlown = now;
      fuse.cooldownUntil = now + fuse.cooldownMs;
      this.cascadeLog.push({ fuse: name, ts: now, load: fuse.currentLoad });
      while (this.cascadeLog.length > 500) this.cascadeLog.shift();
      return { passed: false, state: fuse.state };
    }
    return { passed: true, state: "intact" };
  }

  reset(name: string): boolean {
    const fuse = this.fuses.get(name);
    if (!fuse) return false;
    fuse.state = "intact";
    fuse.currentLoad = 0;
    return true;
  }

  resetAll(): number {
    let count = 0;
    for (const fuse of this.fuses.values()) {
      if (fuse.state !== "intact") { fuse.state = "intact"; fuse.currentLoad = 0; count++; }
    }
    return count;
  }

  check(name: string): FuseEntry | null {
    return this.fuses.get(name) ?? null;
  }

  blown(): FuseEntry[] {
    return [...this.fuses.values()].filter(f => f.state === "blown" || f.state === "cooldown");
  }

  cascades(last = 20): Array<{ fuse: string; ts: number; load: number }> {
    return this.cascadeLog.slice(-last);
  }

  stats(): Record<string, unknown> {
    const all = [...this.fuses.values()];
    return {
      total: all.length,
      intact: all.filter(f => f.state === "intact").length,
      blown: all.filter(f => f.state === "blown").length,
      cooldown: all.filter(f => f.state === "cooldown").length,
      totalBlows: all.reduce((s, f) => s + f.blowCount, 0),
    };
  }
}
