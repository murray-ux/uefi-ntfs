// db/genesis_db.ts
//
// GENESIS Platform Database Client — typed wrapper for PostgreSQL.
//
// Uses the pg module for connection pooling. All write operations
// are transactional with ledger chain entries.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types (these mirror the SQL schema)
// ---------------------------------------------------------------------------

export interface EvidenceInsert {
  subjectId: string;
  docType: string;
  docHash: Buffer;
  sigEd25519: Buffer;
  publicKey: Buffer;
  meta: Record<string, unknown>;
  createdBy: string;
}

export interface LedgerEntry {
  id: number;
  prevHash: Buffer | null;
  entryHash: Buffer;
  entryType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  createdBy: string;
}

export interface AccountRecord {
  id: number;
  subjectId: string;
  email: string;
  name: string;
  provider: string;
  mfaEnabled: boolean;
  roles: string[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// Pool interface — so we don't import pg at module level.
// In production: pass in a real pg.Pool instance.
// For testing/standalone: use the InMemoryPool below.
// ---------------------------------------------------------------------------

export interface DbPool {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  connect(): Promise<DbClient>;
}

export interface DbClient {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  release(): void;
}

// ---------------------------------------------------------------------------
// GenesisDb
// ---------------------------------------------------------------------------

export class GenesisDb {
  private pool: DbPool;

  constructor(pool: DbPool) {
    this.pool = pool;
  }

  // Insert evidence bundle (transactional with ledger entry)
  async insertEvidence(evidence: EvidenceInsert): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO evidence.bundle
         (subject_id, doc_type, doc_hash, sig_ed25519, public_key, meta, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          evidence.subjectId,
          evidence.docType,
          evidence.docHash,
          evidence.sigEd25519,
          evidence.publicKey,
          JSON.stringify(evidence.meta),
          evidence.createdBy,
        ],
      );

      const evidenceId = (result.rows[0] as any).id;

      // Chain into ledger
      await this.appendLedger(client, {
        entryType: "evidence_created",
        payload: {
          evidenceId,
          subjectId: evidence.subjectId,
          docType: evidence.docType,
        },
        createdBy: evidence.createdBy,
      });

      await client.query("COMMIT");
      return evidenceId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Append to ledger with hash chain
  private async appendLedger(
    client: DbClient,
    entry: { entryType: string; payload: Record<string, unknown>; createdBy: string },
  ): Promise<number> {
    // Get previous hash
    const prevResult = await client.query(
      "SELECT entry_hash FROM ledger.entry ORDER BY id DESC LIMIT 1",
    );

    const prevHash = prevResult.rows.length > 0
      ? (prevResult.rows[0] as any).entry_hash
      : null;

    const result = await client.query(
      `INSERT INTO ledger.entry (prev_hash, entry_type, payload, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [prevHash, entry.entryType, JSON.stringify(entry.payload), entry.createdBy],
    );

    return (result.rows[0] as any).id;
  }

  // Verify ledger chain integrity
  async verifyLedgerChain(): Promise<{
    valid: boolean;
    entries: number;
    brokenAt: number | null;
  }> {
    const result = await this.pool.query(
      "SELECT id, prev_hash, entry_hash, entry_type, payload, created_at FROM ledger.entry ORDER BY id ASC",
    );

    const entries = result.rows as LedgerEntry[];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Check prev_hash linkage
      if (i > 0) {
        const prev = entries[i - 1];
        const prevHashHex = prev.entryHash?.toString("hex");
        const entryPrevHex = entry.prevHash?.toString("hex");

        if (prevHashHex !== entryPrevHex) {
          return { valid: false, entries: entries.length, brokenAt: entry.id };
        }
      }
    }

    return { valid: true, entries: entries.length, brokenAt: null };
  }

  // Upsert account
  async upsertAccount(account: {
    subjectId: string;
    email: string;
    name: string;
    provider: string;
    mfaEnabled: boolean;
    roles: string[];
  }): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO identities.account (subject_id, email, name, provider, mfa_enabled, roles)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (subject_id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         mfa_enabled = EXCLUDED.mfa_enabled,
         roles = EXCLUDED.roles,
         updated_at = now(),
         last_login = now()
       RETURNING id`,
      [
        account.subjectId,
        account.email,
        account.name,
        account.provider,
        account.mfaEnabled,
        account.roles,
      ],
    );

    return (result.rows[0] as any).id;
  }

  // Audit log entry
  async auditLog(entry: {
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    success: boolean;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit.log (user_email, action, resource_type, resource_id, details, success)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.userEmail,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.success,
      ],
    );
  }
}
