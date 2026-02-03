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
import { YubiKeyBridge, createYubiKeyBridge } from "../security/yubikey_bridge";
import { NetgearBridge, createNetgearBridge } from "../network/netgear_bridge";

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

// YubiKey bridge — hardware security key integration
const YUBIKEY_MODE = (process.env.GENESIS_YUBIKEY_MODE || "otp") as "webauthn" | "challenge-response" | "otp" | "piv";
const YUBIKEY_RP_ID = process.env.GENESIS_YUBIKEY_RP_ID || "localhost";
const YUBIKEY_CLIENT_ID = process.env.GENESIS_YUBIKEY_CLIENT_ID;
const YUBIKEY_SECRET_KEY = process.env.GENESIS_YUBIKEY_SECRET_KEY;
const YUBIKEY_HMAC_SECRET = process.env.GENESIS_YUBIKEY_HMAC_SECRET;

const yubikey = createYubiKeyBridge({
  mode: YUBIKEY_MODE,
  rpId: YUBIKEY_RP_ID,
  rpName: "GENESIS 2.0",
  yubicoClientId: YUBIKEY_CLIENT_ID,
  yubicoSecretKey: YUBIKEY_SECRET_KEY,
  hmacSecret: YUBIKEY_HMAC_SECRET,
});
console.log(`[GENESIS] YubiKey bridge active (mode: ${YUBIKEY_MODE})`);

// Netgear network bridge — router and NAS integration
const netgear = createNetgearBridge();
console.log(`[GENESIS] Netgear bridge active (router: ${process.env.GENESIS_NETGEAR_ROUTER_IP || "192.168.1.1"})`);

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

    // YubiKey: status
    if (url === "/yubikey/status" && method === "GET") {
      json(res, 200, yubikey.stats());
      return;
    }

    // YubiKey: WebAuthn registration options
    if (url === "/yubikey/register/options" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const options = yubikey.generateRegistrationOptions(
        body.userId || OWNER_ID,
        body.userName || OWNER_ID,
        body.displayName,
      );
      json(res, 200, options);
      return;
    }

    // YubiKey: WebAuthn registration verify
    if (url === "/yubikey/register/verify" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = yubikey.verifyRegistration(
        body.userId || OWNER_ID,
        body.challenge,
        body.credentialId,
        body.publicKey,
        body.attestationObject,
      );
      json(res, 200, result);
      return;
    }

    // YubiKey: WebAuthn authentication options
    if (url === "/yubikey/auth/options" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const options = yubikey.generateAuthenticationOptions(body.userId || OWNER_ID);
      if (!options) {
        json(res, 400, { error: "No credential registered for user" });
        return;
      }
      json(res, 200, options);
      return;
    }

    // YubiKey: WebAuthn authentication verify
    if (url === "/yubikey/auth/verify" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = yubikey.verifyAuthentication(
        body.userId || OWNER_ID,
        body.challenge,
        body.credentialId,
        body.signature,
        body.authenticatorData,
        body.clientDataJSON,
      );
      json(res, 200, result);
      return;
    }

    // YubiKey: HMAC challenge-response — generate challenge
    if (url === "/yubikey/challenge" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const challenge = yubikey.generateHmacChallenge(body.userId || OWNER_ID);
      json(res, 200, {
        ...challenge,
        instruction: `Run: ykchalresp -2 ${challenge.challenge}`,
      });
      return;
    }

    // YubiKey: HMAC challenge-response — verify response
    if (url === "/yubikey/challenge/verify" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = yubikey.verifyHmacResponse(
        body.userId || OWNER_ID,
        body.challenge,
        body.response,
      );
      json(res, 200, result);
      return;
    }

    // YubiKey: OTP validation
    if (url === "/yubikey/otp" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = await yubikey.validateOtp(body.otp);
      json(res, 200, result);
      return;
    }

    // YubiKey: unified MFA verify (auto-detects mode)
    if (url === "/yubikey/mfa" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = await yubikey.verifyMfa(body.userId || OWNER_ID, body);
      json(res, 200, result);
      return;
    }

    // -------------------------------------------------------------------------
    // Netgear Network Endpoints
    // -------------------------------------------------------------------------

    // Network: router status
    if (url === "/network/status" && method === "GET") {
      const status = await netgear.getStatus();
      json(res, 200, status || { error: "Unable to connect to router" });
      return;
    }

    // Network: connected devices
    if (url === "/network/devices" && method === "GET") {
      const devices = await netgear.getConnectedDevices();
      json(res, 200, { devices, count: devices.length });
      return;
    }

    // Network: traffic stats
    if (url === "/network/traffic" && method === "GET") {
      const stats = await netgear.getTrafficStats();
      json(res, 200, stats || { error: "Unable to fetch traffic stats" });
      return;
    }

    // Network: WiFi networks
    if (url === "/network/wifi" && method === "GET") {
      const networks = await netgear.getWifiNetworks();
      json(res, 200, { networks });
      return;
    }

    // Network: security status
    if (url === "/network/security" && method === "GET") {
      const security = await netgear.getSecurityStatus();
      json(res, 200, security);
      return;
    }

    // Network: reboot router (admin only)
    if (url === "/network/reboot" && method === "POST") {
      const success = await netgear.reboot();
      json(res, 200, { success, message: success ? "Reboot initiated" : "Reboot failed" });
      return;
    }

    // Network: block device (access control)
    if (url === "/network/block" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (!body.mac) {
        json(res, 400, { error: "MAC address required" });
        return;
      }
      const success = await netgear.blockDevice(body.mac);
      json(res, 200, { success, mac: body.mac, action: "blocked" });
      return;
    }

    // Network: unblock device
    if (url === "/network/unblock" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (!body.mac) {
        json(res, 400, { error: "MAC address required" });
        return;
      }
      const success = await netgear.unblockDevice(body.mac);
      json(res, 200, { success, mac: body.mac, action: "unblocked" });
      return;
    }

    // Network: guest WiFi control
    if (url === "/network/guest-wifi" && method === "POST") {
      const body = JSON.parse(await readBody(req));
      const success = await netgear.setGuestWifi(body.enabled, body.ssid, body.password);
      json(res, 200, { success, enabled: body.enabled });
      return;
    }

    // Network: bridge stats
    if (url === "/network/stats" && method === "GET") {
      json(res, 200, netgear.stats());
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
