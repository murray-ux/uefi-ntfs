// cert_master/cert_master.ts
//
// Exam Certificate Generator — strict 100% pass policy.
//
// Flow:
//   1. Ingest exam results from CSV
//   2. Apply PASS_POLICY_V1: score must equal max_score (100%)
//   3. For passing candidates: render certificate HTML → PDF → sign → store
//   4. For failing candidates: log skip, no certificate generated
//   5. Produce batch manifest with pass/fail breakdown
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Ed25519Signer } from "../identity/ed25519_signer";
import { parseCsv } from "../legal/legal_automation";
import type { PdfRenderer, EvidenceStore } from "../legal/legal_automation";
import type { CitationService, CitationRecord } from "../src/citation/citation-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExamRow {
  candidateId: string;
  candidateName: string;
  examProvider: string;
  examName: string;
  score: number;
  maxScore: number;
  dateTaken: string;
}

export interface CertResult {
  candidateId: string;
  candidateName: string;
  examName: string;
  passed: boolean;
  score: number;
  maxScore: number;
  percentage: number;
  certId?: string;
  pdfPath?: string;
  hash?: string;
  signature?: string;
  evidenceId?: number;
  citation?: CitationRecord;
}

export interface CertBatchResult {
  total: number;
  passed: number;
  failed: number;
  results: CertResult[];
  startedAt: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Certificate HTML template
// ---------------------------------------------------------------------------

const CERT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Certificate — {{candidateName}}</title>
  <style>
    @page { size: landscape; margin: 0; }
    body {
      font-family: "Georgia", serif;
      margin: 0; padding: 60px 80px;
      background: #fffdf7;
      min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center;
    }
    .border {
      border: 4px double #1a3a5c;
      padding: 48px 64px;
      width: 100%; max-width: 900px;
    }
    .title { font-size: 32px; color: #1a3a5c; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #666; margin-bottom: 32px; letter-spacing: 2px; }
    .awarded { font-size: 16px; color: #444; margin-bottom: 8px; }
    .name { font-size: 36px; color: #1a3a5c; font-style: italic; margin-bottom: 24px; }
    .exam { font-size: 18px; color: #333; margin-bottom: 4px; }
    .provider { font-size: 14px; color: #666; margin-bottom: 4px; }
    .date { font-size: 14px; color: #666; margin-bottom: 32px; }
    .score { font-size: 20px; color: #1a6b1a; font-weight: bold; margin-bottom: 32px; }
    .seal { margin-top: 24px; font-size: 11px; color: #999; }
    .cert-id { font-family: monospace; font-size: 10px; color: #aaa; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="border">
    <div class="title">Certificate of Achievement</div>
    <div class="subtitle">GENESIS Certification Authority</div>
    <div class="awarded">This certifies that</div>
    <div class="name">{{candidateName}}</div>
    <div class="exam">{{examName}}</div>
    <div class="provider">{{examProvider}}</div>
    <div class="score">Score: {{score}} / {{maxScore}} — 100% PASS</div>
    <div class="date">Date: {{dateTaken}}</div>
    <div class="seal">
      Digitally signed by GENESIS 2.0 — Ed25519 Key: {{keyId}}
      <br>SHA-256: {{docHash}}
    </div>
    <div class="cert-id">Certificate ID: {{certId}}</div>
  </div>
</body>
</html>`;

function renderCertHtml(row: ExamRow, extras: Record<string, string>): string {
  let html = CERT_TEMPLATE;
  const vars: Record<string, string> = {
    candidateName: row.candidateName,
    examName: row.examName,
    examProvider: row.examProvider,
    score: String(row.score),
    maxScore: String(row.maxScore),
    dateTaken: row.dateTaken,
    ...extras,
  };
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return html;
}

// ---------------------------------------------------------------------------
// CSV → ExamRow mapper
// ---------------------------------------------------------------------------

export function csvToExamRows(records: Record<string, string>[]): ExamRow[] {
  return records.map((r) => ({
    candidateId: r.candidate_id || r.candidateId || r.id || randomUUID(),
    candidateName: r.candidate_name || r.candidateName || r.name || "",
    examProvider: r.exam_provider || r.examProvider || r.provider || "",
    examName: r.exam_name || r.examName || r.exam || "",
    score: parseFloat(r.score || "0"),
    maxScore: parseFloat(r.max_score || r.maxScore || "100"),
    dateTaken: r.date_taken || r.dateTaken || r.date || new Date().toISOString().slice(0, 10),
  }));
}

// ---------------------------------------------------------------------------
// CertMaster
// ---------------------------------------------------------------------------

export class CertMaster {
  private signer: Ed25519Signer;
  private renderer: PdfRenderer;
  private store: EvidenceStore;
  private outputDir: string;
  private createdBy: string;
  private citationService: CitationService | null;

  /** Strict policy: only 100% pass rate generates a certificate. */
  static readonly PASS_POLICY = "PASS_POLICY_V1";
  static readonly PASS_THRESHOLD = 100;

  constructor(opts: {
    signer: Ed25519Signer;
    renderer: PdfRenderer;
    store: EvidenceStore;
    outputDir: string;
    createdBy?: string;
    citation?: CitationService;
  }) {
    this.signer = opts.signer;
    this.renderer = opts.renderer;
    this.store = opts.store;
    this.outputDir = opts.outputDir;
    this.createdBy = opts.createdBy || "genesis-cert-master";
    this.citationService = opts.citation || null;

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /** Check if a candidate passes under PASS_POLICY_V1. */
  private passes(row: ExamRow): boolean {
    if (row.maxScore <= 0) return false;
    const pct = (row.score / row.maxScore) * 100;
    return pct === CertMaster.PASS_THRESHOLD;
  }

  /** Generate a certificate for a single passing candidate. */
  private async generateOne(row: ExamRow): Promise<CertResult> {
    const pct = row.maxScore > 0 ? (row.score / row.maxScore) * 100 : 0;

    if (!this.passes(row)) {
      return {
        candidateId: row.candidateId,
        candidateName: row.candidateName,
        examName: row.examName,
        passed: false,
        score: row.score,
        maxScore: row.maxScore,
        percentage: pct,
      };
    }

    const certId = randomUUID();

    // Render and sign
    const html = renderCertHtml(row, {
      certId,
      keyId: this.signer.getKeyId(),
      docHash: "(pending)",
    });
    const pdfBuf = await this.renderer.render(html);
    const sig = this.signer.signBytes(pdfBuf);

    // Re-render with real hash
    const htmlFinal = renderCertHtml(row, {
      certId,
      keyId: sig.keyId,
      docHash: sig.hash.slice(0, 16) + "…",
    });
    const pdfFinal = await this.renderer.render(htmlFinal);
    const sigFinal = this.signer.signBytes(pdfFinal);

    // Write PDF
    const pdfFilename = `cert_${row.candidateId}_${certId.slice(0, 8)}.pdf`;
    const pdfPath = join(this.outputDir, pdfFilename);
    writeFileSync(pdfPath, pdfFinal);

    // Store evidence
    const evidenceId = await this.store.insertEvidence({
      subjectId: row.candidateId,
      docType: "exam_certificate",
      docHash: Buffer.from(sigFinal.hash, "hex"),
      sigEd25519: Buffer.from(sigFinal.signature, "hex"),
      publicKey: Buffer.from(
        (this.signer.getPublicKey().export({ type: "spki", format: "pem" }) as string),
        "utf-8",
      ),
      meta: {
        certId,
        candidateName: row.candidateName,
        examProvider: row.examProvider,
        examName: row.examName,
        score: row.score,
        maxScore: row.maxScore,
        dateTaken: row.dateTaken,
        policy: CertMaster.PASS_POLICY,
      },
      createdBy: this.createdBy,
    });

    // Issue citation if citation service is wired
    let citation: CitationRecord | undefined;
    if (this.citationService) {
      citation = await this.citationService.cite({
        documentBytes: pdfFinal,
        docType: "exam_certificate",
        subjectId: row.candidateId,
        createdBy: this.createdBy,
        meta: {
          certId,
          candidateName: row.candidateName,
          examProvider: row.examProvider,
          examName: row.examName,
          score: row.score,
          maxScore: row.maxScore,
          dateTaken: row.dateTaken,
          evidenceId,
          policy: CertMaster.PASS_POLICY,
        },
      });
    }

    return {
      candidateId: row.candidateId,
      candidateName: row.candidateName,
      examName: row.examName,
      passed: true,
      score: row.score,
      maxScore: row.maxScore,
      percentage: pct,
      certId,
      pdfPath,
      hash: sigFinal.hash,
      signature: sigFinal.signature,
      evidenceId,
      citation,
    };
  }

  /** Process a batch of exam rows. */
  async generateBatch(rows: ExamRow[]): Promise<CertBatchResult> {
    const startedAt = new Date().toISOString();
    const results: CertResult[] = [];

    for (const row of rows) {
      results.push(await this.generateOne(row));
    }

    const result: CertBatchResult = {
      total: rows.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      results,
      startedAt,
      completedAt: new Date().toISOString(),
    };

    // Write manifest
    const manifestPath = join(this.outputDir, `cert_manifest_${Date.now()}.json`);
    writeFileSync(manifestPath, JSON.stringify(result, null, 2));

    return result;
  }

  /** Load a CSV file and process all rows. */
  async processFile(csvPath: string): Promise<CertBatchResult> {
    const text = readFileSync(csvPath, "utf-8");
    const records = parseCsv(text);
    const rows = csvToExamRows(records);
    return this.generateBatch(rows);
  }
}
