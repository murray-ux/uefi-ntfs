// pentagon/underfloor/L0-kernel/spark.ts
//
// ROOM: SPARK — Initialisation sequences and bootstrap orchestration.
// Tracks boot phases, validates preconditions, records startup metrics.
// Each spark fires once; re-sparking requires explicit reset.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

type SparkState = "pending" | "firing" | "lit" | "failed" | "quenched";

interface SparkEntry {
  name: string;
  state: SparkState;
  phase: number;
  dependencies: string[];
  firedAt: number | null;
  durationMs: number;
  error: string | null;
  retries: number;
}

export class Spark {
  private readonly kernel: Kernel;
  private readonly sparks: Map<string, SparkEntry> = new Map();
  private readonly bootLog: Array<{ spark: string; state: SparkState; ts: number }> = [];
  private bootStarted: number | null = null;
  private bootCompleted: number | null = null;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  register(name: string, phase: number, dependencies: string[] = []): void {
    this.sparks.set(name, {
      name, state: "pending", phase, dependencies,
      firedAt: null, durationMs: 0, error: null, retries: 0,
    });
  }

  async ignite(name: string, fn: () => Promise<void>): Promise<boolean> {
    const spark = this.sparks.get(name);
    if (!spark || spark.state === "lit") return spark?.state === "lit";

    // Check deps
    for (const dep of spark.dependencies) {
      const d = this.sparks.get(dep);
      if (!d || d.state !== "lit") return false;
    }

    if (!this.bootStarted) this.bootStarted = Date.now();
    spark.state = "firing";
    spark.firedAt = Date.now();
    this.log(name, "firing");

    try {
      await fn();
      spark.state = "lit";
      spark.durationMs = Date.now() - spark.firedAt;
      this.log(name, "lit");

      // Check if all sparks are lit
      if ([...this.sparks.values()].every(s => s.state === "lit")) {
        this.bootCompleted = Date.now();
      }
      return true;
    } catch (err) {
      spark.state = "failed";
      spark.error = err instanceof Error ? err.message : String(err);
      spark.retries++;
      spark.durationMs = Date.now() - (spark.firedAt ?? Date.now());
      this.log(name, "failed");
      return false;
    }
  }

  async igniteAll(): Promise<{ lit: string[]; failed: string[] }> {
    const phases = [...new Set([...this.sparks.values()].map(s => s.phase))].sort((a, b) => a - b);
    const lit: string[] = [];
    const failed: string[] = [];

    for (const phase of phases) {
      const batch = [...this.sparks.values()].filter(s => s.phase === phase && s.state === "pending");
      for (const spark of batch) {
        const ok = await this.ignite(spark.name, async () => { /* no-op placeholder — real fn registered externally */ });
        if (ok) lit.push(spark.name); else failed.push(spark.name);
      }
    }
    return { lit, failed };
  }

  quench(name: string): boolean {
    const spark = this.sparks.get(name);
    if (!spark) return false;
    spark.state = "quenched";
    this.log(name, "quenched");
    return true;
  }

  reset(name: string): boolean {
    const spark = this.sparks.get(name);
    if (!spark) return false;
    spark.state = "pending";
    spark.firedAt = null;
    spark.durationMs = 0;
    spark.error = null;
    return true;
  }

  private log(name: string, state: SparkState): void {
    this.bootLog.push({ spark: name, state, ts: Date.now() });
  }

  sequence(): SparkEntry[] {
    return [...this.sparks.values()].sort((a, b) => a.phase - b.phase);
  }

  stats(): Record<string, unknown> {
    const all = [...this.sparks.values()];
    return {
      total: all.length,
      pending: all.filter(s => s.state === "pending").length,
      lit: all.filter(s => s.state === "lit").length,
      failed: all.filter(s => s.state === "failed").length,
      quenched: all.filter(s => s.state === "quenched").length,
      bootTimeMs: this.bootStarted && this.bootCompleted ? this.bootCompleted - this.bootStarted : null,
      bootLog: this.bootLog.slice(-20),
    };
  }
}
