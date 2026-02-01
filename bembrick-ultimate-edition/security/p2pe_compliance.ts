// security/p2pe_compliance.ts
//
// P2PE Compliance Checker — validates payment applications against the
// PCI P2PE validated applications registry and produces citation-backed
// compliance records through the chain of custody.
//
// Flow:
//   1. Load reference data (CSV) via shared parser
//   2. Accept a query (company name, application name, or reference number)
//   3. Match against registry — return validation status, expiry dates, assessor
//   4. Produce a compliance record signed and chained via CitationService
//   5. Flag applications approaching reassessment or already expired
//
// Every check result flows through the audit chain. No silent passes.
// (Axiom A3: Audit everything)
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseCsv, extractField } from "../src/util/csv";
import type { CitationService, CitationRecord } from "../src/citation/citation-service";
import { AuditService } from "../src/audit/audit-service";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface P2PEApplication {
  company: string;
  applicationName: string;
  referenceNumber: string;
  applicationVersion: string;
  standardVersion: string;
  annualRevalidationDate: string;
  reassessmentDate: string;
  assessor: string;
}

export interface ComplianceCheckResult {
  checkId: string;
  timestamp: string;
  query: string;
  matches: P2PEApplication[];
  status: "VALID" | "EXPIRING" | "EXPIRED" | "NOT_FOUND";
  expiringCount: number;
  expiredCount: number;
  validCount: number;
  citation?: CitationRecord;
}

// ---------------------------------------------------------------------------
// Parser: CSV → P2PEApplication[]
// ---------------------------------------------------------------------------

function csvToP2PEApplications(records: Record<string, string>[]): P2PEApplication[] {
  return records.map((r) => ({
    company: extractField(r, ["Company", "company"]),
    applicationName: extractField(r, ["Application Name", "application_name", "applicationName"]),
    referenceNumber: extractField(r, ["Reference Number", "reference_number", "referenceNumber"]),
    applicationVersion: extractField(r, ["Application Version", "application_version", "applicationVersion"]),
    standardVersion: extractField(r, ["P2PE Standard Version", "standard_version", "standardVersion"]),
    annualRevalidationDate: extractField(r, ["Annual Revalidation Date", "annual_revalidation_date"]),
    reassessmentDate: extractField(r, ["Reassessment Date", "reassessment_date", "reassessmentDate"]),
    assessor: extractField(r, ["P2PE Assessor(s)", "assessor", "assessors"]),
  }));
}

