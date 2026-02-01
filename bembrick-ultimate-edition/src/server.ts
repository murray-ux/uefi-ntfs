// src/server.ts
//
// GENESIS Unified Server — ties everything together into one process.
//
// Endpoints:
//   GET  /health           System health (device + policy + audit)
//   POST /evaluate          PDP: evaluate a policy request
//   POST /authenticate      SSO: validate JWT, return identity
//   POST /authorise         SSO: check if identity can do action
//   POST /sign              Ed25519: sign arbitrary data
//   POST /verify-signature  Ed25519: verify a signature
//   GET  /audit/chain       Verify the custody chain integrity
//   GET  /shield/health     Quantum Shield device health
//   GET  /shield/hardening  Quantum Shield hardening report
//   GET  /                  Dashboard (static HTML)
//
// No Express dependency — uses Node 20 built-in http module.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

import { Evaluator } from "./core/evaluator";
import { getDoctrine } from "./core/doctrine";
import { AuditService } from "./audit/audit-service";
import { CustodyChain } from "./audit/chain-of-custody";
import { Ed25519Signer, loadOrCreateKeys } from "../identity/ed25519_signer";
import { GenesisSSO } from "../identity/sso_master";
import { QuantumShieldCore } from "../security/quantum_shield_core";
import { AiOrchestrator } from "../ai/ai_orchestrator";

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const AUDIT_DIR = process.env.GENESIS_AUDIT_DIR || "./data/audit";
const EVIDENCE_DIR = process.env.GENESIS_EVIDENCE_DIR || "./data/evidence";
const KEY_DIR = process.env.GENESIS_KEY_DIR || "./data/keys";
const PDP_PORT = parseInt(process.env.GENESIS_PDP_PORT || "8080", 10);
const OWNER_ID = process.env.GENESIS_OWNER_ID || "owner";
const JWT_SECRET = process.env.GENESIS_JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[GENESIS] FATAL: GENESIS_JWT_SECRET must be set (Axiom A6: no secrets in code)");
  process.exit(1);
}
const STATIC_DIR = process.env.GENESIS_STATIC_DIR || "./static";

// ---------------------------------------------------------------------------
// Bootstrap services
// ---------------------------------------------------------------------------

const evaluator = new Evaluator(getDoctrine());
const audit = new AuditService({ logDir: AUDIT_DIR });
const keys = loadOrCreateKeys(KEY_DIR);
const signer = new Ed25519Signer(keys);

const sso = new GenesisSSO({
  jwtSecret: JWT_SECRET,
  tokenTtlSeconds: 3600,
  evaluator,
  audit,
});

const shield = new QuantumShieldCore({
  dataDir: AUDIT_DIR,
  evaluator,
  audit,
  thresholds: {
    maxDiskUsagePercent: 90,
    maxMemoryUsagePercent: 85,
    maxLoadPerCpu: 2.0,
  },
});

let custodyChain: CustodyChain | null = null;

