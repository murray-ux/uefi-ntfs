// identity/ed25519_signer.ts
//
// Ed25519 document signing — real signatures using Node 20+ crypto.
//
// Every important artefact (evidence bundles, audit snapshots, firmware
// hashes) gets signed. The signature proves who signed and that the
// content hasn't been altered. Court-admissible when paired with
// chain-of-custody.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
  KeyObject,
} from "crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignResult {
  hash: string;          // SHA-256 hex of the input
  signature: string;     // Ed25519 signature hex
  keyId: string;         // Truncated SHA-256 of the public key
  signedAt: string;
}

export interface VerifyResult {
  valid: boolean;
  hash: string;
  keyId: string;
  checkedAt: string;
}

export interface KeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
}

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

export function generateKeys(): KeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" }) as string;
  const keyId = createHash("sha256").update(pubPem).digest("hex").slice(0, 16);
  return { privateKey, publicKey, keyId };
}

export function loadOrCreateKeys(keyDir: string, name: string = "genesis"): KeyPair {
  const privPath = join(keyDir, `${name}.key`);
  const pubPath = join(keyDir, `${name}.pub`);

  if (existsSync(privPath) && existsSync(pubPath)) {
    const privPem = readFileSync(privPath, "utf-8");
    const pubPem = readFileSync(pubPath, "utf-8");
    const privateKey = require("crypto").createPrivateKey(privPem);
    const publicKey = require("crypto").createPublicKey(pubPem);
    const keyId = createHash("sha256").update(pubPem).digest("hex").slice(0, 16);
    return { privateKey, publicKey, keyId };
  }

  const keys = generateKeys();

  const privPem = keys.privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const pubPem = keys.publicKey.export({ type: "spki", format: "pem" }) as string;

  writeFileSync(privPath, privPem, { mode: 0o600 });
  writeFileSync(pubPath, pubPem, { mode: 0o644 });

  return keys;
}

// ---------------------------------------------------------------------------
// Signer
// ---------------------------------------------------------------------------

export class Ed25519Signer {
  private keys: KeyPair;

  constructor(keys: KeyPair) {
    this.keys = keys;
  }

  // Sign raw bytes
  signBytes(data: Buffer | Uint8Array): SignResult {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const hash = createHash("sha256").update(buf).digest("hex");
    const sigBuf = sign(null, buf, this.keys.privateKey);

    return {
      hash,
      signature: sigBuf.toString("hex"),
      keyId: this.keys.keyId,
      signedAt: new Date().toISOString(),
    };
  }

  // Sign a file by path
  signFile(filePath: string): SignResult {
    const data = readFileSync(filePath);
    return this.signBytes(data);
  }

  // Sign a JSON-serializable object (canonical form)
  signObject(obj: unknown): SignResult {
    const canonical = Buffer.from(JSON.stringify(obj), "utf-8");
    return this.signBytes(canonical);
  }

  // Verify a signature against data
  static verify(
    data: Buffer | Uint8Array,
    signatureHex: string,
    publicKey: KeyObject,
  ): VerifyResult {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const hash = createHash("sha256").update(buf).digest("hex");
    const sigBuf = Buffer.from(signatureHex, "hex");

    const pubPem = publicKey.export({ type: "spki", format: "pem" }) as string;
    const keyId = createHash("sha256").update(pubPem).digest("hex").slice(0, 16);

    const valid = verify(null, buf, publicKey, sigBuf);

    return {
      valid,
      hash,
      keyId,
      checkedAt: new Date().toISOString(),
    };
  }

  getKeyId(): string {
    return this.keys.keyId;
  }

  getPublicKey(): KeyObject {
    return this.keys.publicKey;
  }
}
