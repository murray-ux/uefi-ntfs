// src/core/evaluator.ts
//
// EVALUATOR — Policy Decision Point (PDP)
//
// Charter §3.2: Stateless. Receives EvaluationInput, returns Decision.
// No side effects except audit logging. Evaluator must never modify state.
//
// Decision logic (ordered, first match wins):
//   1. Check explicit DENY rules. If match → DENY.
//   2. Check explicit ALLOW rules. If match → ALLOW.
//   3. No match → DENY (Axiom A2: default DENY).
//
// Failure codes:
//   E-001  Incomplete evaluation input
//   E-002  Doctrine not loaded
//   E-003  Evaluation threw (treated as DENY)
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Doctrine, DoctrineRule, getDoctrine } from "./doctrine";

// ---------------------------------------------------------------------------
// Failure codes (Charter §3.2)
// ---------------------------------------------------------------------------

export const EVALUATOR_CODES = {
  E001: "E-001", // Incomplete evaluation input
  E002: "E-002", // Doctrine not loaded
  E003: "E-003", // Evaluation threw
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvaluationInput {
  principalId: string;
  principalType: "human" | "agent" | "service";
  action: string;
  resource: string;
  tags: string[];
  context: Record<string, unknown>;
}

export interface Reason {
  ruleId: string;
  code?: string;
  message: string;
}

export interface Decision {
  effect: "ALLOW" | "DENY" | "CHALLENGE";
  reasons: Reason[];
  evaluatedAt: string;
  doctrineVersion: string;
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export class Evaluator {
  private doctrine: Doctrine;

  constructor(doctrine?: Doctrine) {
    this.doctrine = doctrine || getDoctrine();
  }

  async evaluate(input: EvaluationInput): Promise<Decision> {
    // Charter §3.2 Gate: Input must contain principalId, resource, action.
    const missing: string[] = [];
    if (!input.principalId) missing.push("principalId");
    if (!input.resource) missing.push("resource");
    if (!input.action) missing.push("action");

    if (missing.length > 0) {
      return {
        effect: "DENY",
        reasons: [{
          ruleId: "input-validation",
          code: EVALUATOR_CODES.E001,
          message: `Incomplete input: missing ${missing.join(", ")}`,
        }],
        evaluatedAt: new Date().toISOString(),
        doctrineVersion: this.doctrine?.version || "unknown",
      };
    }

    if (!this.doctrine || !this.doctrine.rules) {
      return {
        effect: "DENY",
        reasons: [{
          ruleId: "doctrine-check",
          code: EVALUATOR_CODES.E002,
          message: "Doctrine not loaded",
        }],
        evaluatedAt: new Date().toISOString(),
        doctrineVersion: "none",
      };
    }

    try {
      return this._evaluate(input);
    } catch (err: unknown) {
      // Charter §3.2: Evaluation threw → treated as DENY
      return {
        effect: "DENY",
        reasons: [{
          ruleId: "evaluation-error",
          code: EVALUATOR_CODES.E003,
          message: `Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
        }],
        evaluatedAt: new Date().toISOString(),
        doctrineVersion: this.doctrine.version,
      };
    }
  }

  private _evaluate(input: EvaluationInput): Decision {
    const matchedRules = this.matchRules(input);

    // Sort by priority (lower = higher priority)
    matchedRules.sort((a, b) => a.priority - b.priority);

    // Charter §3.2: Check DENY rules first, then ALLOW, then default DENY
    const denyRules = matchedRules.filter((r) => r.effect === "DENY");
    if (denyRules.length > 0) {
      const rule = denyRules[0];
      return {
        effect: "DENY",
        reasons: [{ ruleId: rule.id, message: rule.description }],
        evaluatedAt: new Date().toISOString(),
        doctrineVersion: this.doctrine.version,
      };
    }

    const allowRules = matchedRules.filter((r) => r.effect === "ALLOW");
    if (allowRules.length > 0) {
      const rule = allowRules[0];
      return {
        effect: "ALLOW",
        reasons: [{ ruleId: rule.id, message: rule.description }],
        evaluatedAt: new Date().toISOString(),
        doctrineVersion: this.doctrine.version,
      };
    }

    const challengeRules = matchedRules.filter((r) => r.effect === "CHALLENGE");
    if (challengeRules.length > 0) {
      const rule = challengeRules[0];
      return {
        effect: "CHALLENGE",
        reasons: [{ ruleId: rule.id, message: rule.description }],
        evaluatedAt: new Date().toISOString(),
        doctrineVersion: this.doctrine.version,
      };
    }

    // Axiom A2: No match → DENY
    return {
      effect: this.doctrine.defaults.effect,
      reasons: [{
        ruleId: "default",
        message: "No matching rule; default deny (Axiom A2: fail-closed)",
      }],
      evaluatedAt: new Date().toISOString(),
      doctrineVersion: this.doctrine.version,
    };
  }

  private matchRules(input: EvaluationInput): DoctrineRule[] {
    return this.doctrine.rules.filter((rule) => {
      const cond = rule.conditions;

      if (cond.principalId && cond.principalId !== input.principalId) return false;
      if (cond.actorType && cond.actorType !== input.principalType) return false;
      if (cond.action && cond.action !== input.action) return false;

      if (cond.mfaPassed !== undefined && cond.mfaPassed !== input.context.mfaPassed) return false;

      if (cond.riskScoreAbove !== undefined) {
        const score = (input.context.riskScore as number) ?? 0;
        if (score <= (cond.riskScoreAbove as number)) return false;
      }

      if (cond.riskScoreBelow !== undefined) {
        const score = (input.context.riskScore as number) ?? 0;
        if (score >= (cond.riskScoreBelow as number)) return false;
      }

      if (cond.ownerSupervised !== undefined) {
        if (cond.ownerSupervised !== input.context.ownerSupervised) return false;
      }

      if (cond.tags) {
        const requiredTags = cond.tags as string[];
        const hasMatch = requiredTags.some((t) => input.tags.includes(t));
        if (!hasMatch) return false;
      }

      return true;
    });
  }
}
