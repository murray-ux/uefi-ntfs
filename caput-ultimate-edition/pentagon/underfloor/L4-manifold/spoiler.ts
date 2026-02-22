// pentagon/underfloor/L4-manifold/spoiler.ts
//
// ROOM: SPOILER — Stability control, downforce management, and drift correction.
// Named stability profiles track downforce settings, angle adjustments, drift
// thresholds, and correction counts. Provides real-time measurement and
// automatic correction when drift exceeds thresholds.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

export interface StabilityProfile {
  name: string;
  downforce: number;
  angle: number;
  driftThreshold: number;
  corrections: number;
  active: boolean;
}

export class Spoiler {
  private readonly kernel: Kernel;
  private readonly profiles_: Map<string, StabilityProfile> = new Map();
  private readonly driftHistory: Array<{ name: string; drift: number; ts: number }> = [];

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string, downforce: number, driftThreshold: number): void {
    this.profiles_.set(name, {
      name, downforce, angle: 0, driftThreshold, corrections: 0, active: false,
    });
  }

  activate(name: string): boolean {
    const p = this.profiles_.get(name);
    if (!p || p.active) return false;
    p.active = true;
    return true;
  }

  deactivate(name: string): boolean {
    const p = this.profiles_.get(name);
    if (!p || !p.active) return false;
    p.active = false;
    return true;
  }

  adjust(name: string, angle: number): boolean {
    const p = this.profiles_.get(name);
    if (!p) return false;
    p.angle = Math.max(-45, Math.min(45, angle));
    return true;
  }

  measure(name: string, currentDrift: number): { overThreshold: boolean; drift: number; threshold: number } | null {
    const p = this.profiles_.get(name);
    if (!p) return null;
    this.driftHistory.push({ name, drift: currentDrift, ts: Date.now() });
    while (this.driftHistory.length > 500) this.driftHistory.shift();
    const overThreshold = Math.abs(currentDrift) > p.driftThreshold;
    if (overThreshold && p.active) {
      this.correct(name);
    }
    return { overThreshold, drift: currentDrift, threshold: p.driftThreshold };
  }

  correct(name: string): boolean {
    const p = this.profiles_.get(name);
    if (!p) return false;
    p.corrections++;
    const angleDelta = p.downforce > 0 ? Math.min(5, p.downforce / 100) : 1;
    p.angle = Math.max(-45, Math.min(45, p.angle + angleDelta));
    return true;
  }

  profiles(): StabilityProfile[] {
    return [...this.profiles_.values()];
  }

  stats(): Record<string, unknown> {
    const all = [...this.profiles_.values()];
    return {
      total: all.length,
      active: all.filter(p => p.active).length,
      totalCorrections: all.reduce((s, p) => s + p.corrections, 0),
      avgDownforce: all.length ? all.reduce((s, p) => s + p.downforce, 0) / all.length : 0,
      driftEvents: this.driftHistory.length,
    };
  }
}
