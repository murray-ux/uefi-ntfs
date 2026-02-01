// orchestration/grandmaster_orchestrator.ts
//
// Grandmaster Orchestrator — the conductor that ties every GENESIS service
// into coordinated workflows.
//
// Responsibilities:
//   - Device onboarding (FleetDM enroll → hardening → audit)
//   - Legal document batch (CSV → PDF → sign → evidence DB)
//   - Exam certificate batch (CSV → 100% gate → PDF → sign → evidence DB)
//   - Compliance report (health + ledger + audit → signed report)
//   - System health check (Quantum Shield + ledger integrity)
//
// Every workflow runs through the Wheel orchestrator for gating, attestation,
// execution, and audit sealing.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash, randomUUID } from "crypto";

import { Wheel } from "../src/wheel/wheel-orchestrator";
import { Evaluator, getDoctrine } from "../src/core/evaluator";
import { AuditService } from "../src/audit/audit-service";
import { Ed25519Signer, loadOrCreateKeys } from "../identity/ed25519_signer";
import { QuantumShieldCore } from "../security/quantum_shield_core";
import { FleetDMClient } from "../security/fleetdm_client";
import { LegalAutomation, parseCsv, csvToCourtRows } from "../legal/legal_automation";
import { CertMaster, csvToExamRows } from "../cert_master/cert_master";
import type { PdfRenderer, EvidenceStore } from "../legal/legal_automation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrandmasterConfig {
  dataDir: string;
  keyDir: string;
  outputDir: string;
  createdBy: string;
  fleetApiUrl?: string;
  fleetApiKey?: string;
  templateDir?: string;
}

export interface WorkflowResult {
  workflow: string;
  success: boolean;
  startedAt: string;
  completedAt: string;
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Stub PDF renderer (returns the HTML as a buffer — swap for Puppeteer)
// ---------------------------------------------------------------------------

class HtmlBufferRenderer implements PdfRenderer {
  async render(html: string): Promise<Buffer> {
    return Buffer.from(html, "utf-8");
  }
}

// ---------------------------------------------------------------------------
// In-memory evidence store (for standalone mode without PostgreSQL)
// ---------------------------------------------------------------------------

class InMemoryEvidenceStore implements EvidenceStore {
  private records: Array<Record<string, unknown>> = [];

  async insertEvidence(entry: {
    subjectId: string;
    docType: string;
    docHash: Buffer;
    sigEd25519: Buffer;
    publicKey: Buffer;
    meta: Record<string, unknown>;
    createdBy: string;
  }): Promise<number> {
    const id = this.records.length + 1;
    this.records.push({ id, ...entry, createdAt: new Date().toISOString() });
    return id;
  }

  getAll(): Array<Record<string, unknown>> {
    return [...this.records];
  }
}

// ---------------------------------------------------------------------------
// Grandmaster
// ---------------------------------------------------------------------------

export class Grandmaster {
  private config: GrandmasterConfig;
  private evaluator: Evaluator;
  private audit: AuditService;
  private signer: Ed25519Signer;
  private wheel: Wheel;
  private shield: QuantumShieldCore;
  private fleet: FleetDMClient | null;
  private renderer: PdfRenderer;
  private store: EvidenceStore;
  private legal: LegalAutomation;
  private cert: CertMaster;

  constructor(config: GrandmasterConfig, overrides?: {
    renderer?: PdfRenderer;
    store?: EvidenceStore;
  }) {
    this.config = config;

    // Ensure directories
    for (const dir of [config.dataDir, config.keyDir, config.outputDir]) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }

    // Core services
    const doctrine = getDoctrine();
    this.evaluator = new Evaluator(doctrine);
    this.audit = new AuditService({ logDir: join(config.dataDir, "audit") });
    const keys = loadOrCreateKeys(config.keyDir);
    this.signer = new Ed25519Signer(keys);
    this.wheel = new Wheel(this.evaluator, this.audit);

