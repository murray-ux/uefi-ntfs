// pentagon/underfloor/L4-manifold/turbo.ts
//
// ROOM: TURBO — Acceleration, burst processing, and boost management.
// Manages named boost profiles with multipliers, duration caps, cooldowns,
// and activation tracking. Wraps work functions in boosted execution.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

export interface BoostProfile {
  name: string;
  multiplier: number;
  maxDurationMs: number;
  active: boolean;
  activatedAt: number | null;
  boostCount: number;
  cooldownMs: number;
  cooldownUntil: number;
}

export class Turbo {
  private readonly kernel: Kernel;
  private readonly boosts: Map<string, BoostProfile> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string, multiplier: number, maxDurationMs: number, cooldownMs = 0): void {
    this.boosts.set(name, {
      name, multiplier, maxDurationMs, active: false,
      activatedAt: null, boostCount: 0, cooldownMs, cooldownUntil: 0,
    });
  }

  activate(name: string): boolean {
    const profile = this.boosts.get(name);
    if (!profile) return false;
    const now = Date.now();
    if (profile.active) return true;
    if (now < profile.cooldownUntil) return false;
    profile.active = true;
    profile.activatedAt = now;
    profile.boostCount++;
    return true;
  }

  deactivate(name: string): boolean {
    const profile = this.boosts.get(name);
    if (!profile || !profile.active) return false;
    const now = Date.now();
    profile.active = false;
    profile.activatedAt = null;
    profile.cooldownUntil = now + profile.cooldownMs;
    return true;
  }

  boost<T>(name: string, workFn: () => T): { result: T; multiplier: number; elapsed: number } | null {
    const profile = this.boosts.get(name);
    if (!profile) return null;

    const wasActive = profile.active;
    if (!wasActive) {
      if (!this.activate(name)) return null;
    }

    const start = Date.now();
    const result = workFn();
    const elapsed = Date.now() - start;

    if (elapsed > profile.maxDurationMs) {
      this.deactivate(name);
    }

    if (!wasActive) {
      this.deactivate(name);
    }

    return { result, multiplier: profile.multiplier, elapsed };
  }

  isActive(name: string): boolean {
    const profile = this.boosts.get(name);
    if (!profile) return false;
    if (profile.active && profile.activatedAt !== null) {
      const elapsed = Date.now() - profile.activatedAt;
      if (elapsed > profile.maxDurationMs) {
        this.deactivate(name);
        return false;
      }
    }
    return profile.active;
  }

  profiles(): BoostProfile[] {
    return [...this.boosts.values()];
  }

  stats(): Record<string, unknown> {
    const all = [...this.boosts.values()];
    return {
      total: all.length,
      active: all.filter(p => p.active).length,
      totalBoosts: all.reduce((s, p) => s + p.boostCount, 0),
      avgMultiplier: all.length ? all.reduce((s, p) => s + p.multiplier, 0) / all.length : 0,
    };
  }
}
