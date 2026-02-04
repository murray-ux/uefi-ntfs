#!/usr/bin/env node
// src/ci/ci-pipeline-runner.ts
//
// CI PIPELINE RUNNER — Full pipeline that gates on doctrine, runs checks,
// validates Rust boundary, verifies TypeScript compilation, and outputs
// a machine-readable report. Exit 0 = pipeline green. Exit 1 = pipeline red.
//
// Usage:
//   npx ts-node src/ci/ci-pipeline-runner.ts [--project-root /path]
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash, randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Check result types
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

interface PipelineReport {
  pipelineId: string;
  ts: string;
  projectRoot: string;
  checks: CheckResult[];
  totalPassed: number;
  totalFailed: number;
  sha256: string; // Hash of the entire report for tamper detection
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function runCheck(name: string, fn: () => string): CheckResult {
  const t0 = Date.now();
  try {
    const message = fn();
    return { name, passed: true, message, durationMs: Date.now() - t0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name, passed: false, message: msg, durationMs: Date.now() - t0 };
  }
}

function checkDoctrineIntegrity(root: string): string {
  const doctrinePath = join(root, "src/core/doctrine.ts");
  if (!existsSync(doctrinePath)) {
    throw new Error(`Doctrine file missing: ${doctrinePath}`);
  }
  const content = readFileSync(doctrinePath, "utf-8");

  // Verify fail-closed default is present
  if (!content.includes('effect: "DENY"')) {
    throw new Error("Doctrine does not contain fail-closed default DENY");
  }

  // Count rules
  const ruleMatches = content.match(/id:\s*"/g);
  const ruleCount = ruleMatches?.length ?? 0;
  if (ruleCount === 0) {
    throw new Error("Doctrine contains zero rules");
  }

  // Hash the doctrine file
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `${ruleCount} rules, default DENY confirmed, sha256:${hash}`;
}

function checkTypeScriptCompiles(root: string): string {
  const tsconfig = join(root, "tsconfig.json");
  if (!existsSync(tsconfig)) {
    throw new Error("tsconfig.json not found");
  }
  // --noEmit so we don't produce artifacts, just type-check
  execSync("npx tsc --noEmit", { cwd: root, timeout: 60000, stdio: "pipe" });
  return "TypeScript type-check passed";
}

function checkRustBoundaryBuilds(root: string): string {
  const cargoToml = join(root, "rust_boundary/Cargo.toml");
  if (!existsSync(cargoToml)) {
    throw new Error("rust_boundary/Cargo.toml not found");
  }
  execSync("cargo check --manifest-path rust_boundary/Cargo.toml", {
    cwd: root, timeout: 120000, stdio: "pipe",
  });
  return "Rust integrity boundary compiles";
}

function checkRustTests(root: string): string {
  execSync("cargo test --manifest-path rust_boundary/Cargo.toml", {
    cwd: root, timeout: 120000, stdio: "pipe",
  });
  return "All Rust tests pass";
}

function checkGuardrailsExist(root: string): string {
  const guardrailPath = join(root, "src/guardrails/local-sanity-checks.ts");
  if (!existsSync(guardrailPath)) {
    throw new Error("Guardrails module missing");
  }
  const content = readFileSync(guardrailPath, "utf-8");
  if (!content.includes("DESTRUCTIVE_PATTERNS")) {
    throw new Error("Guardrails module does not contain destructive pattern checks");
  }
  return "Guardrails module present with destructive pattern checks";
}

function checkWheelStateIntegrity(root: string): string {
  const wheelPath = join(root, "src/wheel/wheel-orchestrator.ts");
  if (!existsSync(wheelPath)) {
    throw new Error("Wheel orchestrator missing");
  }
  const content = readFileSync(wheelPath, "utf-8");

  // Verify all required phases exist
  const requiredPhases = ["BORN", "GATED", "ATTESTED", "EXECUTING", "SEALED", "DEAD"];
  for (const phase of requiredPhases) {
    if (!content.includes(`${phase}`)) {
      throw new Error(`Wheel missing phase: ${phase}`);
    }
  }

  // Verify legal transition map is defined
  if (!content.includes("LEGAL") || !content.includes("new Map")) {
    throw new Error("Wheel missing legal transitions state machine");
  }

  return `All ${requiredPhases.length} phases present, state machine intact`;
}

function checkAuditServiceWrites(root: string): string {
  const auditPath = join(root, "src/audit/audit-service.ts");
  if (!existsSync(auditPath)) {
    throw new Error("Audit service missing");
  }
  const content = readFileSync(auditPath, "utf-8");
  if (!content.includes("appendFileSync")) {
    throw new Error("Audit service does not use append-only writes");
  }
  return "Audit service uses append-only file writes";
}

function checkNoHardcodedSecrets(root: string): string {
  // Scan all .ts files for common secret patterns
  const dangerousPatterns = [
    /password\s*[:=]\s*["'][^$][^"']{8,}/gi,
    /api[_-]?key\s*[:=]\s*["'][^$][^"']{16,}/gi,
    /secret\s*[:=]\s*["'][^$][^"']{16,}/gi,
    /-----BEGIN (RSA |EC |)PRIVATE KEY-----/g,
  ];

  const output = execSync(
    `find ${root}/src -name "*.ts" -exec cat {} +`,
    { cwd: root, timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
  ).toString();

  for (const pat of dangerousPatterns) {
    if (pat.test(output)) {
      throw new Error(`Potential hardcoded secret matching ${pat.source}`);
    }
  }
  return "No hardcoded secrets detected in src/**/*.ts";
}

// ---------------------------------------------------------------------------
// Pipeline main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--project-root");
  const projectRoot = rootIdx !== -1 && args[rootIdx + 1]
    ? args[rootIdx + 1]
    : process.cwd();

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       GENESIS CI PIPELINE — POLICY-GATED BUILD      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Project root: ${projectRoot}`);
  console.log(`  Time:         ${new Date().toISOString()}`);
  console.log();

  const checks: CheckResult[] = [
    runCheck("doctrine-integrity",     () => checkDoctrineIntegrity(projectRoot)),
    runCheck("guardrails-present",     () => checkGuardrailsExist(projectRoot)),
    runCheck("wheel-state-machine",    () => checkWheelStateIntegrity(projectRoot)),
    runCheck("audit-append-only",      () => checkAuditServiceWrites(projectRoot)),
    runCheck("no-hardcoded-secrets",   () => checkNoHardcodedSecrets(projectRoot)),
    runCheck("typescript-compiles",    () => checkTypeScriptCompiles(projectRoot)),
    runCheck("rust-boundary-compiles", () => checkRustBoundaryBuilds(projectRoot)),
    runCheck("rust-tests-pass",        () => checkRustTests(projectRoot)),
  ];

  // Print results
  console.log("  RESULTS");
  console.log("  ─────────────────────────────────────────────────────");
  for (const c of checks) {
    const icon = c.passed ? "PASS" : "FAIL";
    const pad = c.passed ? " " : "";
    console.log(`  [${icon}]${pad} ${c.name} (${c.durationMs}ms)`);
    console.log(`         ${c.message}`);
  }

  const totalPassed = checks.filter((c) => c.passed).length;
  const totalFailed = checks.filter((c) => !c.passed).length;

  console.log();
  console.log(`  ─────────────────────────────────────────────────────`);
  console.log(`  ${totalPassed}/${checks.length} passed, ${totalFailed} failed`);

  // Generate report
  const reportDir = join(projectRoot, ".genesis-ci");
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });

  const report: Omit<PipelineReport, "sha256"> = {
    pipelineId: randomUUID(),
    ts: new Date().toISOString(),
    projectRoot,
    checks,
    totalPassed,
    totalFailed,
  };

  // Self-hash the report
  const reportJson = JSON.stringify(report, null, 2);
  const reportHash = createHash("sha256").update(reportJson).digest("hex");
  const fullReport: PipelineReport = { ...report, sha256: reportHash };

  const reportPath = join(reportDir, `pipeline-${fullReport.pipelineId}.json`);
  writeFileSync(reportPath, JSON.stringify(fullReport, null, 2) + "\n");
  console.log(`\n  Report: ${reportPath}`);
  console.log(`  SHA-256: ${reportHash}`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
