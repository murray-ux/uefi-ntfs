// pentagon/underfloor/layer4-manifold.ts
//
// LAYER 4 — MANIFOLD
//
// Orchestration, fan-out, aggregation, and pipeline composition.
// The Manifold takes a single request from a facet, splits it into
// sub-operations across the underfloor, runs them (serial or parallel),
// collects results, and returns a unified response.
//
// Three patterns:
//   PIPELINE  — Sequential chain: A → B → C (output of A feeds B)
//   FAN-OUT   — Parallel scatter: A → [B, C, D] → gather
//   SAGA      — Compensating transactions: A → B → C, fail → undo C → undo B
//
// The Manifold is the last underfloor layer. It consumes everything below it:
// Kernel (IDs, timing), Conduit (messaging), Reservoir (state), Valve (policy).
//
// From outside: invisible. Pentagon consumers call one method, get one result.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "./layer0-kernel";
import { Conduit, LayerId } from "./layer1-conduit";
import { Reservoir } from "./layer2-reservoir";
import { Valve, ValveRequest, ValveDecision } from "./layer3-valve";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepStatus = "pending" | "running" | "done" | "failed" | "compensated";

export interface Step<TIn = unknown, TOut = unknown> {
  id: string;
  name: string;
  execute: (input: TIn) => Promise<TOut>;
  compensate?: (input: TIn) => Promise<void>;    // for saga rollback
  timeoutMs: number;
}

export interface StepResult<T = unknown> {
  stepId: string;
  stepName: string;
  status: StepStatus;
  output: T | null;
  error: string | null;
  durationMs: number;
  startedAt: Timestamp;
  completedAt: Timestamp;
}

export interface ManifoldResult<T = unknown> {
  readonly id: string;
  readonly pattern: "pipeline" | "fan-out" | "saga";
  readonly verdict: ValveDecision;
  readonly steps: ReadonlyArray<StepResult>;
  readonly output: T | null;
  readonly success: boolean;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly durationMs: number;
}

// ---------------------------------------------------------------------------
// Manifold
// ---------------------------------------------------------------------------

export class Manifold {
  private readonly kernel: Kernel;
  private readonly conduit: Conduit;
  private readonly reservoir: Reservoir;
  private readonly valve: Valve;

  constructor(kernel: Kernel, conduit: Conduit, reservoir: Reservoir, valve: Valve) {
    this.kernel = kernel;
    this.conduit = conduit;
    this.reservoir = reservoir;
    this.valve = valve;
  }

  // ── PIPELINE — sequential chain ────────────────────────────────────────

  async pipeline<TFinal = unknown>(
    request: ValveRequest,
    steps: Step[],
    initialInput: unknown = null,
  ): Promise<ManifoldResult<TFinal>> {
    const id = this.kernel.monotonicId();
    const startedAt = this.kernel.now();

    // Policy check
    const verdict = this.valve.evaluate(request);
    if (verdict.verdict !== "ALLOW") {
      return this.freezeResult({
        id,
        pattern: "pipeline",
        verdict,
        steps: [],
        output: null,
        success: false,
        startedAt,
        completedAt: this.kernel.now(),
        durationMs: 0,
      });
    }

    const results: StepResult[] = [];
    let currentInput: unknown = initialInput;

    for (const step of steps) {
      const stepStart = this.kernel.now();

      try {
        const output = await this.withTimeout(step.execute(currentInput), step.timeoutMs);
        const stepEnd = this.kernel.now();

        results.push({
          stepId: step.id,
          stepName: step.name,
          status: "done",
          output,
          error: null,
          durationMs: Number(stepEnd.monotonic - stepStart.monotonic) / 1e6,
          startedAt: stepStart,
          completedAt: stepEnd,
        });

        currentInput = output;

        // Signal via conduit
        await this.conduit.send("manifold", "reservoir", "step:done", {
          manifestId: id, stepId: step.id, status: "done",
        });

      } catch (err) {
        const stepEnd = this.kernel.now();
        results.push({
          stepId: step.id,
          stepName: step.name,
          status: "failed",
          output: null,
          error: String(err),
          durationMs: Number(stepEnd.monotonic - stepStart.monotonic) / 1e6,
          startedAt: stepStart,
          completedAt: stepEnd,
        });

        // Pipeline breaks on first failure
        const completedAt = this.kernel.now();
        return this.freezeResult({
          id,
          pattern: "pipeline",
          verdict,
          steps: results,
          output: null,
          success: false,
          startedAt,
          completedAt,
          durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
        });
      }
    }

    // Store result in reservoir
    this.reservoir.put(`manifold:${id}`, { pattern: "pipeline", steps: results.length, success: true });

    const completedAt = this.kernel.now();
    return this.freezeResult({
      id,
      pattern: "pipeline",
      verdict,
      steps: results,
      output: currentInput as TFinal,
      success: true,
      startedAt,
      completedAt,
      durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
    });
  }

  // ── FAN-OUT — parallel scatter/gather ──────────────────────────────────

