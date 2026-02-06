// test/wheel.test.ts
//
// Wheel Orchestrator — unit tests
// Uses Node built-in test runner (node:test)
//
// Run: npx tsx --test test/wheel.test.ts
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Wheel, Phase, SpokeSpec, WHEEL_CODES } from "../src/wheel/wheel-orchestrator";
import { Evaluator } from "../src/core/evaluator";
import { getDoctrine } from "../src/core/doctrine";
import { AuditService } from "../src/audit/audit-service";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makeWheel(): Wheel {
  const doctrine = getDoctrine();
  const evaluator = new Evaluator(doctrine);
  const auditDir = mkdtempSync(join(tmpdir(), "genesis-test-"));
  const audit = new AuditService({ logDir: auditDir });
  return new Wheel(evaluator, audit);
}

function makeSpec(overrides?: Partial<SpokeSpec>): SpokeSpec {
  return {
    principalId: "owner",
    action: "test:action",
    resource: "test:resource",
    context: { mfaPassed: true, riskScore: 0, ownerSupervised: true },
    deadlineMs: 5000,
    execute: async () => ({ ok: true }),
    ...overrides,
  };
}

describe("Wheel", () => {
  it("should SEAL a valid spoke", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec());
    assert.equal(result.phase, Phase.SEALED);
    assert.equal(result.error, null);
    assert.deepEqual(result.output, { ok: true });
  });

  it("should produce a receipt chain with all phases", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec());
    const phases = result.receipts.map((r) => r.phase);
    assert.deepEqual(phases, [Phase.BORN, Phase.GATED, Phase.ATTESTED, Phase.EXECUTING, Phase.SEALED]);
  });

  it("should DENY when MFA is missing for owner", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec({
      principalId: "unknown-user",
      context: { mfaPassed: false, riskScore: 0 },
    }));
    assert.equal(result.phase, Phase.DEAD);
    assert.ok(result.code === WHEEL_CODES.W002);
  });

  it("should kill spoke on deadline exceeded", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec({
      deadlineMs: 10,
      execute: async () => new Promise((r) => setTimeout(r, 5000)),
    }));
    assert.equal(result.phase, Phase.DEAD);
    assert.ok(result.code === WHEEL_CODES.W004);
  });

  it("should kill spoke on executor error", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec({
      execute: async () => { throw new Error("boom"); },
    }));
    assert.equal(result.phase, Phase.DEAD);
    assert.ok(result.code === WHEEL_CODES.W005);
    assert.ok(result.error?.includes("boom"));
  });

  it("should produce frozen result", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec());
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.receipts));
  });

  it("should include durationMs for sealed spokes", async () => {
    const wheel = makeWheel();
    const result = await wheel.spin(makeSpec({
      execute: async () => { await new Promise((r) => setTimeout(r, 10)); return "done"; },
    }));
    assert.equal(result.phase, Phase.SEALED);
    assert.ok(typeof result.durationMs === "number");
    assert.ok(result.durationMs! >= 0);
  });

  it("should produce unique spoke IDs for different specs", async () => {
    const wheel = makeWheel();
    const r1 = await wheel.spin(makeSpec({ resource: "res:a" }));
    const r2 = await wheel.spin(makeSpec({ resource: "res:b" }));
    assert.notEqual(r1.spokeId, r2.spokeId);
  });
});
