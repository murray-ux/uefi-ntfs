// pentagon/underfloor/layer2-reservoir.ts
//
// LAYER 2 — RESERVOIR
//
// State management, caching, and persistence. The Reservoir holds
// everything the system remembers. Three tiers:
//
//   HOT   — In-memory LRU cache (microsecond access)
//   WARM  — Serialized to disk (millisecond access)
//   COLD  — Append-only ledger (audit-grade, immutable)
//
// Every write goes HOT → WARM → COLD (write-through).
// Every read checks HOT first, then WARM, then COLD (read-through).
//
// From outside: invisible. Pentagon consumers just get fast answers.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from "fs";
import { join } from "path";
import { Kernel, Digest, Timestamp } from "./layer0-kernel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tier = "hot" | "warm" | "cold";

export interface Entry<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly hash: string;
  readonly storedAt: Timestamp;
  readonly tier: Tier;
  readonly ttlMs: number;      // 0 = never expires
  readonly version: number;
}

export interface ReservoirStats {
  hot: { size: number; capacity: number; hits: number; misses: number };
  warm: { size: number; hits: number; misses: number };
  cold: { entries: number };
}

// ---------------------------------------------------------------------------
// HOT tier — bounded LRU map
// ---------------------------------------------------------------------------

class HotCache<T = unknown> {
  private readonly map = new Map<string, Entry<T>>();
  private readonly capacity: number;
  hits = 0;
  misses = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string): Entry<T> | null {
    const entry = this.map.get(key);
    if (!entry) { this.misses++; return null; }

    // TTL check
    if (entry.ttlMs > 0 && Date.now() - entry.storedAt.epochMs > entry.ttlMs) {
      this.map.delete(key);
      this.misses++;
      return null;
    }

    // LRU bump — delete and re-insert to move to end
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry;
  }

  set(entry: Entry<T>): void {
    if (this.map.has(entry.key)) {
      this.map.delete(entry.key);
    }
    this.map.set(entry.key, entry);

    // Evict oldest if over capacity
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  get size(): number { return this.map.size; }
  keys(): string[] { return [...this.map.keys()]; }
}

// ---------------------------------------------------------------------------
// WARM tier — disk-backed key-value store
// ---------------------------------------------------------------------------

class WarmStore<T = unknown> {
  private readonly dir: string;
  private readonly kernel: Kernel;
  hits = 0;
  misses = 0;

  constructor(dir: string, kernel: Kernel) {
    this.dir = dir;
    this.kernel = kernel;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private filePath(key: string): string {
    const safe = this.kernel.hash(key).hex.slice(0, 32);
    return join(this.dir, `${safe}.json`);
  }

  get(key: string): Entry<T> | null {
    const path = this.filePath(key);
    if (!existsSync(path)) { this.misses++; return null; }

    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as Entry<T>;

      // TTL check
      if (raw.ttlMs > 0 && Date.now() - raw.storedAt.epochMs > raw.ttlMs) {
        this.misses++;
        return null;
      }

      this.hits++;
      return raw;
    } catch {
      this.misses++;
      return null;
    }
  }

  set(entry: Entry<T>): void {
    const path = this.filePath(entry.key);
    writeFileSync(path, JSON.stringify(entry));
  }

  get size(): number {
    try {
      return readdirSync(this.dir).filter((f) => f.endsWith(".json")).length;
    } catch { return 0; }
  }
}

// ---------------------------------------------------------------------------
// COLD tier — append-only ledger
// ---------------------------------------------------------------------------

class ColdLedger {
  private readonly path: string;
  private lineCount = 0;

  constructor(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.path = join(dir, "ledger.jsonl");
    if (existsSync(this.path)) {
      this.lineCount = readFileSync(this.path, "utf-8").split("\n").filter(Boolean).length;
    }
  }

  append(entry: Entry): void {
    appendFileSync(this.path, JSON.stringify(entry) + "\n");
    this.lineCount++;
  }

  scan(predicate: (entry: Entry) => boolean): Entry[] {
    if (!existsSync(this.path)) return [];
    const lines = readFileSync(this.path, "utf-8").split("\n").filter(Boolean);
    const results: Entry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as Entry;
        if (predicate(entry)) results.push(entry);
      } catch { /* skip malformed */ }
    }
    return results;
  }

  get entries(): number { return this.lineCount; }
}

// ---------------------------------------------------------------------------
// Reservoir — unified interface across all three tiers
// ---------------------------------------------------------------------------

export class Reservoir {
  private readonly kernel: Kernel;
  private readonly hot: HotCache;
  private readonly warm: WarmStore;
  private readonly cold: ColdLedger;

  constructor(kernel: Kernel, dataDir: string, hotCapacity: number = 4096) {
    this.kernel = kernel;
    this.hot = new HotCache(hotCapacity);
    this.warm = new WarmStore(join(dataDir, "warm"), kernel);
    this.cold = new ColdLedger(join(dataDir, "cold"));
  }

  // ── Write — flows through all three tiers ──────────────────────────────

  put<T>(key: string, value: T, ttlMs: number = 0): Entry<T> {
    const ts = this.kernel.now();
    const hash = this.kernel.hash(JSON.stringify({ key, value })).hex;

    // Check for version bump
    const existing = this.hot.get(key);
    const version = existing ? existing.version + 1 : 1;

    const entry: Entry<T> = Object.freeze({
      key,
      value,
      hash,
      storedAt: ts,
      tier: "hot" as Tier,
      ttlMs,
      version,
    });

    // Write-through: hot → warm → cold
    this.hot.set(entry as Entry);
    this.warm.set(entry as Entry);
    this.cold.append(entry as Entry);

    return entry;
  }

  // ── Read — checks hot → warm → cold ───────────────────────────────────

  get<T>(key: string): T | null {
    // Hot
    const hotEntry = this.hot.get(key);
    if (hotEntry) return hotEntry.value as T;

    // Warm
    const warmEntry = this.warm.get(key);
    if (warmEntry) {
      // Promote to hot
      this.hot.set(warmEntry as Entry);
      return warmEntry.value as T;
    }

    // Cold — scan (expensive, last resort)
    const coldEntries = this.cold.scan((e) => e.key === key);
    if (coldEntries.length > 0) {
      const latest = coldEntries[coldEntries.length - 1];
      // Promote to hot + warm
      this.hot.set(latest);
      this.warm.set(latest);
      return latest.value as T;
    }

    return null;
  }

  // ── Metadata read ──────────────────────────────────────────────────────

  getEntry<T>(key: string): Entry<T> | null {
    const hotEntry = this.hot.get(key);
    if (hotEntry) return hotEntry as Entry<T>;
    const warmEntry = this.warm.get(key);
    if (warmEntry) return warmEntry as Entry<T>;
    return null;
  }

  // ── History — all versions from cold ledger ────────────────────────────

  history(key: string): Entry[] {
    return this.cold.scan((e) => e.key === key);
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  stats(): ReservoirStats {
    return {
      hot: {
        size: this.hot.size,
        capacity: 4096,
        hits: this.hot.hits,
        misses: this.hot.misses,
      },
      warm: {
        size: this.warm.size,
        hits: this.warm.hits,
        misses: this.warm.misses,
      },
      cold: {
        entries: this.cold.entries,
      },
    };
  }
}