  async fanOut<TFinal = unknown[]>(
    request: ValveRequest,
    steps: Step[],
    sharedInput: unknown = null,
  ): Promise<ManifoldResult<TFinal>> {
    const id = this.kernel.monotonicId();
    const startedAt = this.kernel.now();

    // Policy check
    const verdict = this.valve.evaluate(request);
    if (verdict.verdict !== "ALLOW") {
      return this.freezeResult({
        id, pattern: "fan-out", verdict, steps: [], output: null,
        success: false, startedAt, completedAt: this.kernel.now(), durationMs: 0,
      });
    }

    // Run all steps in parallel
    const promises = steps.map(async (step): Promise<StepResult> => {
      const stepStart = this.kernel.now();
      try {
        const output = await this.withTimeout(step.execute(sharedInput), step.timeoutMs);
        const stepEnd = this.kernel.now();
        return {
          stepId: step.id, stepName: step.name, status: "done",
          output, error: null,
          durationMs: Number(stepEnd.monotonic - stepStart.monotonic) / 1e6,
          startedAt: stepStart, completedAt: stepEnd,
        };
      } catch (err) {
        const stepEnd = this.kernel.now();
        return {
          stepId: step.id, stepName: step.name, status: "failed",
          output: null, error: String(err),
          durationMs: Number(stepEnd.monotonic - stepStart.monotonic) / 1e6,
          startedAt: stepStart, completedAt: stepEnd,
        };
      }
    });

    const results = await Promise.all(promises);
    const allDone = results.every((r) => r.status === "done");
    const outputs = results.filter((r) => r.status === "done").map((r) => r.output);

    this.reservoir.put(`manifold:${id}`, {
      pattern: "fan-out", steps: results.length, success: allDone,
    });

    const completedAt = this.kernel.now();
    return this.freezeResult({
      id, pattern: "fan-out", verdict, steps: results,
      output: outputs as unknown as TFinal,
      success: allDone, startedAt, completedAt,
      durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
    });
  }

  // ── SAGA — compensating transactions ───────────────────────────────────

  async saga<TFinal = unknown>(
    request: ValveRequest,
    steps: Step[],
    initialInput: unknown = null,
  ): Promise<ManifoldResult<TFinal>> {
    const id = this.kernel.monotonicId();
    const startedAt = this.kernel.now();

    // Policy check
    const verdict = this.valve.evaluate(request);
    if (verdict.verdict !== "ALLOW") {
      return this.freezeResult({
        id, pattern: "saga", verdict, steps: [], output: null,
        success: false, startedAt, completedAt: this.kernel.now(), durationMs: 0,
      });
    }

    const results: StepResult[] = [];
    const completed: Array<{ step: Step; input: unknown }> = [];
    let currentInput: unknown = initialInput;

    for (const step of steps) {
      const stepStart = this.kernel.now();

      try {
        const output = await this.withTimeout(step.execute(currentInput), step.timeoutMs);
        const stepEnd = this.kernel.now();

        results.push({
          stepId: step.id, stepName: step.name, status: "done",
          output, error: null,
          durationMs: Number(stepEnd.monotonic - stepStart.monotonic) / 1e6,
          startedAt: stepStart, completedAt: stepEnd,
        });

        completed.push({ step, input: currentInput });
        currentInput = output;

      } catch (err) {
        const stepEnd = this.kernel.now();
        results.push({
          stepId: step.id, stepName: step.name, status: "failed",
          output: null, error: String(err),
          durationMs: Number(stepEnd.monotonic - stepStart.monotonic) / 1e6,
          startedAt: stepStart, completedAt: stepEnd,
        });

        // ── Compensate in reverse order ──────────────────────
        for (let i = completed.length - 1; i >= 0; i--) {
          const { step: cStep, input: cInput } = completed[i];
          if (!cStep.compensate) continue;

          const compStart = this.kernel.now();
          try {
            await cStep.compensate(cInput);
            // Mark the original step as compensated
            const orig = results.find((r) => r.stepId === cStep.id);
            if (orig) (orig as { status: StepStatus }).status = "compensated";
          } catch (compErr) {
            // Compensation failure — log but continue
            await this.conduit.send("manifold", "reservoir", "saga:compensation-failed", {
              manifestId: id, stepId: cStep.id, error: String(compErr),
            });
          }
        }

        const completedAt = this.kernel.now();
        return this.freezeResult({
          id, pattern: "saga", verdict, steps: results,
          output: null, success: false, startedAt, completedAt,
          durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
        });
      }
    }

    this.reservoir.put(`manifold:${id}`, {
      pattern: "saga", steps: results.length, success: true,
    });

    const completedAt = this.kernel.now();
    return this.freezeResult({
      id, pattern: "saga", verdict, steps: results,
      output: currentInput as TFinal,
      success: true, startedAt, completedAt,
      durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
    });
  }

  // ── Timeout wrapper ────────────────────────────────────────────────────

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  // ── Freeze ─────────────────────────────────────────────────────────────

  private freezeResult<T>(result: ManifoldResult<T>): ManifoldResult<T> {
    return Object.freeze({ ...result, steps: Object.freeze([...result.steps]) });
  }

  // ── Diagnostics ────────────────────────────────────────────────────────

  diagnostics(): Record<string, unknown> {
    return {
      conduit: this.conduit.stats(),
      reservoir: this.reservoir.stats(),
      valve: {
        breakers: this.valve.breakerStates(),
        limiters: this.valve.limiterStates(),
      },
    };
  }
}
