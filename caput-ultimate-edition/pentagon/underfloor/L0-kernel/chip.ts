// L0-kernel/chip.ts
//
// ROOM: CHIP — Crypto accelerator and key management
//
// Centralises all key material. No other room generates, stores, or
// touches raw keys. The Chip issues key handles — opaque references
// that other rooms use for sign/verify/encrypt/decrypt without ever
// seeing the bits.
//
// Lives in L0 because keys are the most primitive secret.

import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "crypto";
import { Kernel, Digest } from "../layer0-kernel";

export interface KeyHandle {
  readonly id: string;
  readonly algorithm: string;
  readonly created: string;
  readonly fingerprint: string;
}

interface StoredKey {
  handle: KeyHandle;
  material: Buffer;
  algorithm: string;
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyId: string;
  algorithm: string;
}

export class Chip {
  private readonly kernel: Kernel;
  private readonly keys = new Map<string, StoredKey>();

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  // ── Key generation ─────────────────────────────────────────────────────

  generateKey(algorithm: "aes-256-gcm" | "hmac-sha256" | "hmac-sha512" = "aes-256-gcm"): KeyHandle {
    const size = algorithm === "aes-256-gcm" ? 32 : 64;
    const material = randomBytes(size);
    const fingerprint = createHash("sha256").update(material).digest("hex").slice(0, 16);
    const id = this.kernel.monotonicId();

    const handle: KeyHandle = Object.freeze({
      id,
      algorithm,
      created: new Date().toISOString(),
      fingerprint,
    });

    this.keys.set(id, { handle, material, algorithm });
    return handle;
  }

  importKey(material: Buffer, algorithm: "aes-256-gcm" | "hmac-sha256" | "hmac-sha512" = "aes-256-gcm"): KeyHandle {
    const fingerprint = createHash("sha256").update(material).digest("hex").slice(0, 16);
    const id = this.kernel.monotonicId();

    const handle: KeyHandle = Object.freeze({
      id,
      algorithm,
      created: new Date().toISOString(),
      fingerprint,
    });

    this.keys.set(id, { handle, material, algorithm });
    return handle;
  }

  destroyKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;
    // Zero the material before deleting
    key.material.fill(0);
    this.keys.delete(keyId);
    return true;
  }

  listKeys(): KeyHandle[] {
    return [...this.keys.values()].map((k) => k.handle);
  }

  // ── Encrypt / Decrypt (AES-256-GCM) ───────────────────────────────────

  encrypt(keyId: string, plaintext: Buffer): EncryptedBlob {
    const key = this.keys.get(keyId);
    if (!key) throw new Error(`Key not found: ${keyId}`);
    if (key.algorithm !== "aes-256-gcm") throw new Error(`Key ${keyId} is not AES-256-GCM`);

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key.material.subarray(0, 32), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return { ciphertext, iv, tag, keyId, algorithm: "aes-256-gcm" };
  }

  decrypt(blob: EncryptedBlob): Buffer {
    const key = this.keys.get(blob.keyId);
    if (!key) throw new Error(`Key not found: ${blob.keyId}`);

    const decipher = createDecipheriv("aes-256-gcm", key.material.subarray(0, 32), blob.iv);
    decipher.setAuthTag(blob.tag);
    return Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]);
  }

  // ── HMAC sign / verify ─────────────────────────────────────────────────

  sign(keyId: string, data: Buffer): { signature: Buffer; keyId: string } {
    const key = this.keys.get(keyId);
    if (!key) throw new Error(`Key not found: ${keyId}`);

    const algo = key.algorithm === "hmac-sha512" ? "sha512" : "sha256";
    const signature = createHmac(algo, key.material).update(data).digest();
    return { signature, keyId };
  }

  verify(keyId: string, data: Buffer, signature: Buffer): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    const algo = key.algorithm === "hmac-sha512" ? "sha512" : "sha256";
    const expected = createHmac(algo, key.material).update(data).digest();
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(expected, signature);
  }

  // ── Key derivation ─────────────────────────────────────────────────────

  deriveChild(parentKeyId: string, label: string): KeyHandle {
    const parent = this.keys.get(parentKeyId);
    if (!parent) throw new Error(`Parent key not found: ${parentKeyId}`);

    const derived = this.kernel.deriveKey(parent.material, Buffer.from(label), `child:${label}`, 32);
    return this.importKey(derived, "aes-256-gcm");
  }

  // ── Diagnostics ────────────────────────────────────────────────────────

  status(): { keyCount: number; algorithms: Record<string, number> } {
    const algorithms: Record<string, number> = {};
    for (const k of this.keys.values()) {
      algorithms[k.algorithm] = (algorithms[k.algorithm] || 0) + 1;
    }
    return { keyCount: this.keys.size, algorithms };
  }
}
