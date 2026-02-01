#!/usr/bin/env node
// src/firmware/firmware-gate.ts
//
// FIRMWARE VALIDATION GATE — Wraps the Rust integrity boundary in a
// Wheel spoke. Every firmware validation is policy-gated, deadline-enforced,
// and audit-trailed. The Rust binary does the actual cryptographic work;
// this module governs when and whether it's allowed to run.
//
// Usage:
//   npx ts-node src/firmware/firmware-gate.ts \
//     --hex /path/to/firmware.hex \
//     --expected <sha256> \
//     --owner owner \
//     --rust-bin ./rust_boundary/target/release/genesis-verify
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

import { getDoctrine } from "../core/doctrine";
import { Evaluator } from "../core/evaluator";
import { AuditService } from "../audit/audit-service";
import { Wheel, Phase } from "../wheel/wheel-orchestrator";

// ---------------------------------------------------------------------------
// Rust boundary invocation
// ---------------------------------------------------------------------------

interface FirmwareResult {
  valid: boolean;
  hexFile: string;
  sha256: string;
  recordCount: number;
  rustOutput: string;
}

function invokeRustBoundary(
  rustBin: string,
  hexFile: string,
  expectedHash?: string
): FirmwareResult {
  const fwArgs = expectedHash
    ? `firmware "${hexFile}" "${expectedHash}"`
    : `firmware "${hexFile}"`;

  const rustOutput = execSync(`"${rustBin}" ${fwArgs}`, {
    timeout: 30000,
    encoding: "utf-8",
  }).trim();

  const rawBytes = readFileSync(hexFile);
  const nodeSha = createHash("sha256").update(rawBytes).digest("hex");
  const lines = rawBytes.toString("utf-8").split("\n").filter((l) => l.startsWith(":"));

  return {
    valid: true,
    hexFile,
    sha256: nodeSha,
    recordCount: lines.length,
    rustOutput,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string, required = true): string => {
    const idx = args.indexOf(name);
    if (idx === -1 || idx + 1 >= args.length) {
      if (required) {
        console.error(`Missing required flag: ${name}`);
        process.exit(1);
      }
      return "";
    }
    return args[idx + 1];
  };

  const hexFile = flag("--hex");
  const expectedHash = flag("--expected", false) || undefined;
  const ownerId = flag("--owner");
  const rustBin = flag("--rust-bin", false)
    || join(process.cwd(), "rust_boundary/target/release/genesis-verify");

  if (!existsSync(hexFile)) {
    console.error(`HEX file not found: ${hexFile}`);
    process.exit(1);
  }
  if (!existsSync(rustBin)) {
    console.error(`Rust binary not found: ${rustBin}`);
    console.error("Build it with: cargo build --release --manifest-path rust_boundary/Cargo.toml");
    process.exit(1);
  }

  // Wire the Wheel — Charter §3.1: create once, spin many
  const doctrine = getDoctrine();
  const evaluator = new Evaluator(doctrine);
  const audit = new AuditService({ logDir: join(process.cwd(), ".genesis-audit") });
  const wheel = new Wheel(evaluator, audit);

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     GENESIS FIRMWARE GATE — RUST INTEGRITY CHECK     ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  HEX file:     ${hexFile}`);
  console.log(`  Expected:     ${expectedHash ?? "(any)"}`);
  console.log(`  Rust binary:  ${rustBin}`);
  console.log(`  Owner:        ${ownerId}`);
  console.log();

  // Executor travels WITH the spec — new Wheel API
  const result = await wheel.spin({
    principalId: ownerId,
    action: "validate-firmware",
    resource: `firmware:${hexFile}`,
    context: {
      mfaPassed: true,
      ownerSupervised: true,
      riskScore: 30,
    },
    deadlineMs: 30000,
    execute: async () => invokeRustBoundary(rustBin, hexFile, expectedHash),
  });

  console.log(`  Phase:    ${result.phase}`);
  console.log(`  Spoke ID: ${result.spokeId}`);
  console.log(`  Duration: ${result.durationMs ?? "n/a"}ms`);

  if (result.phase === Phase.SEALED) {
    const fw = result.output as FirmwareResult;
    console.log(`\n  FIRMWARE VALIDATED`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  SHA-256:      ${fw.sha256}`);
    console.log(`  HEX records:  ${fw.recordCount}`);
    console.log(`  Rust says:    ${fw.rustOutput}`);
    console.log(`  Valid:        ${fw.valid}`);
  } else {
    console.log(`\n  FIRMWARE REJECTED`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Error: ${result.error}`);
  }

  console.log(`\n  RECEIPT CHAIN`);
  console.log(`  ─────────────────────────────────────────────────────`);
  for (const r of result.receipts) {
    console.log(`  ${r.phase.padEnd(10)} ${r.ts}  ${r.hash.slice(0, 16)}...`);
    console.log(`  ${"".padEnd(10)} ${r.detail}`);
  }

  process.exit(result.phase === Phase.SEALED ? 0 : 1);
}

main().catch((err) => {
  console.error(`[FATAL] ${err}`);
  process.exit(1);
});
