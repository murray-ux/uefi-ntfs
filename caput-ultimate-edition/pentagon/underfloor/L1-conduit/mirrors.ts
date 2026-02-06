// L1-conduit/mirrors.ts
//
// ROOM: MIRRORS — Introspection and runtime reflection
//
// Captures snapshots of system state, compares them over time,
// and runs named probes for health and diagnostics.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "../layer0-kernel";
import { Conduit, LayerId } from "../layer1-conduit";

interface Snapshot {
  id: string;
  timestamp: Timestamp;
  data: Record<string, unknown>;
}

interface ProbeResult {
  probe: string;
  timestamp: Timestamp;
  result: unknown;
  ok: boolean;
}

type ProbeFn = () => unknown;

export class Mirrors {
  private kernel: Kernel;
  private conduit: Conduit;
  private snapshots: Snapshot[] = [];
  private probes: Map<string, ProbeFn> = new Map();
  private results: ProbeResult[] = [];
  private idCounter = 0;

  constructor(kernel: Kernel, conduit: Conduit) {
    this.kernel = kernel;
    this.conduit = conduit;
  }

  reflect(target: Record<string, unknown>): Record<string, string> {
    const reflection: Record<string, string> = {};
    for (const key of Object.keys(target)) {
      reflection[key] = typeof target[key];
    }
    return reflection;
  }

  snapshot(): Snapshot {
    const snap: Snapshot = {
      id: `snap-${++this.idCounter}`,
      timestamp: Date.now() as Timestamp,
      data: { probes: this.probes.size, snapshots: this.snapshots.length },
    };
    this.snapshots.push(snap);
    return snap;
  }

  compare(a: string, b: string): Record<string, unknown> | null {
    const snapA = this.snapshots.find((s) => s.id === a);
    const snapB = this.snapshots.find((s) => s.id === b);
    if (!snapA || !snapB) return null;
    return {
      idA: a,
      idB: b,
      timeDelta: (snapB.timestamp as number) - (snapA.timestamp as number),
      dataA: snapA.data,
      dataB: snapB.data,
    };
  }

  registerProbe(name: string, fn: ProbeFn): void {
    this.probes.set(name, fn);
  }

  runProbes(): ProbeResult[] {
    const batch: ProbeResult[] = [];
    for (const [name, fn] of this.probes) {
      let result: unknown;
      let ok = true;
      try {
        result = fn();
      } catch (err) {
        result = String(err);
        ok = false;
      }
      const entry: ProbeResult = { probe: name, timestamp: Date.now() as Timestamp, result, ok };
      batch.push(entry);
      this.results.push(entry);
    }
    return batch;
  }

  probeResults(): ProbeResult[] {
    return [...this.results];
  }

  stats(): Record<string, unknown> {
    const passed = this.results.filter((r) => r.ok).length;
    return {
      room: "MIRRORS",
      layer: "L1-conduit",
      totalSnapshots: this.snapshots.length,
      registeredProbes: this.probes.size,
      totalProbeRuns: this.results.length,
      probesPassed: passed,
      probesFailed: this.results.length - passed,
    };
  }
}
