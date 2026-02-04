// pentagon/underfloor/L3-valve/pedals.ts
//
// ROOM: PEDALS — Input throttle, acceleration and braking controls.
// Each pedal has a type (throttle, brake, clutch), a position from 0-100,
// and configurable sensitivity. Tracks total input presses.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

type PedalType = "throttle" | "brake" | "clutch";

interface PedalState {
  name: string;
  type: PedalType;
  position: number;
  sensitivity: number;
  inputCount: number;
}

export class Pedals {
  private readonly kernel: Kernel;
  private readonly pedals: Map<string, PedalState> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  install(name: string, type: PedalType, sensitivity = 1.0): void {
    this.pedals.set(name, {
      name, type, position: 0, sensitivity, inputCount: 0,
    });
  }

  press(name: string, amount: number): number {
    const pedal = this.pedals.get(name);
    if (!pedal) return -1;
    const delta = amount * pedal.sensitivity;
    pedal.position = Math.min(100, pedal.position + delta);
    pedal.inputCount++;
    return pedal.position;
  }

  release(name: string, amount: number): number {
    const pedal = this.pedals.get(name);
    if (!pedal) return -1;
    const delta = amount * pedal.sensitivity;
    pedal.position = Math.max(0, pedal.position - delta);
    pedal.inputCount++;
    return pedal.position;
  }

  position(name: string): number {
    const pedal = this.pedals.get(name);
    return pedal ? pedal.position : -1;
  }

  floor(name: string): boolean {
    const pedal = this.pedals.get(name);
    if (!pedal) return false;
    pedal.position = 100;
    pedal.inputCount++;
    return true;
  }

  lift(name: string): boolean {
    const pedal = this.pedals.get(name);
    if (!pedal) return false;
    pedal.position = 0;
    pedal.inputCount++;
    return true;
  }

  calibrate(name: string, sensitivity: number): boolean {
    const pedal = this.pedals.get(name);
    if (!pedal) return false;
    pedal.sensitivity = Math.max(0.01, sensitivity);
    return true;
  }

  stats(): Record<string, unknown> {
    const all = [...this.pedals.values()];
    const byType = (t: PedalType) => all.filter(p => p.type === t);
    return {
      total: all.length,
      throttles: byType("throttle").length,
      brakes: byType("brake").length,
      clutches: byType("clutch").length,
      totalInputs: all.reduce((s, p) => s + p.inputCount, 0),
      avgPosition: all.length ? all.reduce((s, p) => s + p.position, 0) / all.length : 0,
    };
  }
}
