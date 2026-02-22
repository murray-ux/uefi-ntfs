// pentagon/underfloor/L3-valve/gears.ts
//
// ROOM: GEARS — Throughput control and speed regulation.
// Each gearbox manages discrete speed levels with RPM and torque tracking.
// Shifting locks the box momentarily to prevent gear-grinding.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface GearBox {
  name: string;
  currentGear: number;
  maxGear: number;
  rpm: number;
  torque: number;
  shifting: boolean;
}

export class Gears {
  private readonly kernel: Kernel;
  private readonly boxes: Map<string, GearBox> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string, maxGear: number): void {
    this.boxes.set(name, {
      name, currentGear: 0, maxGear: Math.max(1, maxGear),
      rpm: 0, torque: 0, shifting: false,
    });
  }

  shift(name: string, gear: number): boolean {
    const box = this.boxes.get(name);
    if (!box || box.shifting) return false;
    if (gear < 0 || gear > box.maxGear) return false;
    box.shifting = true;
    box.currentGear = gear;
    box.torque = gear === 0 ? 0 : box.rpm / gear;
    box.shifting = false;
    return true;
  }

  upshift(name: string): boolean {
    const box = this.boxes.get(name);
    if (!box) return false;
    return this.shift(name, Math.min(box.currentGear + 1, box.maxGear));
  }

  downshift(name: string): boolean {
    const box = this.boxes.get(name);
    if (!box) return false;
    return this.shift(name, Math.max(box.currentGear - 1, 0));
  }

  rev(name: string, rpm: number): boolean {
    const box = this.boxes.get(name);
    if (!box) return false;
    box.rpm = Math.max(0, rpm);
    box.torque = box.currentGear === 0 ? 0 : box.rpm / box.currentGear;
    return true;
  }

  neutral(name: string): boolean {
    return this.shift(name, 0);
  }

  status(name: string): GearBox | null {
    return this.boxes.get(name) ?? null;
  }

  stats(): Record<string, unknown> {
    const all = [...this.boxes.values()];
    return {
      total: all.length,
      inNeutral: all.filter(b => b.currentGear === 0).length,
      shifting: all.filter(b => b.shifting).length,
      avgRpm: all.length ? all.reduce((s, b) => s + b.rpm, 0) / all.length : 0,
      avgTorque: all.length ? all.reduce((s, b) => s + b.torque, 0) / all.length : 0,
      maxGearUsed: all.reduce((m, b) => Math.max(m, b.currentGear), 0),
    };
  }
}
