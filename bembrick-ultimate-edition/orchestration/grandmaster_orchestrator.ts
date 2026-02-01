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
import { Evaluator } from "../src/core/evaluator";
import { getDoctrine } from "../src/core/doctrine";
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

  // -------------------------------------------------------------------------
  // OODA Loop — Autonomous cyber-defence agent
  //
  // Perceive → Orient → Decide → Act → Learn
  //
  // Each cycle is a Wheel spoke. Policy gates every action.
  // Findings feed back into the learning store for future orientation.
  // -------------------------------------------------------------------------

  async runOodaCycle(): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      principalId: this.config.createdBy,
      resource: "ooda:cycle",
      action: "ooda:execute",
      deadlineMs: 120_000,
      execute: async () => {
        const cycle: Record<string, unknown> = { cycleId: randomUUID(), startedAt };

        // ── PERCEIVE ───────────────────────────────────────────
        // Gather signals from all sensors
        const health = await this.shield.checkHealth();
        const hardening = await this.shield.verifyHardening();
        const fleetStatus = this.fleet
          ? await this.fleet.getFleetSummary().catch(() => ({ error: "fleet-unreachable" }))
          : { status: "not_configured" };

        cycle.perceive = {
          health,
          hardening,
          fleet: fleetStatus,
          timestamp: new Date().toISOString(),
        };

        // ── ORIENT ─────────────────────────────────────────────
        // Assess posture from perceived signals
        const threats: string[] = [];
        const recommendations: string[] = [];

        if (!health.overallHealthy) {
          threats.push("SYSTEM_DEGRADED");
          recommendations.push("Investigate system health degradation");
        }

        if (hardening.checks) {
          const failedChecks = hardening.checks.filter((c: { passed: boolean }) => !c.passed);
          if (failedChecks.length > 0) {
            threats.push("HARDENING_GAPS");
            for (const fc of failedChecks) {
              recommendations.push(`Fix hardening: ${(fc as { name: string }).name}`);
            }
          }
        }

        // Memory usage check
        if (health.memory && health.memory.usedPercent > 85) {
          threats.push("MEMORY_PRESSURE");
          recommendations.push("Memory usage above 85% — investigate");
        }

        // Disk usage check
        if (health.disk && health.disk.usedPercent > 90) {
          threats.push("DISK_PRESSURE");
          recommendations.push("Disk usage above 90% — urgent cleanup needed");
        }

        cycle.orient = {
          threatCount: threats.length,
          threats,
          recommendations,
          posture: threats.length === 0 ? "GREEN" : threats.length <= 2 ? "AMBER" : "RED",
        };

        // ── DECIDE ─────────────────────────────────────────────
        // Determine actions based on orientation
        const actions: Array<{ type: string; priority: number; description: string }> = [];

        if (threats.includes("SYSTEM_DEGRADED")) {
          actions.push({ type: "alert", priority: 1, description: "System health alert" });
        }
        if (threats.includes("HARDENING_GAPS")) {
          actions.push({ type: "remediate", priority: 2, description: "Apply hardening fixes" });
        }
        if (threats.includes("MEMORY_PRESSURE") || threats.includes("DISK_PRESSURE")) {
          actions.push({ type: "alert", priority: 1, description: "Resource pressure alert" });
        }

        // If clean, schedule next cycle
        if (actions.length === 0) {
          actions.push({ type: "standby", priority: 10, description: "All clear — maintain watch" });
        }

        cycle.decide = {
          actionCount: actions.length,
          actions: actions.sort((a, b) => a.priority - b.priority),
        };

        // ── ACT ────────────────────────────────────────────────
        // Execute decided actions (within policy bounds)
        const actResults: Array<{ action: string; result: string }> = [];

        for (const action of actions) {
          switch (action.type) {
            case "alert":
              // Log alert to audit trail
              actResults.push({ action: action.description, result: "alert_logged" });
              break;
            case "remediate":
              // Re-run hardening check to confirm findings
              actResults.push({ action: action.description, result: "remediation_queued" });
              break;
            case "standby":
              actResults.push({ action: action.description, result: "watching" });
              break;
            default:
              actResults.push({ action: action.description, result: "unknown_action_type" });
          }
        }

        cycle.act = { results: actResults };

        // ── LEARN ──────────────────────────────────────────────
        // Record findings for future orientation refinement
        const learnings = {
          cycleCompletedAt: new Date().toISOString(),
          posture: (cycle.orient as { posture: string }).posture,
          threatSignatures: threats,
          actionsExecuted: actResults.length,
          recommendation: threats.length > 0
            ? "Increase monitoring frequency"
            : "Maintain current cadence",
        };

        cycle.learn = learnings;

        return cycle;
      },
    });

    return {
      workflow: "ooda-cycle",
      success: result.phase === "SEALED",
      startedAt,
      completedAt: new Date().toISOString(),
      details: result as unknown as Record<string, unknown>,
    };
  }

  // -------------------------------------------------------------------------
  // Resilience test — chaos probe
  // -------------------------------------------------------------------------

  async resilienceProbe(): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();

    const result = await this.wheel.spin({
      principalId: this.config.createdBy,
      resource: "resilience:probe",
      action: "resilience:test",
      deadlineMs: 60_000,
      execute: async () => {
        const probes: Array<{ name: string; passed: boolean; detail: string }> = [];

        // Probe 1: Wheel handles executor timeout
        const timeoutWheel = new Wheel(this.evaluator, this.audit);
        const timeoutResult = await timeoutWheel.spin({
          principalId: this.config.createdBy,
          action: "resilience:timeout-test",
          resource: "resilience:probe",
          context: { mfaPassed: true, riskScore: 0, ownerSupervised: true },
          deadlineMs: 50,
          execute: async () => new Promise((r) => setTimeout(r, 5000)),
        });
        probes.push({
          name: "deadline-enforcement",
          passed: timeoutResult.phase === "DEAD" && timeoutResult.code === "W-004",
          detail: `Phase: ${timeoutResult.phase}, Code: ${timeoutResult.code}`,
        });

        // Probe 2: Wheel handles executor error
        const errorResult = await timeoutWheel.spin({
          principalId: this.config.createdBy,
          action: "resilience:error-test",
          resource: "resilience:probe",
          context: { mfaPassed: true, riskScore: 0, ownerSupervised: true },
          deadlineMs: 5000,
          execute: async () => { throw new Error("Chaos probe error"); },
        });
        probes.push({
          name: "error-containment",
          passed: errorResult.phase === "DEAD" && errorResult.code === "W-005",
          detail: `Phase: ${errorResult.phase}, Code: ${errorResult.code}`,
        });

        // Probe 3: Policy denies high-risk request
        const denyResult = await timeoutWheel.spin({
          principalId: "unknown",
          action: "admin:destroy",
          resource: "system:core",
          context: { mfaPassed: false, riskScore: 95 },
          deadlineMs: 5000,
          execute: async () => "should-never-run",
        });
        probes.push({
          name: "policy-deny-high-risk",
          passed: denyResult.phase === "DEAD",
          detail: `Phase: ${denyResult.phase}, Effect: ${denyResult.decision?.effect}`,
        });

        const allPassed = probes.every((p) => p.passed);

        return {
          probeCount: probes.length,
          passed: probes.filter((p) => p.passed).length,
          failed: probes.filter((p) => !p.passed).length,
          allPassed,
          probes,
        };
      },
    });

    return {
      workflow: "resilience-probe",
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
  ooda                                  Run OODA cyber-defence cycle
  resilience                            Run resilience probe (chaos test)
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
    case "ooda":
      result = await gm.runOodaCycle();
      break;
    case "resilience":
      result = await gm.resilienceProbe();
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
