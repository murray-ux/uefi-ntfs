// src/citation/citation-service.ts
//
// CITATION SERVICE — Security-Assured Citation Records
//
// The missing link between evidence storage, chain of custody, and
// independent verification. A Citation is a self-contained proof bundle:
//
//   "This document was created at T, signed with key K, chained at
//    position N in the custody ledger, and here is exactly how a third
//    party can verify every claim independently."
//
// Flow:
//   1. Document bytes arrive (PDF, JSON, whatever)
//   2. CitationService signs them (Ed25519)
//   3. Records the event in chain-of-custody (append-only, signed JSONL)
//   4. Stores the evidence bundle (pluggable store: PostgreSQL / in-memory)
//   5. Generates human-readable verification instructions
//   6. Returns a frozen CitationRecord — the complete proof bundle
//
// Charter §6.3: Ed25519 signatures on all evidence.
// Charter §6.4: Ledger integrity via hash chaining.
// Axiom A3: Audit everything. Axiom A4: Sign everything. Axiom A5: Chain everything.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, randomUUID } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { Ed25519Signer, SignResult } from "../../identity/ed25519_signer";
import { CustodyChain } from "../audit/chain-of-custody";
import { AuditService } from "../audit/audit-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What the caller provides. */
export interface CitationInput {
  /** Raw document bytes (PDF, JSON, plaintext — anything). */
  documentBytes: Buffer;
  /** Human-readable document type: "court_filing", "exam_certificate", etc. */
  docType: string;
  /** Who or what this document is about. */
  subjectId: string;
  /** Who is creating this citation. */
  createdBy: string;
  /** Arbitrary metadata to attach. */
  meta?: Record<string, unknown>;
}

/** Pluggable evidence store — matches EvidenceStore from legal_automation. */
export interface EvidenceStore {
  insertEvidence(entry: {
    subjectId: string;
    docType: string;
    docHash: Buffer;
    sigEd25519: Buffer;
    publicKey: Buffer;
    meta: Record<string, unknown>;
    createdBy: string;
  }): Promise<number>;
}

/** The complete, frozen citation record. */
export interface CitationRecord {
  /** Unique citation ID. */
  citationId: string;
  /** SHA-256 hex of the original document bytes. */
  documentHash: string;
  /** Ed25519 signature hex. */
  signature: string;
  /** Truncated SHA-256 of the signing public key. */
  keyId: string;
  /** ISO 8601 timestamp of signing. */
  signedAt: string;
  /** Document type label. */
  docType: string;
  /** Subject identifier. */
  subjectId: string;
  /** Evidence store row ID (null if no store configured). */
  evidenceId: number | null;
  /** Chain-of-custody sequence number for this event. */
  custodySequence: number;
  /** Chain hash at time of recording. */
  custodyChainHash: string;
  /** Attached metadata. */
  meta: Record<string, unknown>;
  /** Human-readable verification instructions. */
  verificationInstructions: string[];
}

// ---------------------------------------------------------------------------
// Citation Service
// ---------------------------------------------------------------------------

export interface CitationServiceConfig {
  signer: Ed25519Signer;
  custody: CustodyChain;
  audit: AuditService;
  store?: EvidenceStore;
  outputDir?: string;
}

export class CitationService {
  private signer: Ed25519Signer;
  private custody: CustodyChain;
  private audit: AuditService;
  private store: EvidenceStore | null;
  private outputDir: string | null;

