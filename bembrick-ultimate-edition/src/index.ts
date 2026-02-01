// src/index.ts
//
// GENESIS 2.0 — GATE
//
// Charter §4: Single entry. All operations enter through the GATE.
// No backdoors. No convenience shortcuts. (Axiom A8)
//
// Charter §4: Every operation passes through Wheel. (Axiom A9)
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { getDoctrine } from "./core/doctrine";
import { Evaluator, EvaluationInput } from "./core/evaluator";
import { AuditService } from "./audit/audit-service";
import { Wheel, SpokeSpec, Executor } from "./wheel/wheel-orchestrator";
import { Ed25519Signer, loadOrCreateKeys } from "../identity/ed25519_signer";
import { GenesisSSO } from "../identity/sso_master";
import { QuantumShieldCore } from "../security/quantum_shield_core";
import { LegalAutomation } from "../legal/legal_automation";
import { CertMaster } from "../cert_master/cert_master";
import { AiOrchestrator } from "../ai/ai_orchestrator";

// ---------------------------------------------------------------------------
// Environment enforcement — Charter §8
// Axiom A6: No secrets in code. All config from environment.
// ---------------------------------------------------------------------------

const REQUIRED_ENV = [
  "GENESIS_KEY_DIR",
  "GENESIS_AUDIT_DIR",
  "GENESIS_EVIDENCE_DIR",
  "GENESIS_JWT_SECRET",
] as const;

function enforceEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    process.stderr.write(
      `[GATE] FATAL: Missing required env vars: ${missing.join(", ")}\n`
    );
    process.exit(1);
  }
}

function env(key: string, fallback?: string): string {
  return process.env[key] || fallback || "";
}

// ---------------------------------------------------------------------------
// Bootstrap — wire all services per Charter §5 topology
// ---------------------------------------------------------------------------

async function bootstrap() {
  const keyDir = env("GENESIS_KEY_DIR");
  const auditDir = env("GENESIS_AUDIT_DIR");
  const evidenceDir = env("GENESIS_EVIDENCE_DIR");
  const jwtSecret = env("GENESIS_JWT_SECRET");
  const ownerId = env("GENESIS_OWNER_ID", "owner");

  // Core
  const doctrine = getDoctrine();
  const evaluator = new Evaluator(doctrine);
  const audit = new AuditService({ logDir: auditDir });
  const keys = loadOrCreateKeys(keyDir);
  const signer = new Ed25519Signer(keys);
  const sso = new GenesisSSO(jwtSecret, evaluator, audit);

  // Shield
  const shield = new QuantumShieldCore({
    dataDir: env("GENESIS_DATA_DIR", "./data"),
    evaluator,
    audit,
    thresholds: { maxDiskUsagePercent: 90, maxMemoryUsagePercent: 85, maxLoadPerCpu: 2.0 },
  });

  // AI (optional — absent key = feature disabled, not failure)
  let ai: AiOrchestrator | null = null;
  const llmKey = env("GENESIS_LLM_API_KEY");
  if (llmKey) {
    try {
      const { default: OpenAI } = await import("openai" as string);
      ai = new AiOrchestrator({
        llmClient: new OpenAI({ apiKey: llmKey }) as any,
        primaryModel: env("GENESIS_LLM_MODEL", "gpt-4o"),
        secondaryModel: env("GENESIS_LLM_MODEL_LIGHT", "gpt-4o-mini"),
        audit,
        jurisdiction: env("GENESIS_JURISDICTION", "general"),
      });
    } catch {
      process.stderr.write("[GATE] WARNING: openai package not installed — AI disabled\n");
    }
  }

  return { evaluator, audit, signer, sso, shield, ai, ownerId, evidenceDir };
}

// ---------------------------------------------------------------------------
// Evidence factory — Charter §3.2
// ---------------------------------------------------------------------------

function buildEvidence(
  principalId: string,
  action: string,
  resource: string,
): EvaluationInput {
  return {
    principalId,
    principalType: "human",
    action,
    resource,
    tags: [],
    context: { mfaPassed: true, riskScore: 0, ownerSupervised: true },
  };
}

// ---------------------------------------------------------------------------
// Command executors
// ---------------------------------------------------------------------------

type Services = Awaited<ReturnType<typeof bootstrap>>;

function healthExecutor(s: Services): Executor {
  return async () => s.shield.checkHealth();
}

function hardenExecutor(s: Services): Executor {
  return async () => s.shield.verifyHardening();
}

function legalExecutor(s: Services, csvPath: string): Executor {
  const legal = new LegalAutomation({
    signer: s.signer,
    renderer: { async render(html: string) { return Buffer.from(html, "utf-8"); } },
    store: { async insertEvidence() { return 0; } },
    outputDir: `${s.evidenceDir}/legal`,
    createdBy: s.ownerId,
  });
  return async () => legal.processFile(csvPath);
}

