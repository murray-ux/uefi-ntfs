// pentagon/underfloor/layer1-conduit.ts
//
// LAYER 1 — CONDUIT
//
// Typed message passing between layers. Every inter-layer communication
// flows through a Conduit. Messages are enveloped, timestamped, and
// hash-linked. This is the nervous system of the underfloor.
//
// The Conduit enforces:
//   - Type-safe message envelopes
//   - Ordered delivery within a pipe
//   - Back-pressure (bounded queue)
//   - Dead-letter capture for failed deliveries
//   - Full audit trail via Kernel hashing
//
// From outside: invisible. Pentagon consumers never see messages flow.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Digest, Timestamp } from "./layer0-kernel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayerId = "kernel" | "conduit" | "reservoir" | "valve" | "manifold" | "facet";

export interface Envelope<T = unknown> {
  readonly id: string;
  readonly from: LayerId;
  readonly to: LayerId;
  readonly topic: string;
  readonly payload: T;
  readonly ts: Timestamp;
  readonly hash: string;          // SHA-256 of (id + from + to + topic + payload serialized)
  readonly parentHash: string;    // hash of previous envelope in this pipe (chain link)
  readonly ttlMs: number;
  readonly attempt: number;
}

export interface DeadLetter<T = unknown> {
  readonly envelope: Envelope<T>;
  readonly reason: string;
  readonly diedAt: Timestamp;
}

export type Handler<T = unknown> = (envelope: Envelope<T>) => Promise<void> | void;

interface Pipe<T = unknown> {
  from: LayerId;
  to: LayerId;
  topic: string;
  queue: Envelope<T>[];
  handler: Handler<T> | null;
  lastHash: string;
  maxDepth: number;
  delivered: number;
  dropped: number;
}

// ---------------------------------------------------------------------------
// Conduit
// ---------------------------------------------------------------------------

export class Conduit {
  private readonly kernel: Kernel;
  private readonly pipes = new Map<string, Pipe>();
  private readonly deadLetters: DeadLetter[] = [];
  private readonly maxDeadLetters: number;

  constructor(kernel: Kernel, opts?: { maxDeadLetters?: number }) {
    this.kernel = kernel;
    this.maxDeadLetters = opts?.maxDeadLetters ?? 1000;
  }

  // ── Pipe management ────────────────────────────────────────────────────

  private pipeKey(from: LayerId, to: LayerId, topic: string): string {
    return `${from}→${to}:${topic}`;
  }

  register<T = unknown>(
    from: LayerId,
    to: LayerId,
    topic: string,
    handler: Handler<T>,
    maxDepth: number = 256,
  ): void {
    const key = this.pipeKey(from, to, topic);
    this.pipes.set(key, {
      from,
      to,
      topic,
      queue: [],
      handler: handler as Handler,
      lastHash: "genesis",
      maxDepth,
      delivered: 0,
      dropped: 0,
    });
  }

  // ── Send ───────────────────────────────────────────────────────────────

  async send<T = unknown>(
    from: LayerId,
    to: LayerId,
    topic: string,
    payload: T,
    ttlMs: number = 30000,
  ): Promise<Envelope<T>> {
    const key = this.pipeKey(from, to, topic);
    let pipe = this.pipes.get(key);

    // Auto-create pipe if not registered (unhandled — will dead-letter)
    if (!pipe) {
      pipe = {
        from, to, topic,
        queue: [],
        handler: null,
        lastHash: "genesis",
        maxDepth: 256,
        delivered: 0,
        dropped: 0,
      };
      this.pipes.set(key, pipe);
    }

    const ts = this.kernel.now();
    const id = this.kernel.monotonicId();
    const parentHash = pipe.lastHash;

    // Build hash chain
    const hashInput = `${id}|${from}|${to}|${topic}|${JSON.stringify(payload)}|${parentHash}`;
    const hash = this.kernel.hash(hashInput).hex;

    const envelope: Envelope<T> = Object.freeze({
      id,
      from,
      to,
      topic,
      payload,
      ts,
      hash,
      parentHash,
      ttlMs,
      attempt: 1,
    });

    pipe.lastHash = hash;

    // Back-pressure check
    if (pipe.queue.length >= pipe.maxDepth) {
      pipe.dropped++;
      this.toDead(envelope as Envelope, "back-pressure: queue full");
      return envelope;
    }

    pipe.queue.push(envelope as Envelope);

    // Deliver if handler exists
    if (pipe.handler) {
      await this.drain(pipe);
    }

    return envelope;
  }

  // ── Drain a pipe ───────────────────────────────────────────────────────

  private async drain(pipe: Pipe): Promise<void> {
    if (!pipe.handler) return;

    while (pipe.queue.length > 0) {
      const envelope = pipe.queue.shift()!;
      const now = this.kernel.now();

      // TTL check
      if (now.epochMs - envelope.ts.epochMs > envelope.ttlMs) {
        pipe.dropped++;
        this.toDead(envelope, "ttl-expired");
        continue;
      }

      try {
        await pipe.handler(envelope);
        pipe.delivered++;
      } catch (err) {
        pipe.dropped++;
        this.toDead(envelope, `handler-error: ${err}`);
      }
    }
  }

  // ── Dead letters ───────────────────────────────────────────────────────

  private toDead(envelope: Envelope, reason: string): void {
    const dl: DeadLetter = Object.freeze({
      envelope,
      reason,
      diedAt: this.kernel.now(),
    });

    this.deadLetters.push(dl);

    // Evict oldest if over limit
    while (this.deadLetters.length > this.maxDeadLetters) {
      this.deadLetters.shift();
    }
  }

  getDeadLetters(): ReadonlyArray<DeadLetter> {
    return [...this.deadLetters];
  }

  // ── Broadcast — fan-out to all pipes matching topic ────────────────────

  async broadcast<T = unknown>(
    from: LayerId,
    topic: string,
    payload: T,
    ttlMs: number = 30000,
  ): Promise<Envelope<T>[]> {
    const envelopes: Envelope<T>[] = [];
    for (const [key, pipe] of this.pipes) {
      if (pipe.from === from && pipe.topic === topic) {
        const env = await this.send(from, pipe.to, topic, payload, ttlMs);
        envelopes.push(env);
      }
    }
    return envelopes;
  }

  // ── Diagnostics ────────────────────────────────────────────────────────

  stats(): Record<string, { delivered: number; dropped: number; queued: number }> {
    const result: Record<string, { delivered: number; dropped: number; queued: number }> = {};
    for (const [key, pipe] of this.pipes) {
      result[key] = {
        delivered: pipe.delivered,
        dropped: pipe.dropped,
        queued: pipe.queue.length,
      };
    }
    return result;
  }
}
