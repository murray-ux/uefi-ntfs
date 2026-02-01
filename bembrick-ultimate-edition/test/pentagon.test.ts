// test/pentagon.test.ts
//
// Pentagon — integration tests
//
// Tests the public surface ONLY. No underfloor imports.
// If these pass, the plumbing works.
//
// Run: npx tsx --test test/pentagon.test.ts
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Pentagon } from "../pentagon/pentagon";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makePentagon(): Pentagon {
  const dataDir = mkdtempSync(join(tmpdir(), "pentagon-test-"));
  return new Pentagon({ dataDir, ownerId: "owner" });
}

describe("Pentagon — public surface only", () => {

  // ── FACET 1: COMMAND ─────────────────────────────────────────────────

  describe("CMD facet", () => {
    it("should execute health command", async () => {
      const p = makePentagon();
      const result = await p.command("health");
      assert.equal(result.command, "health");
      assert.equal(result.success, true);
      assert.ok(result.durationMs >= 0);
    });

    it("should execute diagnostics command", async () => {
      const p = makePentagon();
      const result = await p.command("diagnostics");
      assert.equal(result.success, true);
      const output = result.output as Record<string, unknown>;
      assert.ok("kernel" in output);
      assert.ok("conduit" in output);
      assert.ok("reservoir" in output);
      assert.ok("valve" in output);
    });

    it("should handle unknown commands gracefully", async () => {
      const p = makePentagon();
      const result = await p.command("nonexistent");
      assert.equal(result.success, true);
      const output = result.output as Record<string, unknown>;
      assert.equal(output.handled, false);
    });
  });

  // ── FACET 2: IDENTITY ────────────────────────────────────────────────

  describe("IDN facet", () => {
    it("should allow owner with MFA", () => {
      const p = makePentagon();
      const check = p.check("owner", "deploy:app", "server:prod", { mfaPassed: true, riskScore: 0 });
      assert.equal(check.allowed, true);
      assert.equal(check.principalId, "owner");
    });

    it("should deny unknown principal", () => {
      const p = makePentagon();
      const check = p.check("stranger", "deploy:app", "server:prod", { mfaPassed: false, riskScore: 0 });
      assert.equal(check.allowed, false);
    });

    it("should allow system health checks", () => {
      const p = makePentagon();
      const check = p.check("system", "health:check", "system:core", {});
      assert.equal(check.allowed, true);
    });

    it("should report remaining quota", () => {
      const p = makePentagon();
      const check = p.check("owner", "test:action", "test:resource", { mfaPassed: true, riskScore: 0 });
      assert.ok(typeof check.remainingQuota === "number");
      assert.ok(check.remainingQuota >= 0);
    });
  });

  // ── FACET 3: EVIDENCE ────────────────────────────────────────────────

  describe("EVD facet", () => {
    it("should store and retrieve evidence", () => {
      const p = makePentagon();
      const record = p.store("finding:001", { severity: "high", detail: "test" });
      assert.equal(record.key, "finding:001");
      assert.equal(record.version, 1);
      assert.ok(record.hash.length > 0);

      const retrieved = p.retrieve("finding:001") as Record<string, string>;
      assert.equal(retrieved.severity, "high");
    });

    it("should track version history", () => {
      const p = makePentagon();
      p.store("key:v", { v: 1 });
      p.store("key:v", { v: 2 });
      p.store("key:v", { v: 3 });

      const versions = p.history("key:v");
      assert.equal(versions.length, 3);
      assert.equal(versions[0].version, 1);
      assert.equal(versions[2].version, 3);
    });

    it("should return null for missing keys", () => {
      const p = makePentagon();
      assert.equal(p.retrieve("nonexistent"), null);
    });
  });

  // ── FACET 4: EXECUTE ─────────────────────────────────────────────────

  describe("EXE facet", () => {
    it("should run a pipeline", async () => {
      const p = makePentagon();
      const receipt = await p.execute("test:pipeline", [
        { name: "step-a", fn: async () => ({ a: true }) },
        { name: "step-b", fn: async (input) => ({ ...input as object, b: true }) },
      ]);
      assert.equal(receipt.success, true);
      assert.equal(receipt.pattern, "pipeline");
      assert.equal(receipt.steps, 2);
      assert.ok(receipt.durationMs >= 0);
    });

    it("should run a fan-out", async () => {
      const p = makePentagon();
      const receipt = await p.execute("test:fanout", [
        { name: "parallel-a", fn: async () => "a" },
        { name: "parallel-b", fn: async () => "b" },
        { name: "parallel-c", fn: async () => "c" },
      ], null, "fan-out");
      assert.equal(receipt.success, true);
      assert.equal(receipt.pattern, "fan-out");
      assert.equal(receipt.steps, 3);
    });

    it("should run a saga with compensation on failure", async () => {
      let compensated = false;
      const p = makePentagon();
      const receipt = await p.execute("test:saga", [
        {
          name: "step-1",
          fn: async () => "done",
          undo: async () => { compensated = true; },
        },
        {
          name: "step-2-fails",
          fn: async () => { throw new Error("saga-fail"); },
        },
      ], null, "saga");
      assert.equal(receipt.success, false);
      assert.equal(compensated, true);
    });

    it("should handle step timeout", async () => {
      const p = makePentagon();
      const receipt = await p.execute("test:timeout", [
        {
          name: "slow",
          fn: async () => new Promise((r) => setTimeout(r, 10000)),
          timeoutMs: 50,
        },
      ]);
      assert.equal(receipt.success, false);
    });
  });

  // ── FACET 5: OUTPUT ──────────────────────────────────────────────────

  describe("OUT facet", () => {
    it("should produce a bundle with integrity hash", async () => {
      const p = makePentagon();
      const bundle = await p.output("report", [
        { name: "summary.json", data: '{"status":"ok"}' },
        { name: "detail.txt", data: "All checks passed" },
      ]);
      assert.equal(bundle.type, "report");
      assert.equal(bundle.artifacts.length, 2);
      assert.ok(bundle.integrity.length > 0);
      assert.ok(bundle.generatedAt.length > 0);
    });

    it("should store bundle in evidence", async () => {
      const p = makePentagon();
      const bundle = await p.output("test-bundle", [
        { name: "file.bin", data: Buffer.from([1, 2, 3]) },
      ]);

      // Bundle manifest should be retrievable
      const manifest = p.retrieve(`bundle:${bundle.id}`) as Record<string, unknown>;
      assert.ok(manifest);
      assert.equal(manifest.type, "test-bundle");
    });
  });
});
