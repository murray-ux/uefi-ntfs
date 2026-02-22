// src/audit/chain-of-custody.ts
//
// CHAIN OF CUSTODY — Court-admissible evidence trail with Ed25519 signing.
//
// Every audit event gets:
//   1. SHA-256 hash chained to the previous event (tamper-evident ledger)
//   2. Ed25519 signature over (eventHash + prevHash) using Node 20+ crypto
//   3. Verification function that walks the entire chain and validates
//      every link, every signature, every hash.
//
// The output is a .jsonl file where each line is a self-contained,
// independently verifiable evidence record. Any single tampered line
// breaks the chain from that point forward.
//
// Usage:
//   import { CustodyChain } from "./chain-of-custody";
//   const chain = await CustodyChain.create("./evidence");
//   await chain.record("EVIDENCE_INTAKE", "agent-1", { ... });
//   const report = await CustodyChain.verify("./evidence/custody.jsonl");
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import {
  createHash, randomUUID, generateKeyPairSync, sign, verify,
  KeyObject,
} from "crypto";
import {
  appendFileSync, readFileSync, writeFileSync,
  existsSync, mkdirSync,
} from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustodyRecord {
  recordId: string;
  sequenceNo: number;
  ts: string;
  eventType: string;
  actorId: string;
  payload: Record<string, unknown>;
  contentHash: string;      // SHA-256 of (eventType + actorId + payload + ts)
  prevHash: string;         // Previous record's contentHash ("GENESIS" for first)
  chainHash: string;        // SHA-256 of (contentHash + prevHash)
  signature: string;        // Ed25519 signature over chainHash (hex-encoded)
}

export interface VerificationResult {
  valid: boolean;
  totalRecords: number;
  verifiedRecords: number;
  firstBrokenAt: number | null;
  brokenReason: string | null;
  chainRoot: string;        // First record's contentHash
  chainHead: string;        // Last record's chainHash
}

export interface CustodyConfig {
  evidenceDir: string;
  keyId?: string;
}

// ---------------------------------------------------------------------------
// Ed25519 key management — generates a keypair per chain instance.
// In production you'd load from HSM/Vault. Here we persist to disk
// so the chain can be verified across process restarts.
// ---------------------------------------------------------------------------

function loadOrGenerateKeys(evidenceDir: string): {
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
} {
  const privPath = join(evidenceDir, "custody.key");
  const pubPath = join(evidenceDir, "custody.pub");

  if (existsSync(privPath) && existsSync(pubPath)) {
    const privPem = readFileSync(privPath, "utf-8");
    const pubPem = readFileSync(pubPath, "utf-8");
    const keyId = createHash("sha256").update(pubPem).digest("hex").slice(0, 16);
    return {
      privateKey: require("crypto").createPrivateKey(privPem),
      publicKey: require("crypto").createPublicKey(pubPem),
      keyId,
    };
  }

  // Generate fresh Ed25519 keypair
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");

  const privPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const pubPem = publicKey.export({ type: "spki", format: "pem" }) as string;

  writeFileSync(privPath, privPem, { mode: 0o600 });
  writeFileSync(pubPath, pubPem, { mode: 0o644 });

  const keyId = createHash("sha256").update(pubPem).digest("hex").slice(0, 16);
  return { privateKey, publicKey, keyId };
}

// ---------------------------------------------------------------------------
// CustodyChain
// ---------------------------------------------------------------------------

export class CustodyChain {
  private evidenceDir: string;
  private chainPath: string;
  private privateKey: KeyObject;
  private publicKey: KeyObject;
  private keyId: string;
  private sequenceNo: number;
  private prevHash: string;

  private constructor(
    evidenceDir: string,
    privateKey: KeyObject,
    publicKey: KeyObject,
    keyId: string,
    sequenceNo: number,
    prevHash: string,
  ) {
    this.evidenceDir = evidenceDir;
    this.chainPath = join(evidenceDir, "custody.jsonl");
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.keyId = keyId;
    this.sequenceNo = sequenceNo;
    this.prevHash = prevHash;
  }

