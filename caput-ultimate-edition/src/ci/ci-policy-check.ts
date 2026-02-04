// src/ci/ci-policy-check.ts
// CI pipeline policy gate — runs all checks, exits non-zero on failure.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Doctrine, getDoctrine } from "../core/doctrine";
import { Evaluator, EvaluationInput } from "../core/evaluator";

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

function checkDoctrineLoads(doctrine: Doctrine): CheckResult {
  const hasRules = doctrine.rules.length > 0;
  return {
    name: "doctrine-loads",
    passed: hasRules,
    message: hasRules
      ? `${doctrine.rules.length} rules loaded`
      : "No rules in doctrine",
  };
}

async function checkDefaultDeny(evaluator: Evaluator): Promise<CheckResult> {
  const empty: EvaluationInput = {
    principalId: "ci-bot",
    principalType: "agent",
    action: "ci-test-action",
    resource: "ci-test-resource",
    tags: [],
    context: {
      mfaPassed: false,
      riskScore: 0,
    },
  };
  const decision = await evaluator.evaluate(empty);
  const denied = decision.effect === "DENY";
  return {
    name: "default-deny",
    passed: denied,
    message: denied
      ? "Empty evidence correctly denied"
      : `Expected DENY, got ${decision.effect}`,
  };
}

export async function runAllChecks(): Promise<CheckResult[]> {
  const doctrine = getDoctrine();
  const evaluator = new Evaluator(doctrine);

  return [
    checkDoctrineLoads(doctrine),
    await checkDefaultDeny(evaluator),
  ];
}

// CLI entry
if (require.main === module) {
  runAllChecks().then((results) => {
    let failed = false;
    for (const r of results) {
      const icon = r.passed ? "PASS" : "FAIL";
      console.log(`[${icon}] ${r.name}: ${r.message}`);
      if (!r.passed) failed = true;
    }
    process.exit(failed ? 1 : 0);
  });
}
