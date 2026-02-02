// pentagon/underfloor/L3-valve/clutch.ts
//
// ROOM: CLUTCH — Engagement and disengagement of processing pipelines.
// Each pipeline has a clutch plate that can be engaged or disengaged.
// Slippage models partial engagement for soft transitions.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface ClutchPlate {
  name: string;
  engaged: boolean;
  slippage: number;
  engageCount: number;
  lastEngaged: number | null;
  lastDisengaged: number | null;
}

export class Clutch {
  private readonly kernel: Kernel;
  private readonly plates: Map<string, ClutchPlate> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string): void {
    this.plates.set(name, {
      name, engaged: false, slippage: 0,
      engageCount: 0, lastEngaged: null, lastDisengaged: null,
    });
  }

  remove(name: string): boolean {
    return this.plates.delete(name);
  }

  engage(name: string): boolean {
    const plate = this.plates.get(name);
    if (!plate) return false;
    if (plate.engaged) return true;
    plate.engaged = true;
    plate.slippage = 0;
    plate.engageCount++;
    plate.lastEngaged = Date.now();
    return true;
  }

  disengage(name: string): boolean {
    const plate = this.plates.get(name);
    if (!plate) return false;
    if (!plate.engaged) return true;
    plate.engaged = false;
    plate.slippage = 0;
    plate.lastDisengaged = Date.now();
    return true;
  }

  slip(name: string, amount: number): boolean {
    const plate = this.plates.get(name);
    if (!plate || !plate.engaged) return false;
    plate.slippage = Math.max(0, Math.min(1, plate.slippage + amount));
    return true;
  }

  isEngaged(name: string): boolean {
    const plate = this.plates.get(name);
    return plate ? plate.engaged : false;
  }

  allPlates(): ClutchPlate[] {
    return [...this.plates.values()];
  }

  stats(): Record<string, unknown> {
    const all = [...this.plates.values()];
    return {
      total: all.length,
      engaged: all.filter(p => p.engaged).length,
      disengaged: all.filter(p => !p.engaged).length,
      totalEngagements: all.reduce((s, p) => s + p.engageCount, 0),
      avgSlippage: all.length ? all.reduce((s, p) => s + p.slippage, 0) / all.length : 0,
    };
  }
}
