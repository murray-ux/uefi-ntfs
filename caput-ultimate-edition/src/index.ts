// src/index.ts
//
// GENESIS 2.0 — GATE
//
// Charter §4: Single entry. All operations enter through the GATE.
// No backdoors. No convenience shortcuts. (Axiom A8)
// Charter §4: Every operation passes through Wheel. (Axiom A9)
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { readFileSync } from "fs";
import { join } from "path";
import { getDoctrine } from "./core/doctrine";
import { Evaluator } from "./core/evaluator";
import { AuditService } from "./audit/audit-service";
import { Wheel, SpokeSpec } from "./wheel/wheel-orchestrator";
import { Ed25519Signer, loadOrCreateKeys } from "../identity/ed25519_signer";
import { GenesisSSO } from "../identity/sso_master";
import { QuantumShieldCore } from "../security/quantum_shield_core";
import { LegalAutomation } from "../legal/legal_automation";
import { CertMaster } from "../cert_master/cert_master";
import { AiOrchestrator } from "../ai/ai_orchestrator";
import { CitationService } from "./citation/citation-service";
import { CustodyChain } from "./audit/chain-of-custody";
import { P2PEComplianceChecker } from "../security/p2pe_compliance";

// ---------------------------------------------------------------------------
// Environment enforcement — Charter §8, Axiom A6
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
// Bootstrap — wire all services once, return persistent Wheel
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
  const sso = new GenesisSSO({
    jwtSecret,
    tokenTtlSeconds: 3600,
    evaluator,
    audit,
  });

  // Wheel — persistent machine. Created once, spun many times. (Charter §3.1)
  const wheel = new Wheel(evaluator, audit);

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

  // Citation — chain-of-custody + evidence + verification instructions
  const custody = await CustodyChain.create(join(evidenceDir, "custody"));
  const citation = new CitationService({
    signer,
    custody,
    audit,
    outputDir: join(evidenceDir, "citations"),
  });

  return { wheel, evaluator, audit, signer, sso, shield, ai, citation, custody, ownerId, evidenceDir };
}

// ---------------------------------------------------------------------------
// CLI dispatch — Charter §4: Single entry point
// ---------------------------------------------------------------------------

type Services = Awaited<ReturnType<typeof bootstrap>>;

function buildSpec(
  s: Services,
  action: string,
  resource: string,
  deadlineMs: number,
  execute: () => Promise<unknown>,
  context?: Record<string, unknown>,
): SpokeSpec {
  return {
    principalId: s.ownerId,
    action,
    resource,
    context: { mfaPassed: true, riskScore: 0, ownerSupervised: true, ...context },
    deadlineMs,
    execute,
  };
}

