// pentagon/underfloor/L0-kernel/compass.ts
//
// ROOM: COMPASS — Orientation, routing hints, and service discovery.
// Maintains a registry of named endpoints, resolves paths, tracks bearings.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface Waypoint {
  name: string;
  layer: string;
  room: string;
  tags: string[];
  bearing: string;
  registeredAt: number;
  hitCount: number;
}

export class Compass {
  private readonly kernel: Kernel;
  private readonly waypoints: Map<string, Waypoint> = new Map();
  private readonly aliases: Map<string, string> = new Map();
  private readonly breadcrumbs: Array<{ from: string; to: string; ts: number }> = [];
  private readonly maxCrumbs: number;

  constructor(kernel: Kernel, maxCrumbs = 1000) {
    this.kernel = kernel;
    this.maxCrumbs = maxCrumbs;
  }

  register(name: string, layer: string, room: string, tags: string[] = []): void {
    const bearing = this.kernel.hash(`${layer}:${room}:${name}`).hex.slice(0, 8);
    this.waypoints.set(name, { name, layer, room, tags, bearing, registeredAt: Date.now(), hitCount: 0 });
  }

  alias(from: string, to: string): void {
    this.aliases.set(from, to);
  }

  resolve(name: string): Waypoint | null {
    const resolved = this.aliases.get(name) ?? name;
    const wp = this.waypoints.get(resolved);
    if (wp) wp.hitCount++;
    return wp ?? null;
  }

  findByTag(tag: string): Waypoint[] {
    return [...this.waypoints.values()].filter(w => w.tags.includes(tag));
  }

  findByLayer(layer: string): Waypoint[] {
    return [...this.waypoints.values()].filter(w => w.layer === layer);
  }

  navigate(from: string, to: string): void {
    this.breadcrumbs.push({ from, to, ts: Date.now() });
    while (this.breadcrumbs.length > this.maxCrumbs) this.breadcrumbs.shift();
  }

  trail(last = 50): Array<{ from: string; to: string; ts: number }> {
    return this.breadcrumbs.slice(-last);
  }

  topHits(n = 10): Waypoint[] {
    return [...this.waypoints.values()].sort((a, b) => b.hitCount - a.hitCount).slice(0, n);
  }

  stats(): Record<string, unknown> {
    return {
      waypoints: this.waypoints.size,
      aliases: this.aliases.size,
      breadcrumbs: this.breadcrumbs.length,
      topHits: this.topHits(5).map(w => ({ name: w.name, hits: w.hitCount })),
    };
  }
}
