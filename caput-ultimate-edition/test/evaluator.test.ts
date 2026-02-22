// test/evaluator.test.ts
//
// Evaluator (PDP) — unit tests
//
// Run: npx tsx --test test/evaluator.test.ts
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Evaluator, EvaluationInput, EVALUATOR_CODES } from "../src/core/evaluator";
import { getDoctrine, Doctrine } from "../src/core/doctrine";

function makeInput(overrides?: Partial<EvaluationInput>): EvaluationInput {
  return {
    principalId: "owner",
    principalType: "human",
    action: "test:action",
    resource: "test:resource",
    tags: [],
    context: { mfaPassed: true, riskScore: 0, ownerSupervised: true },
    ...overrides,
  };
}

describe("Evaluator", () => {
  it("should ALLOW owner with MFA", async () => {
    const evaluator = new Evaluator(getDoctrine());
    const decision = await evaluator.evaluate(makeInput());
    assert.equal(decision.effect, "ALLOW");
  });

  it("should DENY when principalId is missing", async () => {
    const evaluator = new Evaluator(getDoctrine());
    const decision = await evaluator.evaluate(makeInput({ principalId: "" }));
    assert.equal(decision.effect, "DENY");
    assert.ok(decision.reasons.some((r) => r.code === EVALUATOR_CODES.E001));
  });

  it("should DENY unknown principal without MFA (default deny)", async () => {
    const evaluator = new Evaluator(getDoctrine());
    const decision = await evaluator.evaluate(makeInput({
      principalId: "stranger",
      context: { mfaPassed: false, riskScore: 0 },
    }));
    assert.equal(decision.effect, "DENY");
  });

  it("should DENY high risk score", async () => {
    const evaluator = new Evaluator(getDoctrine());
    const decision = await evaluator.evaluate(makeInput({
      context: { mfaPassed: true, riskScore: 90, ownerSupervised: true },
    }));
    assert.equal(decision.effect, "DENY");
  });

  it("should include doctrine version in decision", async () => {
    const evaluator = new Evaluator(getDoctrine());
    const decision = await evaluator.evaluate(makeInput());
    assert.equal(decision.doctrineVersion, getDoctrine().version);
  });

  it("should DENY when doctrine is empty", async () => {
    const emptyDoctrine: Doctrine = {
      version: "0.0.0",
      owner: "none",
      rules: [],
      defaults: { effect: "DENY", requireMfa: true, maxRiskScore: 80 },
    };
    const evaluator = new Evaluator(emptyDoctrine);
    const decision = await evaluator.evaluate(makeInput());
    assert.equal(decision.effect, "DENY");
  });
});
