// src/ci/ci-policy-check.ts
// CI pipeline policy gate — runs all checks, exits non-zero on failure.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Doctrine, loadDoctrine } from "../core/doctrine";
import { Evaluator, EvidencePack } from "../core/evaluator";

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

function checkDefaultDeny(evaluator: Evaluator): CheckResult {
  const empty: EvidencePack = {
    host: { hostname: "ci-test", os: "linux", secureBootEnabled: false },
    identity: { userId: "ci-bot", mfaVerified: false, roles: [], riskScore: 0 },
    agent: { agentId: "ci-bot", agentType: "pipeline", scope: [] },
    action: "ci-test-action",
    resource: "ci-test-resource",
  };
  const decision = evaluator.evaluate(empty);
  const denied = decision.effect === "DENY";
  return {
    name: "default-deny",
    passed: denied,
    message: denied
      ? "Empty evidence correctly denied"
      : `Expected DENY, got ${decision.effect}`,
  };
}

export function runAllChecks(): CheckResult[] {
  const doctrine = loadDoctrine();
  const evaluator = new Evaluator(doctrine);

  return [
    checkDoctrineLoads(doctrine),
    checkDefaultDeny(evaluator),
  ];
}

// CLI entry
if (require.main === module) {
  const results = runAllChecks();
  let failed = false;
  for (const r of results) {
    const icon = r.passed ? "PASS" : "FAIL";
    console.log(`[${icon}] ${r.name}: ${r.message}`);
    if (!r.passed) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