    // Shield
    this.shield = new QuantumShieldCore({
      dataDir: config.dataDir,
      evaluator: this.evaluator,
      audit: this.audit,
      thresholds: { maxDiskUsagePercent: 90, maxMemoryUsagePercent: 85, maxLoadPerCpu: 2.0 },
    });

    // FleetDM (optional)
    this.fleet = config.fleetApiUrl && config.fleetApiKey
      ? new FleetDMClient(config.fleetApiUrl, config.fleetApiKey)
      : null;

    // PDF renderer + evidence store (injectable)
    this.renderer = overrides?.renderer || new HtmlBufferRenderer();
    this.store = overrides?.store || new InMemoryEvidenceStore();

    // Legal + Cert modules
    const legalOut = join(config.outputDir, "legal");
    const certOut = join(config.outputDir, "certs");

    this.legal = new LegalAutomation({
      signer: this.signer,
      renderer: this.renderer,
      store: this.store,
      outputDir: legalOut,
      templatePath: config.templateDir ? join(config.templateDir, "legal.html") : undefined,
      createdBy: config.createdBy,
    });

    this.cert = new CertMaster({
      signer: this.signer,
      renderer: this.renderer,
      store: this.store,
      outputDir: certOut,
      createdBy: config.createdBy,
    });
  }

  // -------------------------------------------------------------------------
  // Workflow: Device onboarding
  // -------------------------------------------------------------------------

