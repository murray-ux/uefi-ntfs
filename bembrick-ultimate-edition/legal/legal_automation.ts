// legal/legal_automation.ts
//
// Legal Document Automation — CSV → HTML → PDF → signed evidence bundle.
//
// Designed for family court document generation workflows:
//   1. Read structured CSV rows (case number, parties, doc type, fields)
//   2. Render HTML from templates with variable substitution
//   3. Convert HTML → PDF via pluggable renderer (Puppeteer, wkhtmltopdf, etc.)
//   4. Sign the PDF with Ed25519 and store in evidence DB
//   5. Produce a manifest of all generated documents
//
// The PDF renderer is injected — this module has zero browser dependencies.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { Ed25519Signer, SignResult } from "../identity/ed25519_signer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CourtRow {
  caseNumber: string;
  partyName: string;
  docType: string;
  filingDate: string;
  fields: Record<string, string>;
}

/** Pluggable PDF renderer — anything that turns HTML into a PDF buffer. */
export interface PdfRenderer {
  render(html: string): Promise<Buffer>;
}

/** Evidence storage interface (matches GenesisDb.insertEvidence signature). */
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

export interface GeneratedDoc {
  id: string;
  caseNumber: string;
  docType: string;
  partyName: string;
  pdfPath: string;
  hash: string;
  signature: string;
  keyId: string;
  evidenceId: number;
  generatedAt: string;
}

export interface BatchResult {
  total: number;
  generated: number;
  failed: number;
  docs: GeneratedDoc[];
  errors: Array<{ row: number; error: string }>;
  startedAt: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// CSV parser — minimal, handles quoted fields
// ---------------------------------------------------------------------------

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] || "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// CSV → CourtRow mapper
// ---------------------------------------------------------------------------

export function csvToCourtRows(records: Record<string, string>[]): CourtRow[] {
  return records.map((r) => {
    const caseNumber = r.case_number || r.caseNumber || r.case_no || "";
    const partyName = r.party_name || r.partyName || r.party || "";
    const docType = r.doc_type || r.docType || r.document_type || "";
    const filingDate = r.filing_date || r.filingDate || r.date || new Date().toISOString().slice(0, 10);

    // Everything else goes into fields
    const reserved = new Set([
      "case_number", "caseNumber", "case_no",
      "party_name", "partyName", "party",
      "doc_type", "docType", "document_type",
      "filing_date", "filingDate", "date",
    ]);
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      if (!reserved.has(k)) fields[k] = v;
    }

    return { caseNumber, partyName, docType, filingDate, fields };
  });
}

