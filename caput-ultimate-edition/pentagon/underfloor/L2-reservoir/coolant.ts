// L2-reservoir/coolant.ts
//
// ROOM: COOLANT — Cache eviction and thermal management
//
// Monitors cache pressure, runs eviction policies, and prevents the
// HOT tier from overheating. Three eviction strategies:
//   LRU   — Least Recently Used (default)
//   LFU   — Least Frequently Used
//   TTL   — Expired entries first
//
// Lives in L2 because cache management is a reservoir concern.

import { Kernel, Timestamp } from "../layer0-kernel";

export type EvictionPolicy = "lru" | "lfu" | "ttl";

export interface CacheEntry {
  key: string;
  size: number;
  accessCount: number;
  lastAccess: number;     // epochMs
  createdAt: number;      // epochMs
  ttlMs: number;          // 0 = no expiry
}

export interface EvictionResult {
  evicted: number;
  freedBytes: number;
  policy: EvictionPolicy;
  survivors: number;
  ts: Timestamp;
}

export interface CoolantStats {
  entries: number;
  totalBytes: number;
  capacityBytes: number;
  pressure: number;          // 0.0 – 1.0
  evictions: number;
  policy: EvictionPolicy;
}

export class Coolant {
  private readonly kernel: Kernel;
  private readonly entries = new Map<string, CacheEntry>();
  private readonly capacityBytes: number;
  private currentBytes = 0;
  private policy: EvictionPolicy;
  private totalEvictions = 0;
  private readonly pressureThreshold: number;

  constructor(kernel: Kernel, capacityBytes: number = 64 * 1024 * 1024, policy: EvictionPolicy = "lru", pressureThreshold = 0.85) {
    this.kernel = kernel;
    this.capacityBytes = capacityBytes;
    this.policy = policy;
    this.pressureThreshold = pressureThreshold;
  }

  // ── Track ──────────────────────────────────────────────────────────────

  track(key: string, size: number, ttlMs: number = 0): void {
    const now = Date.now();
    const existing = this.entries.get(key);
    if (existing) {
      this.currentBytes -= existing.size;
    }

    this.entries.set(key, {
      key,
      size,
      accessCount: existing ? existing.accessCount + 1 : 1,
      lastAccess: now,
      createdAt: existing?.createdAt ?? now,
      ttlMs,
    });
    this.currentBytes += size;

    // Auto-cool if over pressure threshold
    if (this.pressure() > this.pressureThreshold) {
      this.cool();
    }
  }

  touch(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      entry.accessCount++;
      entry.lastAccess = Date.now();
    }
  }

  remove(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.currentBytes -= entry.size;
    this.entries.delete(key);
    return true;
  }

  // ── Eviction ───────────────────────────────────────────────────────────

  cool(targetPressure: number = 0.6): EvictionResult {
    const targetBytes = Math.floor(this.capacityBytes * targetPressure);
    const toFree = this.currentBytes - targetBytes;
    if (toFree <= 0) {
      return { evicted: 0, freedBytes: 0, policy: this.policy, survivors: this.entries.size, ts: this.kernel.now() };
    }

    // Sort candidates by eviction policy
    const candidates = [...this.entries.values()];
    switch (this.policy) {
      case "lru":
        candidates.sort((a, b) => a.lastAccess - b.lastAccess);
        break;
      case "lfu":
        candidates.sort((a, b) => a.accessCount - b.accessCount);
        break;
      case "ttl":
        // Expired first, then by remaining TTL
        candidates.sort((a, b) => {
          const aExpired = a.ttlMs > 0 && Date.now() - a.createdAt > a.ttlMs;
          const bExpired = b.ttlMs > 0 && Date.now() - b.createdAt > b.ttlMs;
          if (aExpired && !bExpired) return -1;
          if (!aExpired && bExpired) return 1;
          const aRemaining = a.ttlMs > 0 ? a.ttlMs - (Date.now() - a.createdAt) : Infinity;
          const bRemaining = b.ttlMs > 0 ? b.ttlMs - (Date.now() - b.createdAt) : Infinity;
          return aRemaining - bRemaining;
        });
        break;
    }

    let freed = 0;
    let evicted = 0;
    for (const candidate of candidates) {
      if (freed >= toFree) break;
      this.entries.delete(candidate.key);
      this.currentBytes -= candidate.size;
      freed += candidate.size;
      evicted++;
      this.totalEvictions++;
    }

    return {
      evicted,
      freedBytes: freed,
      policy: this.policy,
      survivors: this.entries.size,
      ts: this.kernel.now(),
    };
  }

  // ── Flush expired ──────────────────────────────────────────────────────

  flush(): EvictionResult {
    const now = Date.now();
    let freed = 0;
    let evicted = 0;

    for (const [key, entry] of this.entries) {
      if (entry.ttlMs > 0 && now - entry.createdAt > entry.ttlMs) {
        this.currentBytes -= entry.size;
        this.entries.delete(key);
        freed += entry.size;
        evicted++;
        this.totalEvictions++;
      }
    }

    return { evicted, freedBytes: freed, policy: "ttl", survivors: this.entries.size, ts: this.kernel.now() };
  }

  // ── Query ──────────────────────────────────────────────────────────────

  pressure(): number {
    return this.capacityBytes > 0 ? this.currentBytes / this.capacityBytes : 0;
  }

  setPolicy(policy: EvictionPolicy): void {
    this.policy = policy;
  }

  stats(): CoolantStats {
    return {
      entries: this.entries.size,
      totalBytes: this.currentBytes,
      capacityBytes: this.capacityBytes,
      pressure: Math.round(this.pressure() * 1000) / 1000,
      evictions: this.totalEvictions,
      policy: this.policy,
    };
  }
}
