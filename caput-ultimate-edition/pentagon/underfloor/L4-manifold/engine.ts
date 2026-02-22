// L4-manifold/engine.ts
//
// ROOM: ENGINE — Core execution runtime
//
// The Engine is the actual execution surface. It takes a function,
// wraps it in instrumentation (timing, fuel consumption, error capture,
// retry logic), and runs it. Every step in every Manifold pattern
// ultimately runs through the Engine.
//
// Lives in L4 because execution is the manifold's primary concern.

import { Kernel, Timestamp } from "../layer0-kernel";

export interface EngineTask<T = unknown> {
  id: string;
  name: string;
  fn: () => Promise<T>;
  timeoutMs: number;
  retries: number;
  retryDelayMs: number;
  tags: string[];
}

export interface EngineResult<T = unknown> {
  taskId: string;
  taskName: string;
  output: T | null;
  success: boolean;
  error: string | null;
  attempts: number;
  durationMs: number;
  startedAt: Timestamp;
  completedAt: Timestamp;
  fuelConsumed: number;
}

export class Engine {
  private readonly kernel: Kernel;
  private running = 0;
  private completed = 0;
  private failed = 0;
  private totalRetries = 0;
  private readonly maxConcurrent: number;

  constructor(kernel: Kernel, maxConcurrent: number = 32) {
    this.kernel = kernel;
    this.maxConcurrent = maxConcurrent;
  }

  // ── Run ────────────────────────────────────────────────────────────────

  async run<T>(task: EngineTask<T>): Promise<EngineResult<T>> {
    if (this.running >= this.maxConcurrent) {
      throw new Error(`Engine at capacity: ${this.running}/${this.maxConcurrent} concurrent tasks`);
    }

    this.running++;
    const startedAt = this.kernel.now();
    let attempts = 0;
    let lastError: string | null = null;

    try {
      for (let attempt = 0; attempt <= task.retries; attempt++) {
        attempts++;
        if (attempt > 0) {
          this.totalRetries++;
          await this.delay(task.retryDelayMs * attempt);
        }

        try {
          const output = await this.withTimeout(task.fn(), task.timeoutMs);
          const completedAt = this.kernel.now();
          this.completed++;

          return {
            taskId: task.id,
            taskName: task.name,
            output,
            success: true,
            error: null,
            attempts,
            durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
            startedAt,
            completedAt,
            fuelConsumed: attempts,
          };
        } catch (err) {
          lastError = String(err);
          // If timeout or final attempt, break
          if (attempt === task.retries) break;
        }
      }

      // All retries exhausted
      this.failed++;
      const completedAt = this.kernel.now();
      return {
        taskId: task.id,
        taskName: task.name,
        output: null,
        success: false,
        error: lastError,
        attempts,
        durationMs: Number(completedAt.monotonic - startedAt.monotonic) / 1e6,
        startedAt,
        completedAt,
        fuelConsumed: attempts,
      };
    } finally {
      this.running--;
    }
  }

  // ── Batch — run multiple tasks with concurrency control ────────────────

  async batch<T>(tasks: EngineTask<T>[], concurrency?: number): Promise<EngineResult<T>[]> {
    const limit = concurrency ?? this.maxConcurrent;
    const results: EngineResult<T>[] = [];
    const executing = new Set<Promise<void>>();

    for (const task of tasks) {
      const p = this.run(task).then((r) => { results.push(r); });
      executing.add(p);
      p.finally(() => executing.delete(p));

      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  stats(): { running: number; completed: number; failed: number; retries: number; maxConcurrent: number } {
    return { running: this.running, completed: this.completed, failed: this.failed, retries: this.totalRetries, maxConcurrent: this.maxConcurrent };
  }
}
