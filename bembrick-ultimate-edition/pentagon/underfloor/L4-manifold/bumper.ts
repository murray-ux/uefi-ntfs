// pentagon/underfloor/L4-manifold/bumper.ts
//
// ROOM: BUMPER — Error boundaries, impact absorption, and crash recovery.
// Catches errors, grades severity, tracks impact history, and provides
// resilience metrics. The wrap() method runs functions inside try/catch
// boundaries and automatically logs impacts.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

export type Severity = "minor" | "major" | "critical";

export interface Impact {
  id: string;
  source: string;
  severity: Severity;
  absorbed: boolean;
  timestamp: number;
  error: string;
}

export class Bumper {
  private readonly kernel: Kernel;
  private readonly log: Impact[] = [];
  private idCounter = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  private nextId(): string {
    return `impact-${++this.idCounter}`;
  }

  absorb(source: string, error: string, severity: Severity = "minor"): Impact {
    const impact: Impact = {
      id: this.nextId(), source, severity,
      absorbed: true, timestamp: Date.now(), error,
    };
    this.log.push(impact);
    while (this.log.length > 1000) this.log.shift();
    return impact;
  }

  wrap<T>(fn: () => T): { ok: true; value: T } | { ok: false; impact: Impact } {
    try {
      const value = fn();
      return { ok: true, value };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const impact = this.absorb("wrap", message, "major");
      return { ok: false, impact };
    }
  }

  impacts(last = 50): Impact[] {
    return this.log.slice(-last);
  }

  recover(id: string): boolean {
    const impact = this.log.find(i => i.id === id);
    if (!impact || impact.absorbed) return false;
    impact.absorbed = true;
    return true;
  }

  crashLog(): Impact[] {
    return this.log.filter(i => i.severity === "critical");
  }

  resilience(): { total: number; absorbed: number; unabsorbed: number; rate: number } {
    const total = this.log.length;
    const absorbed = this.log.filter(i => i.absorbed).length;
    const unabsorbed = total - absorbed;
    return {
      total, absorbed, unabsorbed,
      rate: total > 0 ? absorbed / total : 1,
    };
  }

  stats(): Record<string, unknown> {
    const all = this.log;
    return {
      total: all.length,
      minor: all.filter(i => i.severity === "minor").length,
      major: all.filter(i => i.severity === "major").length,
      critical: all.filter(i => i.severity === "critical").length,
      absorbed: all.filter(i => i.absorbed).length,
      resilienceRate: all.length > 0 ? all.filter(i => i.absorbed).length / all.length : 1,
    };
  }
}