// ---------------------------------------------------------------------------
// HTML template engine — simple {{variable}} substitution
// ---------------------------------------------------------------------------

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{docType}} — Case {{caseNumber}}</title>
  <style>
    body { font-family: "Times New Roman", serif; margin: 40px; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
    .header h2 { margin: 4px 0 0; font-size: 14px; font-weight: normal; }
    .meta { margin-bottom: 24px; }
    .meta table { width: 100%; border-collapse: collapse; }
    .meta td { padding: 4px 8px; border-bottom: 1px solid #ddd; }
    .meta td:first-child { font-weight: bold; width: 180px; }
    .body { margin-bottom: 32px; }
    .footer { margin-top: 48px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
    .signature-block { margin-top: 48px; }
    .signature-line { border-top: 1px solid #333; width: 300px; margin-top: 48px; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{docType}}</h1>
    <h2>Case Number: {{caseNumber}}</h2>
  </div>
  <div class="meta">
    <table>
      <tr><td>Party</td><td>{{partyName}}</td></tr>
      <tr><td>Filing Date</td><td>{{filingDate}}</td></tr>
      <tr><td>Document ID</td><td>{{documentId}}</td></tr>
      {{#extraFields}}
    </table>
  </div>
  <div class="body">
    {{#bodyContent}}
  </div>
  <div class="signature-block">
    <div class="signature-line">Authorised Signature</div>
  </div>
  <div class="footer">
    Generated by GENESIS 2.0 — Document ID: {{documentId}} — {{generatedAt}}
    <br>SHA-256: {{docHash}} | Key: {{keyId}}
  </div>
</body>
</html>`;

function renderTemplate(
  template: string,
  row: CourtRow,
  extras: Record<string, string>,
): string {
  let html = template;

  // Standard variables
  const vars: Record<string, string> = {
    caseNumber: row.caseNumber,
    partyName: row.partyName,
    docType: row.docType,
    filingDate: row.filingDate,
    ...extras,
  };

  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), escapeHtml(value));
  }

  // Extra fields table rows
  const fieldRows = Object.entries(row.fields)
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("\n      ");
  html = html.replace("{{#extraFields}}", fieldRows);

  // Body content from fields
  const bodyContent = row.fields.body || row.fields.content || row.fields.description || "";
  html = html.replace("{{#bodyContent}}", `<p>${escapeHtml(bodyContent)}</p>`);

  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// LegalAutomation
// ---------------------------------------------------------------------------

export class LegalAutomation {
  private signer: Ed25519Signer;
  private renderer: PdfRenderer;
  private store: EvidenceStore;
  private outputDir: string;
  private template: string;
  private createdBy: string;

  constructor(opts: {
    signer: Ed25519Signer;
    renderer: PdfRenderer;
    store: EvidenceStore;
    outputDir: string;
    templatePath?: string;
    createdBy?: string;
  }) {
    this.signer = opts.signer;
    this.renderer = opts.renderer;
    this.store = opts.store;
    this.outputDir = opts.outputDir;
    this.createdBy = opts.createdBy || "genesis-legal";

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    // Load custom template or use default
    if (opts.templatePath && existsSync(opts.templatePath)) {
      this.template = readFileSync(opts.templatePath, "utf-8");
    } else {
      this.template = DEFAULT_TEMPLATE;
    }
  }

  /** Generate a single document from a court row. */
  async generateOne(row: CourtRow): Promise<GeneratedDoc> {
    const docId = randomUUID();
    const generatedAt = new Date().toISOString();

    // Render HTML (hash/keyId placeholders filled after signing)
    const htmlPreSign = renderTemplate(this.template, row, {
      documentId: docId,
      generatedAt,
      docHash: "(pending)",
      keyId: this.signer.getKeyId(),
    });

    // Render PDF
    const pdfBuf = await this.renderer.render(htmlPreSign);

    // Sign the PDF bytes
    const sig = this.signer.signBytes(pdfBuf);

    // Re-render with real hash embedded (for the stored copy)
    const htmlFinal = renderTemplate(this.template, row, {
      documentId: docId,
      generatedAt,
      docHash: sig.hash.slice(0, 16) + "…",
      keyId: sig.keyId,
    });

    const pdfFinal = await this.renderer.render(htmlFinal);
    const sigFinal = this.signer.signBytes(pdfFinal);

    // Write PDF to output directory
    const pdfFilename = `${row.caseNumber}_${row.docType}_${docId.slice(0, 8)}.pdf`;
    const pdfPath = join(this.outputDir, pdfFilename);
    writeFileSync(pdfPath, pdfFinal);

    // Store in evidence DB
    const evidenceId = await this.store.insertEvidence({
      subjectId: row.caseNumber,
      docType: row.docType,
      docHash: Buffer.from(sigFinal.hash, "hex"),
      sigEd25519: Buffer.from(sigFinal.signature, "hex"),
      publicKey: Buffer.from(
        (this.signer.getPublicKey().export({ type: "spki", format: "pem" }) as string),
        "utf-8",
      ),
      meta: {
        partyName: row.partyName,
        filingDate: row.filingDate,
        documentId: docId,
        pdfFilename,
        ...row.fields,
      },
      createdBy: this.createdBy,
    });

    return {
      id: docId,
      caseNumber: row.caseNumber,
      docType: row.docType,
      partyName: row.partyName,
      pdfPath,
      hash: sigFinal.hash,
      signature: sigFinal.signature,
      keyId: sigFinal.keyId,
      evidenceId,
      generatedAt,
    };
  }

  /** Process a batch of court rows. */
  async generateBatch(rows: CourtRow[]): Promise<BatchResult> {
    const startedAt = new Date().toISOString();
    const docs: GeneratedDoc[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const doc = await this.generateOne(rows[i]);
        docs.push(doc);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: i, error: msg });
      }
    }

    const result: BatchResult = {
      total: rows.length,
      generated: docs.length,
      failed: errors.length,
      docs,
      errors,
      startedAt,
      completedAt: new Date().toISOString(),
    };

    // Write manifest
    const manifestPath = join(this.outputDir, `manifest_${Date.now()}.json`);
    writeFileSync(manifestPath, JSON.stringify(result, null, 2));

    return result;
  }

  /** Load a CSV file and process all rows. */
  async processFile(csvPath: string): Promise<BatchResult> {
    const text = readFileSync(csvPath, "utf-8");
    const records = parseCsv(text);
    const rows = csvToCourtRows(records);
    return this.generateBatch(rows);
  }
}
