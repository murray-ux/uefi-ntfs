// pentagon/underfloor/L4-manifold/chassis.ts
//
// ROOM: CHASSIS — Structural framework, module mounting, and load distribution.
// Provides named mount points for modules with weight tracking, load balancing,
// and capacity management across the manifold frame.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

export interface MountPoint {
  name: string;
  module: string;
  weight: number;
  mounted: boolean;
  mountedAt: number | null;
  load: number;
}

export class Chassis {
  private readonly kernel: Kernel;
  private readonly mounts: Map<string, MountPoint> = new Map();
  private maxCapacity = 10000;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  addMount(name: string, module: string, weight: number): void {
    this.mounts.set(name, {
      name, module, weight, mounted: false, mountedAt: null, load: 0,
    });
  }

  mount(name: string): boolean {
    const mp = this.mounts.get(name);
    if (!mp || mp.mounted) return false;
    mp.mounted = true;
    mp.mountedAt = Date.now();
    return true;
  }

  unmount(name: string): boolean {
    const mp = this.mounts.get(name);
    if (!mp || !mp.mounted) return false;
    mp.mounted = false;
    mp.mountedAt = null;
    mp.load = 0;
    return true;
  }

  rebalance(): number {
    const mounted = [...this.mounts.values()].filter(m => m.mounted);
    if (mounted.length === 0) return 0;
    const totalLoad = mounted.reduce((s, m) => s + m.load, 0);
    const avg = totalLoad / mounted.length;
    let corrections = 0;
    for (const mp of mounted) {
      if (mp.load !== avg) {
        mp.load = avg;
        corrections++;
      }
    }
    return corrections;
  }

  load(name: string, amount: number): boolean {
    const mp = this.mounts.get(name);
    if (!mp || !mp.mounted) return false;
    const totalLoad = [...this.mounts.values()].reduce((s, m) => s + m.load, 0);
    if (totalLoad + amount > this.maxCapacity) return false;
    mp.load += amount;
    return true;
  }

  capacity(): { used: number; max: number; remaining: number } {
    const used = [...this.mounts.values()].reduce((s, m) => s + m.load, 0);
    return { used, max: this.maxCapacity, remaining: this.maxCapacity - used };
  }

  manifest(): MountPoint[] {
    return [...this.mounts.values()];
  }

  stats(): Record<string, unknown> {
    const all = [...this.mounts.values()];
    const mounted = all.filter(m => m.mounted);
    return {
      total: all.length,
      mounted: mounted.length,
      unmounted: all.length - mounted.length,
      totalWeight: all.reduce((s, m) => s + m.weight, 0),
      totalLoad: all.reduce((s, m) => s + m.load, 0),
      capacityUsedPct: all.length ? (all.reduce((s, m) => s + m.load, 0) / this.maxCapacity) * 100 : 0,
    };
  }
}