  // Factory — reads existing chain to find the head, or starts fresh.
  static async create(evidenceDir: string): Promise<CustodyChain> {
    if (!existsSync(evidenceDir)) {
      mkdirSync(evidenceDir, { recursive: true });
    }

    const keys = loadOrGenerateKeys(evidenceDir);
    const chainPath = join(evidenceDir, "custody.jsonl");

    let sequenceNo = 0;
    let prevHash = "GENESIS";

    if (existsSync(chainPath)) {
      const lines = readFileSync(chainPath, "utf-8")
        .split("\n")
        .filter((l) => l.trim().length > 0);

      if (lines.length > 0) {
        const last: CustodyRecord = JSON.parse(lines[lines.length - 1]);
        sequenceNo = last.sequenceNo + 1;
        prevHash = last.chainHash;
      }
    }

    return new CustodyChain(
      evidenceDir,
      keys.privateKey,
      keys.publicKey,
      keys.keyId,
      sequenceNo,
      prevHash,
    );
  }

  // Record a new event into the chain
  async record(
    eventType: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<CustodyRecord> {
    const ts = new Date().toISOString();
    const recordId = randomUUID();

    // Content hash: what happened
    const contentHash = createHash("sha256")
      .update(`${eventType}|${actorId}|${JSON.stringify(payload)}|${ts}`)
      .digest("hex");

    // Chain hash: what happened + what came before
    const chainHash = createHash("sha256")
      .update(`${contentHash}|${this.prevHash}`)
      .digest("hex");

    // Sign the chain hash
    const sigBuffer = sign(null, Buffer.from(chainHash, "hex"), this.privateKey);
    const signature = sigBuffer.toString("hex");

    const record: CustodyRecord = {
      recordId,
      sequenceNo: this.sequenceNo,
      ts,
      eventType,
      actorId,
      payload,
      contentHash,
      prevHash: this.prevHash,
      chainHash,
      signature,
    };

    // Append-only write — failure here is fatal
    const line = JSON.stringify(record) + "\n";
    appendFileSync(this.chainPath, line, "utf-8");

    // Advance state
    this.sequenceNo++;
    this.prevHash = chainHash;

    return record;
  }

  // Static verification — reads the chain file and validates every link.
  // No private key needed. Only the public key.
  static async verify(chainPath: string): Promise<VerificationResult> {
    if (!existsSync(chainPath)) {
      return {
        valid: false,
        totalRecords: 0,
        verifiedRecords: 0,
        firstBrokenAt: null,
        brokenReason: "Chain file does not exist",
        chainRoot: "",
        chainHead: "",
      };
    }

    const evidenceDir = join(chainPath, "..");
    const pubPath = join(evidenceDir, "custody.pub");
    if (!existsSync(pubPath)) {
      return {
        valid: false,
        totalRecords: 0,
        verifiedRecords: 0,
        firstBrokenAt: null,
        brokenReason: "Public key file missing — cannot verify signatures",
        chainRoot: "",
        chainHead: "",
      };
    }

    const pubPem = readFileSync(pubPath, "utf-8");
    const publicKey = require("crypto").createPublicKey(pubPem);

    const lines = readFileSync(chainPath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      return {
        valid: true,
        totalRecords: 0,
        verifiedRecords: 0,
        firstBrokenAt: null,
        brokenReason: null,
        chainRoot: "",
        chainHead: "",
      };
    }

    let prevHash = "GENESIS";
    let chainRoot = "";
    let chainHead = "";

    for (let i = 0; i < lines.length; i++) {
      const record: CustodyRecord = JSON.parse(lines[i]);

      // Check 1: sequence continuity
      if (record.sequenceNo !== i) {
        return {
          valid: false,
          totalRecords: lines.length,
          verifiedRecords: i,
          firstBrokenAt: i,
          brokenReason: `Sequence gap: expected ${i}, got ${record.sequenceNo}`,
          chainRoot,
          chainHead: record.chainHash,
        };
      }

      // Check 2: prevHash linkage
      if (record.prevHash !== prevHash) {
        return {
          valid: false,
          totalRecords: lines.length,
          verifiedRecords: i,
          firstBrokenAt: i,
          brokenReason: `Prev-hash mismatch at record ${i}`,
          chainRoot,
          chainHead: record.chainHash,
        };
      }

      // Check 3: recompute contentHash
      const expectedContentHash = createHash("sha256")
        .update(`${record.eventType}|${record.actorId}|${JSON.stringify(record.payload)}|${record.ts}`)
        .digest("hex");

      if (record.contentHash !== expectedContentHash) {
        return {
          valid: false,
          totalRecords: lines.length,
          verifiedRecords: i,
          firstBrokenAt: i,
          brokenReason: `Content hash mismatch at record ${i} — data tampered`,
          chainRoot,
          chainHead: record.chainHash,
        };
      }

      // Check 4: recompute chainHash
      const expectedChainHash = createHash("sha256")
        .update(`${record.contentHash}|${record.prevHash}`)
        .digest("hex");

      if (record.chainHash !== expectedChainHash) {
        return {
          valid: false,
          totalRecords: lines.length,
          verifiedRecords: i,
          firstBrokenAt: i,
          brokenReason: `Chain hash mismatch at record ${i}`,
          chainRoot,
          chainHead: record.chainHash,
        };
      }

      // Check 5: verify Ed25519 signature
      const sigValid = verify(
        null,
        Buffer.from(record.chainHash, "hex"),
        publicKey,
        Buffer.from(record.signature, "hex"),
      );

      if (!sigValid) {
        return {
          valid: false,
          totalRecords: lines.length,
          verifiedRecords: i,
          firstBrokenAt: i,
          brokenReason: `Ed25519 signature invalid at record ${i}`,
          chainRoot,
          chainHead: record.chainHash,
        };
      }

      // Advance
      if (i === 0) chainRoot = record.contentHash;
      chainHead = record.chainHash;
      prevHash = record.chainHash;
    }

    return {
      valid: true,
      totalRecords: lines.length,
      verifiedRecords: lines.length,
      firstBrokenAt: null,
      brokenReason: null,
      chainRoot,
      chainHead,
    };
  }

  // Convenience: get the public key ID for this chain
  getKeyId(): string {
    return this.keyId;
  }
}

// ---------------------------------------------------------------------------
// CLI — demo / standalone verification
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "demo") {
    // Create a chain, write some events, verify it
    const dir = args[1] || "./evidence-demo";
    console.log(`[custody] Creating chain in: ${dir}`);

    const chain = await CustodyChain.create(dir);
    console.log(`[custody] Key ID: ${chain.getKeyId()}`);

    // Record some events
    const events = [
      { type: "EVIDENCE_INTAKE", actor: "agent-collector", data: { source: "email", itemCount: 47 }},
      { type: "HASH_VERIFIED", actor: "rust-boundary", data: { algorithm: "sha256", matched: true }},
      { type: "CASE_ASSIGNED", actor: "owner", data: { caseId: "CASE-6183", classification: "sensitive" }},
      { type: "TRANSFER_TO_LEGAL", actor: "bridge-agent", data: { destination: "legal-hold", sealed: true }},
      { type: "CHAIN_SEALED", actor: "system", data: { reason: "end-of-session" }},
    ];

    for (const e of events) {
      const rec = await chain.record(e.type, e.actor, e.data);
      console.log(
        `  [${rec.sequenceNo}] ${rec.eventType.padEnd(22)} ` +
        `chain:${rec.chainHash.slice(0, 12)}... ` +
        `sig:${rec.signature.slice(0, 12)}...`
      );
    }

    // Verify
    console.log("\n[custody] Verifying chain...");
    const result = await CustodyChain.verify(join(dir, "custody.jsonl"));

    console.log(`  Valid:         ${result.valid}`);
    console.log(`  Records:      ${result.totalRecords}`);
    console.log(`  Verified:     ${result.verifiedRecords}`);
    console.log(`  Chain root:   ${result.chainRoot.slice(0, 16)}...`);
    console.log(`  Chain head:   ${result.chainHead.slice(0, 16)}...`);

    if (!result.valid) {
      console.log(`  BROKEN AT:    record ${result.firstBrokenAt}`);
      console.log(`  REASON:       ${result.brokenReason}`);
    }

    process.exit(result.valid ? 0 : 1);

  } else if (command === "verify") {
    const chainFile = args[1];
    if (!chainFile) {
      console.error("Usage: chain-of-custody verify <custody.jsonl>");
      process.exit(1);
    }

    const result = await CustodyChain.verify(chainFile);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);

  } else {
    console.log("GENESIS Chain of Custody");
    console.log();
    console.log("Usage:");
    console.log("  npx ts-node chain-of-custody.ts demo [output-dir]");
    console.log("  npx ts-node chain-of-custody.ts verify <custody.jsonl>");
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[FATAL] ${err}`);
    process.exit(1);
  });
}