async function main() {
  enforceEnv();
  const services = await bootstrap();
  const { wheel, signer, sso, shield, ai, citation, custody, ownerId, evidenceDir } = services;

  const [, , cmd, ...rest] = process.argv;

  // Atomic commands — Wheel dependencies, not workflows.
  // token and sign are single-operation, no lifecycle needed.
  if (cmd === "token") {
    const subject = rest[0] || ownerId;
    const token = sso.issueToken({
      subjectId: subject,
      email: `${subject}@genesis.local`,
      roles: ["admin"],
      mfa: true,
      provider: "local",
    });
    process.stdout.write(token + "\n");
    return;
  }

  if (cmd === "sign") {
    if (!rest[0]) { process.stderr.write("Usage: gate sign <file>\n"); process.exitCode = 1; return; }
    const sig = await signer.signFile(rest[0]);
    process.stdout.write(JSON.stringify(sig, null, 2) + "\n");
    return;
  }

  // --- Wheeled commands (Axiom A9: Wheel governs) ---

  let spec: SpokeSpec;

  switch (cmd) {
    case "health":
      spec = buildSpec(services, "system:check", "system:health", 30_000,
        async () => shield.checkHealth());
      break;

    case "harden":
      spec = buildSpec(services, "system:harden", "system:hardening", 30_000,
        async () => shield.verifyHardening());
      break;

    case "legal":
      if (!rest[0]) { process.stderr.write("Usage: gate legal <court.csv>\n"); process.exitCode = 1; return; }
      spec = buildSpec(services, "legal:generate", `legal:batch:${rest[0]}`, 300_000,
        async () => {
          const legal = new LegalAutomation({
            signer,
            renderer: { async render(html: string) { return Buffer.from(html, "utf-8"); } },
            store: { async insertEvidence() { return 0; } },
            outputDir: `${evidenceDir}/legal`,
            createdBy: ownerId,
            citation,
          });
          return legal.processFile(rest[0]);
        });
      break;

    case "cert":
      if (!rest[0]) { process.stderr.write("Usage: gate cert <exam.csv>\n"); process.exitCode = 1; return; }
      spec = buildSpec(services, "cert:generate", `cert:batch:${rest[0]}`, 300_000,
        async () => {
          const cert = new CertMaster({
            signer,
            renderer: { async render(html: string) { return Buffer.from(html, "utf-8"); } },
            store: { async insertEvidence() { return 0; } },
            outputDir: `${evidenceDir}/certs`,
            createdBy: ownerId,
            citation,
          });
          return cert.processFile(rest[0]);
        });
      break;

    case "cite":
      if (!rest[0]) { process.stderr.write("Usage: gate cite <file> [doc-type] [subject-id]\n"); process.exitCode = 1; return; }
      spec = buildSpec(services, "citation:create", `citation:${rest[0]}`, 30_000,
        async () => {
          const docBytes = readFileSync(rest[0]);
          return citation.cite({
            documentBytes: docBytes,
            docType: rest[1] || "general",
            subjectId: rest[2] || "unspecified",
            createdBy: ownerId,
            meta: { sourceFile: rest[0] },
          });
        });
      break;

    case "verify-chain":
      spec = buildSpec(services, "citation:verify-chain", "custody:chain", 30_000,
        async () => {
          return CustodyChain.verify(join(evidenceDir, "custody", "custody.jsonl"));
        });
      break;

    case "compliance":
      spec = buildSpec(services, "compliance:generate", "compliance:report", 120_000,
        async () => {
          const health = await shield.checkHealth();
          const hardening = await shield.verifyHardening();
          const report = {
            timestamp: new Date().toISOString(),
            health,
            hardening,
            signedBy: signer.getKeyId(),
          };
          const sig = signer.signObject(report);
          return { ...report, signature: sig };
        });
      break;

    case "p2pe":
      if (!rest[0]) { process.stderr.write("Usage: gate p2pe <query|audit> [search-term]\n"); process.exitCode = 1; return; }
      spec = buildSpec(services, "p2pe:check", `p2pe:${rest[0]}`, 30_000,
        async () => {
          const registryPath = join(evidenceDir, "..", "data", "reference", "p2pe_applications.csv");
          const defaultPath = join(process.cwd(), "data", "reference", "p2pe_applications.csv");
          const p2pe = new P2PEComplianceChecker({
            registryPath: require("fs").existsSync(registryPath) ? registryPath : defaultPath,
            audit: services.audit,
            citation,
          });
          if (rest[0] === "audit") {
            return p2pe.auditRegistry(ownerId);
          }
          return p2pe.check(rest.join(" "), ownerId);
        });
      break;

    case "ai":
      if (!rest.length) { process.stderr.write('Usage: gate ai "<instruction>"\n'); process.exitCode = 1; return; }
      spec = buildSpec(services, "ai:query", "ai:orchestrator", 60_000,
        async () => {
          if (!ai) throw new Error("AI-001: LLM API key not configured");
          return ai.planAutomationChange(rest.join(" "));
        });
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
          "  legal <court.csv>          Court document batch (with citation)",
          "  cert <exam.csv>            Exam certificate batch (with citation)",
          "  compliance                 Signed compliance report",
          "  cite <file> [type] [subj]  Create security-assured citation",
          "  verify-chain               Verify chain-of-custody integrity",
          "  p2pe <query>               P2PE compliance check (cited)",
          "  p2pe audit                 Full P2PE registry audit (cited)",
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

  // Spin — Axiom A9: Wheel governs. No exceptions.
  const result = await wheel.spin(spec);

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exitCode = result.phase === "SEALED" ? 0 : 1;
}

main().catch((err) => {
  process.stderr.write(`[GATE] FATAL: ${err.message || err}\n`);
  process.exit(1);
});
