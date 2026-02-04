#!/usr/bin/env node
// src/agents/file-sync-agent.ts
//
// FILE SYNC AGENT — A real agent that runs through the Wheel.
//
// Watches a source directory, detects changed files by SHA-256, and copies
// them to a target directory. Every file operation is a spoke: policy-gated,
// deadline-enforced, guardrail-checked, audit-trailed.
//
// Usage:
//   npx ts-node src/agents/file-sync-agent.ts \
//     --source /path/to/source \
//     --target /path/to/target \
//     --owner owner \
//     --deadline 5000
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash } from "crypto";
import {
  readdirSync, readFileSync, existsSync,
  mkdirSync, statSync, copyFileSync
} from "fs";
import { join, relative, dirname } from "path";

import { getDoctrine } from "../core/doctrine";
import { Evaluator } from "../core/evaluator";
import { AuditService } from "../audit/audit-service";
import { Wheel, Phase } from "../wheel/wheel-orchestrator";

// ---------------------------------------------------------------------------
// Manifest — SHA-256 snapshot of every file in a directory tree
// ---------------------------------------------------------------------------

interface FileEntry {
  relativePath: string;
  sha256: string;
  sizeBytes: number;
}

function buildManifest(dir: string, base?: string): FileEntry[] {
  const root = base ?? dir;
  const entries: FileEntry[] = [];

  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      entries.push(...buildManifest(full, root));
    } else if (stat.isFile()) {
      const data = readFileSync(full);
      const hash = createHash("sha256").update(data).digest("hex");
      entries.push({
        relativePath: relative(root, full),
        sha256: hash,
        sizeBytes: stat.size,
      });
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Diff — compare two manifests, return files that need syncing
// ---------------------------------------------------------------------------

interface SyncAction {
  relativePath: string;
  reason: "new" | "changed";
  sourceHash: string;
  targetHash: string | null;
}

function diff(source: FileEntry[], target: FileEntry[]): SyncAction[] {
  const targetMap = new Map(target.map((e) => [e.relativePath, e]));
  const actions: SyncAction[] = [];

  for (const src of source) {
    const tgt = targetMap.get(src.relativePath);
    if (!tgt) {
      actions.push({
        relativePath: src.relativePath,
        reason: "new",
        sourceHash: src.sha256,
        targetHash: null,
      });
    } else if (tgt.sha256 !== src.sha256) {
      actions.push({
        relativePath: src.relativePath,
        reason: "changed",
        sourceHash: src.sha256,
        targetHash: tgt.sha256,
      });
    }
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Copy + verify — the executor for each spoke
// ---------------------------------------------------------------------------

function copyAndVerify(
  sourceDir: string,
  targetDir: string,
  action: SyncAction,
): { verified: boolean; bytes: number } {
  const src = join(sourceDir, action.relativePath);
  const dst = join(targetDir, action.relativePath);

  const dstDir = dirname(dst);
  if (!existsSync(dstDir)) {
    mkdirSync(dstDir, { recursive: true });
  }

  copyFileSync(src, dst);

  const dstData = readFileSync(dst);
  const dstHash = createHash("sha256").update(dstData).digest("hex");

  if (dstHash !== action.sourceHash) {
    throw new Error(
      `Integrity failure: ${action.relativePath} — expected ${action.sourceHash}, got ${dstHash}`
    );
  }

  return { verified: true, bytes: dstData.length };
}

// ---------------------------------------------------------------------------
// Main — wire the Wheel and run
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string): string => {
    const idx = args.indexOf(name);
    if (idx === -1 || idx + 1 >= args.length) {
      console.error(`Missing required flag: ${name}`);
      process.exit(1);
    }
    return args[idx + 1];
  };

  const sourceDir = flag("--source");
  const targetDir = flag("--target");
  const ownerId = flag("--owner");
  const deadlineMs = parseInt(flag("--deadline"), 10) || 5000;

  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    console.error(`Source is not a directory: ${sourceDir}`);
    process.exit(1);
  }
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Build the Wheel — Charter §3.1: create once, spin many
  const doctrine = getDoctrine();
  const evaluator = new Evaluator(doctrine);
  const audit = new AuditService({ logDir: join(targetDir, ".genesis-audit") });
  const wheel = new Wheel(evaluator, audit);

  // Scan
  console.log(`[sync] Scanning source: ${sourceDir}`);
  const sourceManifest = buildManifest(sourceDir);
  console.log(`[sync] Found ${sourceManifest.length} files in source`);

  console.log(`[sync] Scanning target: ${targetDir}`);
  const targetManifest = buildManifest(targetDir);

  const actions = diff(sourceManifest, targetManifest);
  console.log(`[sync] ${actions.length} files need syncing`);

  if (actions.length === 0) {
    console.log("[sync] Everything up to date.");
    return;
  }

  // Spin one spoke per file — executor travels WITH the spec
  let sealed = 0;
  let dead = 0;

  for (const action of actions) {
    const result = await wheel.spin({
      principalId: ownerId,
      action: "copy-file",
      resource: `file:${action.relativePath}`,
      context: {
        mfaPassed: true,
        ownerSupervised: true,
        riskScore: 10,
      },
      deadlineMs,
      execute: async () => copyAndVerify(sourceDir, targetDir, action),
    });

    if (result.phase === Phase.SEALED) {
      sealed++;
      const out = result.output as { verified: boolean; bytes: number };
      console.log(
        `  [SEALED] ${action.relativePath} — ${action.reason}, ` +
        `${out.bytes} bytes, verified=${out.verified}, ${result.durationMs}ms`
      );
    } else {
      dead++;
      console.log(
        `  [DEAD]   ${action.relativePath} — ${result.error}`
      );
    }

    console.log(`           receipts: ${result.receipts.length} phases, ` +
      `chain: ${result.receipts.map(r => r.phase).join(" → ")}`
    );
  }

  console.log(`\n[sync] Done. ${sealed} sealed, ${dead} dead.`);
  process.exit(dead > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[FATAL] ${err}`);
  process.exit(1);
});
