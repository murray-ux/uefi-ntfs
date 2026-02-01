// L4-manifold/wings.ts
//
// ROOM: WINGS — Horizontal scaling and load distribution
//
// Spreads work across multiple execution lanes. When a single Engine
// is saturated, Wings fan work across additional lanes. Supports:
//   ROUND-ROBIN  — Even distribution
//   LEAST-LOADED — Route to lane with fewest in-flight tasks
//   HASH-PINNED  — Consistent hash routing (same key → same lane)
//
// Lives in L4 because scaling is an orchestration concern.

import { Kernel } from "../layer0-kernel";

export type RoutingStrategy = "round-robin" | "least-loaded" | "hash-pinned";

export interface Lane {
  id: string;
  name: string;
  capacity: number;
  inFlight: number;
  completed: number;
  failed: number;
  healthy: boolean;
}

export interface RouteDecision {
  laneId: string;
  laneName: string;
  strategy: RoutingStrategy;
  reason: string;
}

export class Wings {
  private readonly kernel: Kernel;
  private readonly lanes: Lane[] = [];
  private strategy: RoutingStrategy = "least-loaded";
  private rrIndex = 0;
  private totalRouted = 0;

  constructor(kernel: Kernel, laneCount: number = 4, capacityPerLane: number = 16) {
    this.kernel = kernel;
    for (let i = 0; i < laneCount; i++) {
      this.lanes.push({
        id: this.kernel.deriveId("lane", String(i)),
        name: `lane-${i}`,
        capacity: capacityPerLane,
        inFlight: 0,
        completed: 0,
        failed: 0,
        healthy: true,
      });
    }
  }

  // ── Routing ────────────────────────────────────────────────────────────

  route(key?: string): RouteDecision {
    const healthy = this.lanes.filter((l) => l.healthy && l.inFlight < l.capacity);
    if (healthy.length === 0) throw new Error("All lanes at capacity or unhealthy");

    let lane: Lane;
    let reason: string;

    switch (this.strategy) {
      case "round-robin":
        this.rrIndex = this.rrIndex % healthy.length;
        lane = healthy[this.rrIndex];
        this.rrIndex++;
        reason = `round-robin index ${this.rrIndex - 1}`;
        break;

      case "least-loaded":
        lane = healthy.reduce((a, b) => a.inFlight <= b.inFlight ? a : b);
        reason = `least loaded: ${lane.inFlight} in-flight`;
        break;

      case "hash-pinned": {
        if (!key) {
          lane = healthy[0];
          reason = "no key, default to first";
        } else {
          const hash = this.kernel.hash(key).hex;
          const idx = parseInt(hash.slice(0, 8), 16) % healthy.length;
          lane = healthy[idx];
          reason = `hash-pinned: ${key} → ${idx}`;
        }
        break;
      }
    }

    lane.inFlight++;
    this.totalRouted++;

    return { laneId: lane.id, laneName: lane.name, strategy: this.strategy, reason };
  }

  // ── Completion tracking ────────────────────────────────────────────────

  complete(laneId: string, success: boolean): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (!lane) return;
    lane.inFlight = Math.max(0, lane.inFlight - 1);
    if (success) lane.completed++;
    else lane.failed++;
  }

  // ── Lane management ────────────────────────────────────────────────────

  markUnhealthy(laneId: string): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (lane) lane.healthy = false;
  }

  markHealthy(laneId: string): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (lane) lane.healthy = true;
  }

  addLane(capacity: number = 16): Lane {
    const lane: Lane = {
      id: this.kernel.deriveId("lane", String(this.lanes.length)),
      name: `lane-${this.lanes.length}`,
      capacity,
      inFlight: 0,
      completed: 0,
      failed: 0,
      healthy: true,
    };
    this.lanes.push(lane);
    return lane;
  }

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }

  // ── Query ──────────────────────────────────────────────────────────────

  laneStatus(): Lane[] {
    return this.lanes.map((l) => ({ ...l }));
  }

  totalCapacity(): number {
    return this.lanes.filter((l) => l.healthy).reduce((sum, l) => sum + l.capacity, 0);
  }

  totalInFlight(): number {
    return this.lanes.reduce((sum, l) => sum + l.inFlight, 0);
  }

  stats(): { lanes: number; healthy: number; totalRouted: number; strategy: RoutingStrategy; utilisation: number } {
    const healthy = this.lanes.filter((l) => l.healthy).length;
    const cap = this.totalCapacity();
    const inFlight = this.totalInFlight();
    return {
      lanes: this.lanes.length,
      healthy,
      totalRouted: this.totalRouted,
      strategy: this.strategy,
      utilisation: cap > 0 ? Math.round((inFlight / cap) * 100) / 100 : 0,
    };
  }
}