// ---------------------------------------------------------------------------
// Date parsing (handles "22 Aug 2025" format)
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDate(s: string): Date | null {
  if (!s || s === "--" || s === "") return null;
  const parts = s.trim().split(" ");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = MONTHS[parts[1]];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

// ---------------------------------------------------------------------------
// P2PEComplianceChecker
// ---------------------------------------------------------------------------

export class P2PEComplianceChecker {
  private registry: P2PEApplication[];
  private audit: AuditService;
  private citation: CitationService | null;

  constructor(opts: {
    registryPath: string;
    audit: AuditService;
    citation?: CitationService;
  }) {
    if (!existsSync(opts.registryPath)) {
      throw new Error(`P2PE registry not found: ${opts.registryPath}`);
    }

    const csvText = readFileSync(opts.registryPath, "utf-8");
    const records = parseCsv(csvText);
    this.registry = csvToP2PEApplications(records);
    this.audit = opts.audit;
    this.citation = opts.citation || null;
  }

  /** Total applications in registry. */
  get registrySize(): number {
    return this.registry.length;
  }

  /**
   * Check compliance for a query string.
   * Matches against company name, application name, or reference number.
   * Produces a citation-backed compliance record.
   */
  async check(
    query: string,
    createdBy: string = "system",
    warnDays: number = 90,
  ): Promise<ComplianceCheckResult> {
    const checkId = randomUUID();
    const timestamp = new Date().toISOString();
    const queryLower = query.toLowerCase();

    // Match against registry
    const matches = this.registry.filter((app) =>
      app.company.toLowerCase().includes(queryLower) ||
      app.applicationName.toLowerCase().includes(queryLower) ||
      app.referenceNumber.toLowerCase().includes(queryLower),
    );

    // Classify each match
    const now = new Date();
    const warnDate = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);
    let expiredCount = 0;
    let expiringCount = 0;
    let validCount = 0;

    for (const app of matches) {
      const reassessment = parseDate(app.reassessmentDate);
      if (!reassessment) {
        validCount++; // No date = assume valid
        continue;
      }
      if (reassessment < now) {
        expiredCount++;
      } else if (reassessment < warnDate) {
        expiringCount++;
      } else {
        validCount++;
      }
    }

    // Determine overall status
    let status: ComplianceCheckResult["status"];
    if (matches.length === 0) {
      status = "NOT_FOUND";
    } else if (expiredCount > 0) {
      status = "EXPIRED";
    } else if (expiringCount > 0) {
      status = "EXPIRING";
    } else {
      status = "VALID";
    }

    // Build result
    const result: ComplianceCheckResult = {
      checkId,
      timestamp,
      query,
      matches,
      status,
      expiringCount,
      expiredCount,
      validCount,
    };

    // Audit the check — Axiom A3: Audit everything
    this.audit.write({
      eventId: randomUUID(),
      ts: timestamp,
      eventType: "P2PE_COMPLIANCE_CHECK",
      actorId: createdBy,
      actorType: "human",
      source: `p2pe:${checkId}`,
      payload: {
        checkId,
        query,
        matchCount: matches.length,
        status,
        expiredCount,
        expiringCount,
        validCount,
      },
    });

    // Cite the result — chain it into custody ledger
    if (this.citation) {
      const resultBytes = Buffer.from(JSON.stringify(result), "utf-8");
      result.citation = await this.citation.cite({
        documentBytes: resultBytes,
        docType: "p2pe_compliance_check",
        subjectId: query,
        createdBy,
        meta: {
          checkId,
          matchCount: matches.length,
          status,
          expiredCount,
          expiringCount,
          validCount,
        },
      });
    }

    return result;
  }

  /**
   * Full registry audit — check every application for expiry status.
   * Returns a summary with citations for any findings.
   */
  async auditRegistry(
    createdBy: string = "system",
    warnDays: number = 90,
  ): Promise<{
    total: number;
    valid: number;
    expiring: number;
    expired: number;
    noDate: number;
    findings: Array<{ app: P2PEApplication; status: string; daysRemaining: number | null }>;
    citation?: CitationRecord;
  }> {
    const now = new Date();
    const warnDate = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);
    const findings: Array<{ app: P2PEApplication; status: string; daysRemaining: number | null }> = [];
    let valid = 0, expiring = 0, expired = 0, noDate = 0;

    for (const app of this.registry) {
      const reassessment = parseDate(app.reassessmentDate);
      if (!reassessment) {
        noDate++;
        continue;
      }
      const daysRemaining = Math.floor((reassessment.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (reassessment < now) {
        expired++;
        findings.push({ app, status: "EXPIRED", daysRemaining });
      } else if (reassessment < warnDate) {
        expiring++;
        findings.push({ app, status: "EXPIRING", daysRemaining });
      } else {
        valid++;
      }
    }

    const summary = {
      total: this.registry.length,
      valid,
      expiring,
      expired,
      noDate,
      findings,
    };

    // Audit
    this.audit.write({
      eventId: randomUUID(),
      ts: new Date().toISOString(),
      eventType: "P2PE_REGISTRY_AUDIT",
      actorId: createdBy,
      actorType: "human",
      source: "p2pe:registry-audit",
      payload: {
        total: summary.total,
        valid: summary.valid,
        expiring: summary.expiring,
        expired: summary.expired,
        noDate: summary.noDate,
        findingCount: findings.length,
      },
    });

    // Cite
    if (this.citation) {
      const resultBytes = Buffer.from(JSON.stringify(summary), "utf-8");
      (summary as any).citation = await this.citation.cite({
        documentBytes: resultBytes,
        docType: "p2pe_registry_audit",
        subjectId: "p2pe-full-registry",
        createdBy,
        meta: {
          total: summary.total,
          expired: summary.expired,
          expiring: summary.expiring,
        },
      });
    }

    return summary;
  }
}