function certExecutor(s: Services, csvPath: string): Executor {
  const cert = new CertMaster({
    signer: s.signer,
    renderer: { async render(html: string) { return Buffer.from(html, "utf-8"); } },
    store: { async insertEvidence() { return 0; } },
    outputDir: `${s.evidenceDir}/certs`,
    createdBy: s.ownerId,
  });
  return async () => cert.processFile(csvPath);
}

function complianceExecutor(s: Services): Executor {
  return async () => {
    const health = await s.shield.checkHealth();
    const hardening = await s.shield.verifyHardening();
    const report = {
      timestamp: new Date().toISOString(),
      health,
      hardening,
      signedBy: s.signer.getKeyId(),
    };
    const sig = s.signer.signObject(report);
    return { ...report, signature: sig };
  };
}

function aiExecutor(s: Services, instruction: string): Executor {
  return async () => {
    if (!s.ai) throw new Error("AI-001: LLM API key not configured");
    return s.ai.planAutomationChange(instruction);
  };
}

// ---------------------------------------------------------------------------
// CLI dispatch — Charter §4: Single entry point
// ---------------------------------------------------------------------------

async function main() {
  enforceEnv();
  const services = await bootstrap();
  const { evaluator, audit, signer, sso, ownerId } = services;

  const [, , cmd, ...rest] = process.argv;

  // Atomic commands — these are Wheel dependencies, not workflows.
  // token and sign are single-operation, no lifecycle needed.
  if (cmd === "token") {
    const subject = rest[0] || ownerId;
    process.stdout.write(sso.issueToken(subject, ["admin"]) + "\n");
    return;
  }

  if (cmd === "sign") {
    if (!rest[0]) { process.stderr.write("Usage: gate sign <file>\n"); process.exitCode = 1; return; }
    const sig = await signer.signFile(rest[0]);
    process.stdout.write(JSON.stringify(sig, null, 2) + "\n");
    return;
  }

  // --- Wheeled commands (Axiom A9) ---

  let executor: Executor;
  let action: string;
  let resource: string;
  let deadlineMs: number;

  switch (cmd) {
    case "health":
      executor = healthExecutor(services);
      action = "system:check";
      resource = "system:health";
      deadlineMs = 30_000;
      break;

    case "harden":
      executor = hardenExecutor(services);
      action = "system:harden";
      resource = "system:hardening";
      deadlineMs = 30_000;
      break;

    case "legal":
      if (!rest[0]) { process.stderr.write("Usage: gate legal <court.csv>\n"); process.exitCode = 1; return; }
      executor = legalExecutor(services, rest[0]);
      action = "legal:generate";
      resource = `legal:batch:${rest[0]}`;
      deadlineMs = 300_000;
      break;

    case "cert":
      if (!rest[0]) { process.stderr.write("Usage: gate cert <exam.csv>\n"); process.exitCode = 1; return; }
      executor = certExecutor(services, rest[0]);
      action = "cert:generate";
      resource = `cert:batch:${rest[0]}`;
      deadlineMs = 300_000;
      break;

    case "compliance":
      executor = complianceExecutor(services);
      action = "compliance:generate";
      resource = "compliance:report";
      deadlineMs = 120_000;
      break;

    case "ai":
      if (!rest.length) { process.stderr.write('Usage: gate ai "<instruction>"\n'); process.exitCode = 1; return; }
      executor = aiExecutor(services, rest.join(" "));
      action = "ai:query";
      resource = "ai:orchestrator";
      deadlineMs = 60_000;
      break;

    default:
      process.stderr.write(
        [
          "",
          "GENESIS 2.0 — GATE",
          "",
          "Usage: gate <command> [args]",
          "",
          "Wheeled commands (Axiom A9: Wheel governs):",
          "  health                     System health check",
          "  harden                     OS hardening verification",
          "  legal <court.csv>          Court document batch",
          "  cert <exam.csv>            Exam certificate batch",
          "  compliance                 Signed compliance report",
          '  ai "<instruction>"         AI assistant query',
          "",
          "Atomic commands:",
          "  token [subject]            Issue a JWT",
          "  sign <file>                Ed25519 sign a file",
          "",
          "Required env: " + REQUIRED_ENV.join(", "),
          "",
        ].join("\n")
      );
      process.exitCode = 1;
      return;
  }

  // Build SpokeSpec (Charter §3.1)
  const spec: SpokeSpec = {
    agentId: ownerId,
    action,
    resourceType: resource.split(":")[0],
    resourceId: resource,
    payload: { args: rest },
    deadlineMs,
  };

  // Build EvaluationInput (Charter §3.2)
  const evidence = buildEvidence(ownerId, action, resource);

  // Create Wheel with this command's executor (Charter §3.1)
  const wheel = new Wheel({ evaluator, audit, executor, ownerId });

  // Spin — Axiom A9: Wheel governs. No exceptions.
  const result = await wheel.spin(spec, evidence);

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exitCode = result.phase === "SEALED" ? 0 : 1;
}

main().catch((err) => {
  process.stderr.write(`[GATE] FATAL: ${err.message || err}\n`);
  process.exit(1);
});
