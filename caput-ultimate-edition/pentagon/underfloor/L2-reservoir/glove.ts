// pentagon/underfloor/L2-reservoir/glove.ts
//
// ROOM: GLOVE — Secure small-item storage, ephemeral secrets, and scratch space.
// Items are stored with optional TTL. Expired entries are swept lazily on
// access or eagerly via sweep(). Access counts are tracked per key.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "../layer0-kernel";

interface GloveItem {
  key: string;
  value: unknown;
  ttlMs: number;
  storedAt: number;
  expiresAt: number;
  accessCount: number;
  encrypted: boolean;
}

export class Glove {
  private readonly kernel: Kernel;
  private readonly items: Map<string, GloveItem> = new Map();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  store(key: string, value: unknown, ttlMs = 0): GloveItem {
    const now = Date.now();
    const item: GloveItem = {
      key, value, ttlMs,
      storedAt: now,
      expiresAt: ttlMs > 0 ? now + ttlMs : 0,
      accessCount: 0,
      encrypted: typeof value === "string" && value.startsWith("enc:"),
    };
    this.items.set(key, item);
    return item;
  }

  retrieve(key: string): unknown | null {
    const item = this.items.get(key);
    if (!item) return null;
    if (item.expiresAt > 0 && Date.now() >= item.expiresAt) {
      this.items.delete(key);
      return null;
    }
    item.accessCount++;
    return item.value;
  }

  remove(key: string): boolean {
    return this.items.delete(key);
  }

  has(key: string): boolean {
    const item = this.items.get(key);
    if (!item) return false;
    if (item.expiresAt > 0 && Date.now() >= item.expiresAt) {
      this.items.delete(key);
      return false;
    }
    return true;
  }

  sweep(): number {
    const now = Date.now();
    let swept = 0;
    for (const [key, item] of this.items) {
      if (item.expiresAt > 0 && now >= item.expiresAt) {
        this.items.delete(key);
        swept++;
      }
    }
    return swept;
  }

  keys(): string[] {
    const now = Date.now();
    const result: string[] = [];
    for (const [key, item] of this.items) {
      if (item.expiresAt === 0 || now < item.expiresAt) {
        result.push(key);
      }
    }
    return result;
  }

  stats(): Record<string, unknown> {
    const all = [...this.items.values()];
    const now = Date.now();
    const expired = all.filter(i => i.expiresAt > 0 && now >= i.expiresAt).length;
    return {
      totalItems: all.length,
      activeItems: all.length - expired,
      expiredItems: expired,
      encryptedItems: all.filter(i => i.encrypted).length,
      totalAccesses: all.reduce((s, i) => s + i.accessCount, 0),
    };
  }
}