  async onboardDevice(hostname: string, ownerEmail: string): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      name: `onboard-${hostname}`,
      principalId: this.config.createdBy,
      resource: `device:${hostname}`,
      action: "device:onboard",
      deadlineMs: 60_000,
      execute: async () => {
        if (!this.fleet) {
          return { status: "skipped", reason: "FleetDM not configured" };
        }

        // Create enrollment secret
        const secret = await this.fleet.createEnrollmentSecret(hostname);

        // Enroll
        await this.fleet.enrollHost({
          hostname,
          platform: "linux",
          enrollSecret: secret,
        });

        // Assign to owner
        await this.fleet.assignHostToUser(hostname, ownerEmail);

        // Trigger initial heartbeat
        await this.fleet.triggerHeartbeat(hostname);

        return { status: "enrolled", hostname, assignedTo: ownerEmail };
      },
    });

    return {
      workflow: "onboard-device",
      success: result.phase === "SEALED",
      startedAt,
      completedAt: new Date().toISOString(),
      details: result as unknown as Record<string, unknown>,
    };
  }

  // -------------------------------------------------------------------------
  // Workflow: Legal document batch
  // -------------------------------------------------------------------------

  async runLegalBatch(csvPath: string): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      name: `legal-batch-${Date.now()}`,
      principalId: this.config.createdBy,
      resource: `legal:batch`,
      action: "legal:generate",
      deadlineMs: 300_000,
      execute: async () => {
        return await this.legal.processFile(csvPath);
      },
    });

    return {
      workflow: "legal-batch",
      success: result.phase === "SEALED",
      startedAt,
      completedAt: new Date().toISOString(),
      details: result as unknown as Record<string, unknown>,
    };
  }

  // -------------------------------------------------------------------------
  // Workflow: Exam certificate batch
  // -------------------------------------------------------------------------

  async runCertBatch(csvPath: string): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      name: `cert-batch-${Date.now()}`,
      principalId: this.config.createdBy,
      resource: `cert:batch`,
      action: "cert:generate",
      deadlineMs: 300_000,
      execute: async () => {
        return await this.cert.processFile(csvPath);
      },
    });

    return {
      workflow: "cert-batch",
      success: result.phase === "SEALED",
      startedAt,
      completedAt: new Date().toISOString(),
      details: result as unknown as Record<string, unknown>,
    };
  }

  // -------------------------------------------------------------------------
  // Workflow: System health check
  // -------------------------------------------------------------------------

  async healthCheck(): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      name: `health-check-${Date.now()}`,
      principalId: "system",
      resource: "system:health",
      action: "system:check",
      deadlineMs: 30_000,
      execute: async () => {
        const health = await this.shield.checkHealth();
        const hardening = await this.shield.verifyHardening();
        return { health, hardening };
      },
    });

    return {
      workflow: "health-check",
      success: result.phase === "SEALED",
      startedAt,
      completedAt: new Date().toISOString(),
      details: result as unknown as Record<string, unknown>,
    };
  }

  // -------------------------------------------------------------------------
  // Workflow: Compliance report
  // -------------------------------------------------------------------------

  async generateComplianceReport(): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      name: `compliance-report-${Date.now()}`,
      principalId: this.config.createdBy,
      resource: "compliance:report",
      action: "compliance:generate",
      deadlineMs: 120_000,
      execute: async () => {
        // Gather data
        const health = await this.shield.checkHealth();
        const hardening = await this.shield.verifyHardening();

        const report = {
          reportId: randomUUID(),
          generatedAt: new Date().toISOString(),
          generatedBy: this.config.createdBy,
          signerKeyId: this.signer.getKeyId(),
          systemHealth: health,
          hardeningReport: hardening,
          fleetStatus: this.fleet ? "configured" : "not_configured",
        };

        // Sign the report
        const sig = this.signer.signObject(report);

        const signedReport = { ...report, signature: sig };

        // Write to output
        const reportPath = join(
          this.config.outputDir,
          `compliance_${Date.now()}.json`,
        );
        writeFileSync(reportPath, JSON.stringify(signedReport, null, 2));

        return { reportPath, ...signedReport };
      },
    });

    return {
      workflow: "compliance-report",
      success: result.phase === "SEALED",
      startedAt,
      completedAt: new Date().toISOString(),
      details: result as unknown as Record<string, unknown>,
    };
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cmd = process.argv[2];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(`GENESIS 2.0 — Grandmaster Orchestrator

Usage: npx ts-node orchestration/grandmaster_orchestrator.ts <command> [args]

Commands:
  health-check                          Run system health check
  onboard-device <hostname> <email>     Onboard a device via FleetDM
  legal-batch <csv-path>                Generate legal documents from CSV
  cert-batch <csv-path>                 Generate exam certificates from CSV
  compliance-report                     Generate signed compliance report
`);
    return;
  }

  const config: GrandmasterConfig = {
    dataDir: process.env.GENESIS_DATA_DIR || "./data",
    keyDir: process.env.GENESIS_KEY_DIR || "./data/keys",
    outputDir: process.env.GENESIS_OUTPUT_DIR || "./data/output",
    createdBy: process.env.GENESIS_OWNER_ID || "owner",
    fleetApiUrl: process.env.FLEET_API_URL,
    fleetApiKey: process.env.FLEET_API_KEY,
    templateDir: process.env.GENESIS_TEMPLATE_DIR,
  };

  const gm = new Grandmaster(config);

  let result: WorkflowResult;

  switch (cmd) {
    case "health-check":
      result = await gm.healthCheck();
      break;
    case "onboard-device": {
      const hostname = process.argv[3];
      const email = process.argv[4];
      if (!hostname || !email) {
        console.error("Usage: onboard-device <hostname> <email>");
        process.exit(1);
      }
      result = await gm.onboardDevice(hostname, email);
      break;
    }
    case "legal-batch": {
      const csvPath = process.argv[3];
      if (!csvPath) {
        console.error("Usage: legal-batch <csv-path>");
        process.exit(1);
      }
      result = await gm.runLegalBatch(csvPath);
      break;
    }
    case "cert-batch": {
      const csvPath = process.argv[3];
      if (!csvPath) {
        console.error("Usage: cert-batch <csv-path>");
        process.exit(1);
      }
      result = await gm.runCertBatch(csvPath);
      break;
    }
    case "compliance-report":
      result = await gm.generateComplianceReport();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("[Grandmaster] Fatal:", err);
  process.exit(1);
});
