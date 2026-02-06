// pentagon/underfloor/layer0-kernel.ts
//
// LAYER 0 — KERNEL
//
// The bedrock. Crypto primitives, deterministic RNG, hashing, timestamps.
// Nothing above this layer touches raw crypto directly. Everything flows
// through the Kernel. If the Kernel is compromised, everything is.
// That's why it's the smallest, most auditable layer.
//
// From outside: invisible. The Pentagon consumer never knows this exists.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Types — the vocabulary of the underfloor
// ---------------------------------------------------------------------------

export interface Digest {
  algorithm: "sha256" | "sha512" | "blake2b512";
  hex: string;
  bytes: Buffer;
}

export interface HmacTag {
  algorithm: "sha256" | "sha512";
  hex: string;
  bytes: Buffer;
  keyId: string;
}

export interface Timestamp {
  iso: string;
  epochMs: number;
  monotonic: bigint;
}

export interface Nonce {
  hex: string;
  bytes: Buffer;
  length: number;
}

export type KernelAlgorithm = "sha256" | "sha512" | "blake2b512";

// ---------------------------------------------------------------------------
// Kernel
// ---------------------------------------------------------------------------

export class Kernel {
  private readonly epoch: bigint;
  private counter: bigint = 0n;

  constructor() {
    this.epoch = process.hrtime.bigint();
  }

  // ── Hashing ────────────────────────────────────────────────────────────

  hash(data: Buffer | string, algorithm: KernelAlgorithm = "sha256"): Digest {
    const h = createHash(algorithm);
    h.update(typeof data === "string" ? Buffer.from(data, "utf-8") : data);
    const bytes = h.digest();
    return { algorithm, hex: bytes.toString("hex"), bytes };
  }

  hashChain(items: Array<Buffer | string>, algorithm: KernelAlgorithm = "sha256"): Digest {
    const h = createHash(algorithm);
    for (const item of items) {
      h.update(typeof item === "string" ? Buffer.from(item, "utf-8") : item);
      h.update(Buffer.from([0x00])); // domain separator
    }
    return { algorithm, hex: h.digest("hex"), bytes: h.digest() };
  }

  // ── HMAC ───────────────────────────────────────────────────────────────

  hmac(key: Buffer, data: Buffer | string, algorithm: "sha256" | "sha512" = "sha256"): HmacTag {
    const h = createHmac(algorithm, key);
    h.update(typeof data === "string" ? Buffer.from(data, "utf-8") : data);
    const bytes = h.digest();
    const keyId = this.hash(key, "sha256").hex.slice(0, 16);
    return { algorithm, hex: bytes.toString("hex"), bytes, keyId };
  }

  verifyHmac(key: Buffer, data: Buffer | string, tag: HmacTag): boolean {
    const computed = this.hmac(key, data, tag.algorithm);
    if (computed.bytes.length !== tag.bytes.length) return false;
    return timingSafeEqual(computed.bytes, tag.bytes);
  }

  // ── Nonce / Entropy ────────────────────────────────────────────────────

  nonce(length: number = 32): Nonce {
    const bytes = randomBytes(length);
    return { hex: bytes.toString("hex"), bytes, length };
  }

  deriveId(namespace: string, ...parts: string[]): string {
    const input = [namespace, ...parts].join(":");
    return this.hash(input, "sha256").hex.slice(0, 32);
  }

  // ── Time ───────────────────────────────────────────────────────────────

  now(): Timestamp {
    const d = new Date();
    return {
      iso: d.toISOString(),
      epochMs: d.getTime(),
      monotonic: process.hrtime.bigint() - this.epoch,
    };
  }

  monotonicId(): string {
    this.counter += 1n;
    const ts = process.hrtime.bigint() - this.epoch;
    const entropy = randomBytes(4).toString("hex");
    return `${ts.toString(36)}-${this.counter.toString(36)}-${entropy}`;
  }

  // ── Constant-time comparison ───────────────────────────────────────────

  equal(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  // ── Key derivation (HKDF-like via HMAC) ────────────────────────────────

  deriveKey(master: Buffer, salt: Buffer, info: string, length: number = 32): Buffer {
    const prk = this.hmac(salt, master, "sha512").bytes;
    const blocks: Buffer[] = [];
    let prev = Buffer.alloc(0);
    let needed = length;
    let counter = 1;

    while (needed > 0) {
      const h = createHmac("sha512", prk);
      h.update(prev);
      h.update(Buffer.from(info, "utf-8"));
      h.update(Buffer.from([counter]));
      prev = h.digest();
      blocks.push(prev);
      needed -= prev.length;
      counter++;
    }

    return Buffer.concat(blocks).subarray(0, length);
  }
}