  constructor(config: CitationServiceConfig) {
    this.signer = config.signer;
    this.custody = config.custody;
    this.audit = config.audit;
    this.store = config.store || null;
    this.outputDir = config.outputDir || null;

    if (this.outputDir && !existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // -----------------------------------------------------------------------
  // Core: cite()
  // -----------------------------------------------------------------------

  /**
   * Create a security-assured citation for a document.
   *
   * Atomic sequence:
   *   1. Hash the document (SHA-256)
   *   2. Sign the document (Ed25519)
   *   3. Record in chain of custody (append-only JSONL, signed)
   *   4. Store evidence bundle (if store configured)
   *   5. Build verification instructions
   *   6. Write citation receipt to disk (if outputDir configured)
   *   7. Audit the citation event
   *   8. Return frozen CitationRecord
   *
   * If any step after signing fails, the citation is still returned
   * with partial data — the signature is the source of truth.
   * Failures are logged, not swallowed.
   */
  async cite(input: CitationInput): Promise<CitationRecord> {
    const citationId = randomUUID();

    // Step 1+2: Sign (includes SHA-256 hash)
    const sig: SignResult = this.signer.signBytes(input.documentBytes);

    // Step 3: Chain of custody
    let custodySequence = -1;
    let custodyChainHash = "";
    try {
      const custodyPayload = {
        citationId,
        documentHash: sig.hash,
        docType: input.docType,
        subjectId: input.subjectId,
        keyId: sig.keyId,
        signature: sig.signature.slice(0, 32) + "...", // Abbreviated in custody log
      };
      const record = await this.custody.record(
        "CITATION_CREATED",
        input.createdBy,
        custodyPayload,
      );
      custodySequence = record.sequenceNo;
      custodyChainHash = record.chainHash;
    } catch (err) {
      // Custody failure is serious but doesn't void the signature.
      // Log and continue — the citation is still valid, just unchained.
      this.audit.write({
        eventId: randomUUID(),
        ts: new Date().toISOString(),
        eventType: "CITATION_CUSTODY_FAILURE",
        actorId: input.createdBy,
        actorType: "human",
        source: `citation:${citationId}`,
        payload: { error: String(err), citationId },
      });
    }

    // Step 4: Evidence store
    let evidenceId: number | null = null;
    if (this.store) {
      try {
        const pubPem = this.signer.getPublicKey().export({
          type: "spki",
          format: "pem",
        }) as string;

        evidenceId = await this.store.insertEvidence({
          subjectId: input.subjectId,
          docType: input.docType,
          docHash: Buffer.from(sig.hash, "hex"),
          sigEd25519: Buffer.from(sig.signature, "hex"),
          publicKey: Buffer.from(pubPem, "utf-8"),
          meta: {
            citationId,
            custodySequence,
            custodyChainHash,
            ...input.meta,
          },
          createdBy: input.createdBy,
        });
      } catch (err) {
        this.audit.write({
          eventId: randomUUID(),
          ts: new Date().toISOString(),
          eventType: "CITATION_STORE_FAILURE",
          actorId: input.createdBy,
          actorType: "human",
          source: `citation:${citationId}`,
          payload: { error: String(err), citationId },
        });
      }
    }

    // Step 5: Verification instructions
    const instructions = buildVerificationInstructions({
      citationId,
      documentHash: sig.hash,
      signature: sig.signature,
      keyId: sig.keyId,
      signedAt: sig.signedAt,
      docType: input.docType,
      subjectId: input.subjectId,
      custodySequence,
      custodyChainHash,
      evidenceId,
    });

    // Step 6: Build the record
    const citation: CitationRecord = Object.freeze({
      citationId,
      documentHash: sig.hash,
      signature: sig.signature,
      keyId: sig.keyId,
      signedAt: sig.signedAt,
      docType: input.docType,
      subjectId: input.subjectId,
      evidenceId,
      custodySequence,
      custodyChainHash,
      meta: input.meta || {},
      verificationInstructions: instructions,
    });

    // Step 7: Write receipt to disk
    if (this.outputDir) {
      const receiptPath = join(
        this.outputDir,
        `citation_${citationId}.json`,
      );
      writeFileSync(receiptPath, JSON.stringify(citation, null, 2));
    }

    // Step 8: Audit
    this.audit.write({
      eventId: randomUUID(),
      ts: new Date().toISOString(),
      eventType: "CITATION_ISSUED",
      actorId: input.createdBy,
      actorType: "human",
      source: `citation:${citationId}`,
      payload: {
        citationId,
        documentHash: sig.hash,
        keyId: sig.keyId,
        docType: input.docType,
        subjectId: input.subjectId,
        evidenceId,
        custodySequence,
      },
    });

    return citation;
  }

  // -----------------------------------------------------------------------
  // Verify: independent verification of a citation against document bytes
  // -----------------------------------------------------------------------

  /**
   * Verify a citation record against the original document bytes.
   *
   * Checks:
   *   1. Document hash matches citation's documentHash
   *   2. Ed25519 signature is valid for the document bytes
   *   3. Chain of custody is intact (optional — requires custody file access)
   */
  verifyCitation(
    documentBytes: Buffer,
    citation: CitationRecord,
  ): CitationVerification {
    const checks: VerificationCheck[] = [];

    // Check 1: Hash match
    const recomputedHash = createHash("sha256")
      .update(documentBytes)
      .digest("hex");
    checks.push({
      name: "HASH_MATCH",
      passed: recomputedHash === citation.documentHash,
      expected: citation.documentHash,
      actual: recomputedHash,
    });

    // Check 2: Signature verification
    const sigValid = Ed25519Signer.verify(
      documentBytes,
      citation.signature,
      this.signer.getPublicKey(),
    );
    checks.push({
      name: "SIGNATURE_VALID",
      passed: sigValid.valid,
      expected: "valid",
      actual: sigValid.valid ? "valid" : "invalid",
    });

    // Check 3: Key ID match
    checks.push({
      name: "KEY_ID_MATCH",
      passed: sigValid.keyId === citation.keyId,
      expected: citation.keyId,
      actual: sigValid.keyId,
    });

    const allPassed = checks.every((c) => c.passed);

    return {
      citationId: citation.citationId,
      valid: allPassed,
      checks,
      verifiedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Verification result types
// ---------------------------------------------------------------------------

export interface VerificationCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface CitationVerification {
  citationId: string;
  valid: boolean;
  checks: VerificationCheck[];
  verifiedAt: string;
}

// ---------------------------------------------------------------------------
// Verification instructions builder
// ---------------------------------------------------------------------------

function buildVerificationInstructions(params: {
  citationId: string;
  documentHash: string;
  signature: string;
  keyId: string;
  signedAt: string;
  docType: string;
  subjectId: string;
  custodySequence: number;
  custodyChainHash: string;
  evidenceId: number | null;
}): string[] {
  return [
    `CITATION VERIFICATION INSTRUCTIONS`,
    `===================================`,
    `Citation ID: ${params.citationId}`,
    `Document Type: ${params.docType}`,
    `Subject: ${params.subjectId}`,
    `Signed At: ${params.signedAt}`,
    ``,
    `STEP 1 — VERIFY DOCUMENT INTEGRITY`,
    `  Compute SHA-256 of the original document bytes.`,
    `  Expected hash: ${params.documentHash}`,
    `  Command: sha256sum <document_file>`,
    `  The output must match the hash above exactly.`,
    ``,
    `STEP 2 — VERIFY DIGITAL SIGNATURE`,
    `  Algorithm: Ed25519 (RFC 8032)`,
    `  Signing Key ID: ${params.keyId}`,
    `  Signature (hex): ${params.signature}`,
    `  Obtain the signer's public key (PEM format, SPKI encoding).`,
    `  Verify using OpenSSL:`,
    `    openssl pkey -pubin -in public.pem -outform DER -out pub.der`,
    `    # Use an Ed25519-capable tool to verify signature against document bytes.`,
    `  Or using Node.js:`,
    `    const { verify } = require('crypto');`,
    `    const pubKey = require('crypto').createPublicKey(fs.readFileSync('public.pem'));`,
    `    const sig = Buffer.from('${params.signature}', 'hex');`,
    `    const valid = verify(null, documentBytes, pubKey, sig);`,
    `    // valid must be true`,
    ``,
    `STEP 3 — VERIFY CHAIN OF CUSTODY`,
    `  This citation was recorded at custody chain sequence #${params.custodySequence}.`,
    `  Chain hash at recording: ${params.custodyChainHash || "N/A"}`,
    `  Obtain the custody ledger file (custody.jsonl).`,
    `  Walk every record from GENESIS to the present:`,
    `    - Recompute each record's contentHash from its fields.`,
    `    - Verify each record's chainHash = SHA-256(contentHash + prevHash).`,
    `    - Verify each record's Ed25519 signature over chainHash.`,
    `    - Confirm record #${params.custodySequence} references citation ${params.citationId}.`,
    `  Any break in the chain invalidates all records from that point forward.`,
    ``,
    ...(params.evidenceId !== null
      ? [
          `STEP 4 — VERIFY EVIDENCE STORE`,
          `  Evidence row ID: ${params.evidenceId}`,
          `  Query the evidence.bundle table for this ID.`,
          `  Confirm doc_hash, sig_ed25519, and public_key match the values above.`,
          `  Confirm the corresponding ledger.entry links this evidence via hash chain.`,
          ``,
        ]
      : []),
    `LEGAL NOTICE`,
    `  This citation is generated by an automated system.`,
    `  The Ed25519 signature proves: (a) the document has not been altered`,
    `  since signing, and (b) only the holder of the corresponding private`,
    `  key could have produced the signature.`,
    `  The chain of custody proves: the signing event was recorded in an`,
    `  append-only, tamper-evident ledger at the stated time and sequence.`,
  ];
}
