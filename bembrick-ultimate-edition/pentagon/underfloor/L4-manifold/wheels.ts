// pentagon/underfloor/L4-manifold/wheels.ts
//
// ROOM: WHEELS — Rotation scheduling, traction control, and spin management.
// Tracks named wheels with RPM, traction (0-1), spin state, rotation counts,
// and slip events. Provides fine-grained control over individual wheel
// behavior and aggregate fleet statistics.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

export interface Wheel {
  name: string;
  rpm: number;
  traction: number;
  spinning: boolean;
  rotations: number;
  slipEvents: number;
}

export class Wheels {
  private readonly kernel: Kernel;
  private readonly wheels_: Map<string, Wheel> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string): void {
    this.wheels_.set(name, {
      name, rpm: 0, traction: 1.0, spinning: false, rotations: 0, slipEvents: 0,
    });
  }

  spin(name: string, rpm: number): boolean {
    const w = this.wheels_.get(name);
    if (!w) return false;
    w.rpm = Math.max(0, rpm);
    w.spinning = w.rpm > 0;
    if (w.spinning) {
      w.rotations += w.rpm;
    }
    return true;
  }

  brake(name: string): boolean {
    const w = this.wheels_.get(name);
    if (!w) return false;
    w.rpm = 0;
    w.spinning = false;
    return true;
  }

  traction(name: string): number | null {
    const w = this.wheels_.get(name);
    return w ? w.traction : null;
  }

  slip(name: string): boolean {
    const w = this.wheels_.get(name);
    if (!w) return false;
    w.slipEvents++;
    w.traction = Math.max(0, w.traction - 0.1);
    if (w.traction < 0.3 && w.spinning) {
      w.rpm = Math.floor(w.rpm * 0.5);
    }
    return true;
  }

  grip(name: string, traction: number): boolean {
    const w = this.wheels_.get(name);
    if (!w) return false;
    w.traction = Math.max(0, Math.min(1, traction));
    return true;
  }

  odometer(name: string): number | null {
    const w = this.wheels_.get(name);
    return w ? w.rotations : null;
  }

  stats(): Record<string, unknown> {
    const all = [...this.wheels_.values()];
    return {
      total: all.length,
      spinning: all.filter(w => w.spinning).length,
      totalRotations: all.reduce((s, w) => s + w.rotations, 0),
      totalSlipEvents: all.reduce((s, w) => s + w.slipEvents, 0),
      avgTraction: all.length ? all.reduce((s, w) => s + w.traction, 0) / all.length : 0,
      avgRpm: all.length ? all.reduce((s, w) => s + w.rpm, 0) / all.length : 0,
    };
  }
}
