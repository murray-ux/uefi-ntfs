// L2-reservoir/trunk.ts
//
// ROOM: TRUNK — Bulk storage with content-addressed retrieval
//
// Large binary objects go in the Trunk. Files, PDFs, images, archives.
// Every blob is stored by SHA-256 content address. Deduplication is free.
// Metadata (tags, mime type, size) is stored alongside the blob reference.
//
// Lives in L2 because bulk storage is a reservoir concern.

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { Kernel, Digest } from "../layer0-kernel";

export interface BlobMeta {
  hash: string;
  size: number;
  mimeType: string;
  tags: string[];
  storedAt: string;
  accessCount: number;
  lastAccessed: string | null;
}

export interface TrunkStats {
  blobCount: number;
  totalBytes: number;
  uniqueHashes: number;
  tags: Record<string, number>;
}

export class Trunk {
  private readonly kernel: Kernel;
  private readonly blobDir: string;
  private readonly metaDir: string;
  private readonly index = new Map<string, BlobMeta>();

  constructor(kernel: Kernel, dataDir: string) {
    this.kernel = kernel;
    this.blobDir = join(dataDir, "trunk", "blobs");
    this.metaDir = join(dataDir, "trunk", "meta");
    if (!existsSync(this.blobDir)) mkdirSync(this.blobDir, { recursive: true });
    if (!existsSync(this.metaDir)) mkdirSync(this.metaDir, { recursive: true });
    this.reindex();
  }

  // ── Store ──────────────────────────────────────────────────────────────

  store(data: Buffer, mimeType: string = "application/octet-stream", tags: string[] = []): BlobMeta {
    const digest = this.kernel.hash(data, "sha256");
    const hash = digest.hex;

    // Content-addressed: if hash exists, just update meta
    const existing = this.index.get(hash);
    if (existing) {
      // Merge tags
      for (const t of tags) {
        if (!existing.tags.includes(t)) existing.tags.push(t);
      }
      this.writeMeta(hash, existing);
      return existing;
    }

    // Write blob — first 2 hex chars as directory sharding
    const shard = hash.slice(0, 2);
    const shardDir = join(this.blobDir, shard);
    if (!existsSync(shardDir)) mkdirSync(shardDir, { recursive: true });
    writeFileSync(join(shardDir, hash), data);

    const meta: BlobMeta = {
      hash,
      size: data.length,
      mimeType,
      tags,
      storedAt: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: null,
    };

    this.writeMeta(hash, meta);
    this.index.set(hash, meta);
    return meta;
  }

  // ── Retrieve ───────────────────────────────────────────────────────────

  retrieve(hash: string): Buffer | null {
    const shard = hash.slice(0, 2);
    const path = join(this.blobDir, shard, hash);
    if (!existsSync(path)) return null;

    const meta = this.index.get(hash);
    if (meta) {
      meta.accessCount++;
      meta.lastAccessed = new Date().toISOString();
      this.writeMeta(hash, meta);
    }

    return readFileSync(path);
  }

  // ── Query ──────────────────────────────────────────────────────────────

  getMeta(hash: string): BlobMeta | null {
    return this.index.get(hash) ?? null;
  }

  findByTag(tag: string): BlobMeta[] {
    return [...this.index.values()].filter((m) => m.tags.includes(tag));
  }

  findByMimeType(mime: string): BlobMeta[] {
    return [...this.index.values()].filter((m) => m.mimeType === mime);
  }

  list(): BlobMeta[] {
    return [...this.index.values()];
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  delete(hash: string): boolean {
    const shard = hash.slice(0, 2);
    const blobPath = join(this.blobDir, shard, hash);
    const metaPath = join(this.metaDir, `${hash}.json`);

    let deleted = false;
    if (existsSync(blobPath)) { unlinkSync(blobPath); deleted = true; }
    if (existsSync(metaPath)) { unlinkSync(metaPath); deleted = true; }
    this.index.delete(hash);
    return deleted;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private writeMeta(hash: string, meta: BlobMeta): void {
    writeFileSync(join(this.metaDir, `${hash}.json`), JSON.stringify(meta));
  }

  private reindex(): void {
    if (!existsSync(this.metaDir)) return;
    for (const file of readdirSync(this.metaDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const meta = JSON.parse(readFileSync(join(this.metaDir, file), "utf-8")) as BlobMeta;
        this.index.set(meta.hash, meta);
      } catch { /* skip corrupt */ }
    }
  }

  stats(): TrunkStats {
    let totalBytes = 0;
    const tags: Record<string, number> = {};
    for (const m of this.index.values()) {
      totalBytes += m.size;
      for (const t of m.tags) tags[t] = (tags[t] || 0) + 1;
    }
    return { blobCount: this.index.size, totalBytes, uniqueHashes: this.index.size, tags };
  }
}
