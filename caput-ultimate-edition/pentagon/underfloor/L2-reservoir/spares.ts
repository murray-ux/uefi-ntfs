// L2-reservoir/spares.ts
//
// ROOM: SPARES — Backup, snapshots, and redundancy
//
// Takes point-in-time snapshots of any data set. Maintains N most recent.
// Supports restore to any snapshot. Tracks integrity via hash chains.
//
// Lives in L2 because backups are a persistence concern.

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { Kernel } from "../layer0-kernel";

export interface Snapshot {
  id: string;
  label: string;
  createdAt: string;
  dataHash: string;
  parentHash: string;       // hash of previous snapshot — chain
  sizeBytes: number;
  tags: string[];
}

export interface SnapshotManifest {
  snapshots: Snapshot[];
  chainIntact: boolean;
  oldestAt: string | null;
  newestAt: string | null;
}

export class Spares {
  private readonly kernel: Kernel;
  private readonly dir: string;
  private readonly maxSnapshots: number;
  private snapshots: Snapshot[] = [];

  constructor(kernel: Kernel, dataDir: string, maxSnapshots: number = 50) {
    this.kernel = kernel;
    this.dir = join(dataDir, "spares");
    this.maxSnapshots = maxSnapshots;
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
    this.loadManifest();
  }

  // ── Snapshot ───────────────────────────────────────────────────────────

  snapshot(label: string, data: Buffer | string, tags: string[] = []): Snapshot {
    const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    const dataHash = this.kernel.hash(buf).hex;
    const parentHash = this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1].dataHash
      : "genesis";

    const id = this.kernel.monotonicId();
    const snap: Snapshot = {
      id,
      label,
      createdAt: new Date().toISOString(),
      dataHash,
      parentHash,
      sizeBytes: buf.length,
      tags,
    };

    // Write data
    writeFileSync(join(this.dir, `${id}.dat`), buf);

    this.snapshots.push(snap);

    // Evict oldest beyond max
    while (this.snapshots.length > this.maxSnapshots) {
      const evicted = this.snapshots.shift()!;
      const path = join(this.dir, `${evicted.id}.dat`);
      if (existsSync(path)) unlinkSync(path);
    }

    this.saveManifest();
    return snap;
  }

  // ── Restore ────────────────────────────────────────────────────────────

  restore(id: string): Buffer | null {
    const snap = this.snapshots.find((s) => s.id === id);
    if (!snap) return null;

    const path = join(this.dir, `${id}.dat`);
    if (!existsSync(path)) return null;

    const data = readFileSync(path);

    // Integrity check
    const hash = this.kernel.hash(data).hex;
    if (hash !== snap.dataHash) {
      throw new Error(`Integrity failure: snapshot ${id} — expected ${snap.dataHash}, got ${hash}`);
    }

    return data;
  }

  // ── Query ──────────────────────────────────────────────────────────────

  latest(): Snapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  list(): Snapshot[] {
    return [...this.snapshots];
  }

  findByLabel(label: string): Snapshot[] {
    return this.snapshots.filter((s) => s.label === label);
  }

  findByTag(tag: string): Snapshot[] {
    return this.snapshots.filter((s) => s.tags.includes(tag));
  }

  // ── Chain verification ─────────────────────────────────────────────────

  verifyChain(): { intact: boolean; breaks: string[] } {
    const breaks: string[] = [];
    for (let i = 1; i < this.snapshots.length; i++) {
      if (this.snapshots[i].parentHash !== this.snapshots[i - 1].dataHash) {
        breaks.push(this.snapshots[i].id);
      }
    }
    return { intact: breaks.length === 0, breaks };
  }

  manifest(): SnapshotManifest {
    const chain = this.verifyChain();
    return {
      snapshots: [...this.snapshots],
      chainIntact: chain.intact,
      oldestAt: this.snapshots.length > 0 ? this.snapshots[0].createdAt : null,
      newestAt: this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].createdAt : null,
    };
  }

  // ── Persistence ────────────────────────────────────────────────────────

  private saveManifest(): void {
    writeFileSync(join(this.dir, "manifest.json"), JSON.stringify(this.snapshots, null, 2));
  }

  private loadManifest(): void {
    const path = join(this.dir, "manifest.json");
    if (!existsSync(path)) return;
    try {
      this.snapshots = JSON.parse(readFileSync(path, "utf-8"));
    } catch { this.snapshots = []; }
  }
}