// AI orchestrator — only active when an LLM API key is configured
let aiOrchestrator: AiOrchestrator | null = null;
const AI_API_KEY = process.env.GENESIS_AI_API_KEY || process.env.OPENAI_API_KEY;
const AI_BASE_URL = process.env.GENESIS_AI_BASE_URL || "https://api.openai.com/v1";
if (AI_API_KEY) {
  // Minimal OpenAI-compatible client
  const llmClient = {
    chat: {
      completions: {
        async create(params: { model: string; messages: Array<{ role: string; content: string }>; temperature?: number; max_tokens?: number }) {
          const resp = await fetch(`${AI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
            body: JSON.stringify(params),
          });
          return resp.json();
        },
      },
    },
  };
  aiOrchestrator = new AiOrchestrator({ llmClient: llmClient as any, audit });
  console.log("[GENESIS] AI orchestrator active");
} else {
  console.log("[GENESIS] AI orchestrator disabled (no API key)");
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || "/";
  const method = req.method || "GET";

  try {
    // Health
    if (url === "/health" && method === "GET") {
      const health = await shield.checkHealth();
      json(res, 200, {
        status: health.overallHealthy ? "healthy" : "degraded",
        device: health,
        doctrine: getDoctrine().version,
        signerKeyId: signer.getKeyId(),
        ownerId: OWNER_ID,
      });
      return;
    }

    // PDP: evaluate policy
    if (url === "/evaluate" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const decision = await evaluator.evaluate(body);
      await audit.writePolicyDecision({
        decision,
        principalId: body.principalId,
        resourceId: body.resource,
        actionName: body.action,
        actorId: body.principalId,
        actorType: body.principalType || "human",
        source: "pdp-api",
      });
      json(res, 200, { decision, effect: decision.effect });
      return;
    }

    // SSO: authenticate
    if (url === "/authenticate" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const identity = await sso.authenticate(body.token);
      json(res, 200, { identity });
      return;
    }

    // SSO: authorise
    if (url === "/authorise" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const identity = await sso.authenticate(body.token);
      const allowed = await sso.authorise(identity, body.resource, body.action, body.tags);
      json(res, 200, { allowed, identity: identity.subjectId });
      return;
    }

    // SSO: issue token (owner-only bootstrap)
    if (url === "/issue-token" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const token = sso.issueToken(body);
      json(res, 200, { token });
      return;
    }

    // Ed25519: sign
    if (url === "/sign" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = signer.signObject(body.data);
      json(res, 200, result);
      return;
    }

    // Ed25519: verify
    if (url === "/verify-signature" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const data = Buffer.from(JSON.stringify(body.data), "utf-8");
      const result = Ed25519Signer.verify(data, body.signature, signer.getPublicKey());
      json(res, 200, result);
      return;
    }

    // Audit: verify custody chain
    if (url === "/audit/chain" && method === "GET") {
      const chainPath = join(EVIDENCE_DIR, "custody.jsonl");
      if (!existsSync(chainPath)) {
        json(res, 200, { valid: true, totalRecords: 0, message: "No chain yet" });
        return;
      }
      const result = await CustodyChain.verify(chainPath);
      json(res, 200, result);
      return;
    }

    // Audit: record event to custody chain
    if (url === "/audit/record" && method === "POST") {
      if (!custodyChain) {
        custodyChain = await CustodyChain.create(EVIDENCE_DIR);
      }
      const body = JSON.parse(await readBody(req));
      const record = await custodyChain.record(body.eventType, body.actorId, body.payload || {});
      json(res, 200, record);
      return;
    }

    // Shield: device health
    if (url === "/shield/health" && method === "GET") {
      const health = await shield.checkHealth();
      json(res, 200, health);
      return;
    }

    // Shield: hardening report
    if (url === "/shield/hardening" && method === "GET") {
      const report = await shield.verifyHardening();
      json(res, 200, report);
      return;
    }

    // AI: general query
    if (url === "/ai/query" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (!aiOrchestrator) {
        json(res, 200, { response: `[Offline] AI service not configured. Query logged: "${(body.message || '').slice(0, 100)}"` });
        return;
      }
      const result = await aiOrchestrator.query(
        "You are the GENESIS 2.0 AI assistant. Be concise, technical, and helpful.",
        body.message || body.prompt || "",
      );
      json(res, 200, { response: result });
      return;
    }

    // AI: legal draft
    if (url === "/ai/draft" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (!aiOrchestrator) {
        json(res, 200, { draft: "[Offline] AI drafting not available without API key.", disclaimer: "AI-generated draft." });
        return;
      }
      const result = await aiOrchestrator.draftLegalDoc(body.prompt || "", body.context || {});
      json(res, 200, result);
      return;
    }

    // AI: plan automation
    if (url === "/ai/plan" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (!aiOrchestrator) {
        json(res, 200, { plan: "[Offline] Planning not available without API key." });
        return;
      }
      const result = await aiOrchestrator.planAutomationChange(body.request || body.prompt || "");
      json(res, 200, result);
      return;
    }

    // AI: summarise evidence
    if (url === "/ai/summarise" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (!aiOrchestrator) {
        json(res, 200, { summary: "[Offline] Summarisation not available without API key." });
        return;
      }
      const result = await aiOrchestrator.summariseEvidence(body.bundle || body);
      json(res, 200, result);
      return;
    }

    // AI: auto-generate pipeline
    if (url === "/ai/autogen" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const type = body.type || "unknown";
      const pipelines: Record<string, string[]> = {
        legal: ["intake", "classify", "draft", "review-flag", "sign", "bundle", "deliver"],
        finance: ["intake", "classify", "archive", "reconcile", "sign", "route"],
        compliance: ["scan", "assess", "policy-check", "generate-report", "sign", "deliver"],
        onboard: ["enrol", "provision", "harden", "verify", "certify", "activate"],
        cert: ["generate", "validate", "sign", "package", "deliver", "audit-log"],
        ooda: ["perceive", "orient", "decide", "act", "learn"],
        sovereign: ["intake-collect", "classify-route", "process", "sign", "bundle", "archive"],
      };
      const stages = pipelines[type] || ["init", "process", "complete"];
      json(res, 200, {
        type,
        pipeline: stages,
        stages: stages.length,
        message: `${type} pipeline initialised with ${stages.length} stages`,
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    // Dashboard: serve static HTML
    if (url === "/" && method === "GET") {
      const dashPath = join(STATIC_DIR, "index.html");
      if (existsSync(dashPath)) {
        const html = readFileSync(dashPath, "utf-8");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }
      json(res, 200, { service: "GENESIS 2.0", status: "running", endpoints: [
        "GET  /health", "POST /evaluate", "POST /authenticate",
        "POST /authorise", "POST /issue-token", "POST /sign",
        "POST /verify-signature", "GET  /audit/chain", "POST /audit/record",
        "GET  /shield/health", "GET  /shield/hardening",
      ]});
      return;
    }

    // 404
    json(res, 404, { error: "Not found" });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: message });
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const server = createServer(handleRequest);

server.listen(PDP_PORT, () => {
  console.log(`[GENESIS] Server listening on :${PDP_PORT}`);
  console.log(`[GENESIS] Owner: ${OWNER_ID}`);
  console.log(`[GENESIS] Signer key: ${signer.getKeyId()}`);
  console.log(`[GENESIS] Doctrine: v${getDoctrine().version}`);
  console.log(`[GENESIS] Audit dir: ${AUDIT_DIR}`);
  console.log(`[GENESIS] Evidence dir: ${EVIDENCE_DIR}`);
});
