// L1-conduit/locks.ts
//
// ROOM: LOCKS — Mutual exclusion, distributed locking, and resource guards
//
// Prevents concurrent access to shared resources. Three lock types:
//   MUTEX    — exclusive access, one holder at a time
//   RWLOCK   — many readers OR one writer
//   SEMAPHORE — bounded concurrency (N simultaneous holders)
//
// Every lock has a TTL. Dead holders are reaped automatically.
// Lives in L1 because locks coordinate message flow between layers.

import { Kernel, Timestamp } from "../layer0-kernel";

export type LockType = "mutex" | "rwlock" | "semaphore";

export interface LockHandle {
  readonly id: string;
  readonly resource: string;
  readonly type: LockType;
  readonly holder: string;
  readonly acquiredAt: Timestamp;
  readonly expiresAt: number;
}

interface LockEntry {
  resource: string;
  type: LockType;
  holders: Map<string, LockHandle>;
  waiters: Array<{ holder: string; resolve: (handle: LockHandle) => void; reject: (err: Error) => void }>;
  maxConcurrent: number;    // 1 for mutex, Infinity for read side, N for semaphore
  writerActive: boolean;    // for rwlock
}

export class Locks {
  private readonly kernel: Kernel;
  private readonly entries = new Map<string, LockEntry>();
  private readonly defaultTtlMs: number;
  private acquireCount = 0;
  private releaseCount = 0;
  private timeoutCount = 0;

  constructor(kernel: Kernel, defaultTtlMs: number = 30000) {
    this.kernel = kernel;
    this.defaultTtlMs = defaultTtlMs;
  }

  // ── Acquire ────────────────────────────────────────────────────────────

  async acquire(resource: string, holder: string, type: LockType = "mutex", opts?: { ttlMs?: number; maxConcurrent?: number; timeoutMs?: number }): Promise<LockHandle> {
    const ttlMs = opts?.ttlMs ?? this.defaultTtlMs;
    const timeoutMs = opts?.timeoutMs ?? 10000;

    let entry = this.entries.get(resource);
    if (!entry) {
      entry = {
        resource,
        type,
        holders: new Map(),
        waiters: [],
        maxConcurrent: type === "mutex" ? 1 : type === "semaphore" ? (opts?.maxConcurrent ?? 5) : Infinity,
        writerActive: false,
      };
      this.entries.set(resource, entry);
    }

    // Reap expired holders
    this.reap(entry);

    // Can we acquire immediately?
    if (this.canAcquire(entry, holder, type)) {
      return this.grant(entry, holder, ttlMs);
    }

    // Wait in queue
    return new Promise<LockHandle>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = entry!.waiters.findIndex((w) => w.holder === holder);
        if (idx !== -1) entry!.waiters.splice(idx, 1);
        this.timeoutCount++;
        reject(new Error(`Lock timeout: ${resource} after ${timeoutMs}ms`));
      }, timeoutMs);

      entry!.waiters.push({
        holder,
        resolve: (handle) => { clearTimeout(timer); resolve(handle); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
    });
  }

  // ── Release ────────────────────────────────────────────────────────────

  release(resource: string, holder: string): boolean {
    const entry = this.entries.get(resource);
    if (!entry) return false;

    const handle = entry.holders.get(holder);
    if (!handle) return false;

    entry.holders.delete(holder);
    if (entry.type === "rwlock") entry.writerActive = false;
    this.releaseCount++;

    // Try to grant to next waiter
    this.processWaiters(entry);

    // Cleanup empty entries
    if (entry.holders.size === 0 && entry.waiters.length === 0) {
      this.entries.delete(resource);
    }

    return true;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private canAcquire(entry: LockEntry, holder: string, requestType: LockType): boolean {
    if (entry.holders.has(holder)) return false; // re-entrant not supported

    switch (entry.type) {
      case "mutex":
        return entry.holders.size === 0;
      case "rwlock":
        if (requestType === "mutex") { // writer
          return entry.holders.size === 0 && !entry.writerActive;
        }
        return !entry.writerActive; // reader
      case "semaphore":
        return entry.holders.size < entry.maxConcurrent;
      default:
        return false;
    }
  }

  private grant(entry: LockEntry, holder: string, ttlMs: number): LockHandle {
    const handle: LockHandle = Object.freeze({
      id: this.kernel.monotonicId(),
      resource: entry.resource,
      type: entry.type,
      holder,
      acquiredAt: this.kernel.now(),
      expiresAt: Date.now() + ttlMs,
    });
    entry.holders.set(holder, handle);
    this.acquireCount++;
    return handle;
  }

  private processWaiters(entry: LockEntry): void {
    while (entry.waiters.length > 0) {
      const next = entry.waiters[0];
      if (this.canAcquire(entry, next.holder, entry.type)) {
        entry.waiters.shift();
        const handle = this.grant(entry, next.holder, this.defaultTtlMs);
        next.resolve(handle);
      } else {
        break;
      }
    }
  }

  private reap(entry: LockEntry): void {
    const now = Date.now();
    for (const [holder, handle] of entry.holders) {
      if (now > handle.expiresAt) {
        entry.holders.delete(holder);
        if (entry.type === "rwlock") entry.writerActive = false;
      }
    }
  }

  // ── Query ──────────────────────────────────────────────────────────────

  isLocked(resource: string): boolean {
    const entry = this.entries.get(resource);
    if (!entry) return false;
    this.reap(entry);
    return entry.holders.size > 0;
  }

  holders(resource: string): string[] {
    const entry = this.entries.get(resource);
    if (!entry) return [];
    this.reap(entry);
    return [...entry.holders.keys()];
  }

  stats(): { resources: number; acquired: number; released: number; timedOut: number } {
    return {
      resources: this.entries.size,
      acquired: this.acquireCount,
      released: this.releaseCount,
      timedOut: this.timeoutCount,
    };
  }
}
