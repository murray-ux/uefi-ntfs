// src/override/owner-override.ts
// Owner break-glass override — always audited, always logged.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash } from "crypto";
import { Decision } from "../core/evaluator";
import { AuditService } from "../audit/audit-service";

export interface OverrideKey {
  id: string;
  ownerId: string;
  label: string;
  hash: string; // SHA-256 of the secret
  createdAt: string;
  expiresAt: string | undefined;
  active: boolean;
}

export interface OverrideAttempt {
  actorId: string;
  actorType: "human";
  overrideKeyId: string;
  overrideSecret: string;
  reason: string;
  desiredEffect: Decision["effect"];
  originalDecision: Decision;
}

export interface OverrideResult {
  allowed: boolean;
  decision: Decision;
}

export interface OwnerOverrideConfig {
  ownerId: string;
  overrideKeys: OverrideKey[];
  audit: AuditService;
}

export class OwnerOverrideService {
  private config: OwnerOverrideConfig;

  constructor(config: OwnerOverrideConfig) {
    this.config = config;
  }

  async attemptOverride(attempt: OverrideAttempt): Promise<OverrideResult> {
    // Only owner can override
    if (attempt.actorId !== this.config.ownerId) {
      return { allowed: false, decision: attempt.originalDecision };
    }

    // Find the key
    const key = this.config.overrideKeys.find(
      (k) => k.id === attempt.overrideKeyId && k.active
    );
    if (!key) {
      return { allowed: false, decision: attempt.originalDecision };
    }

    // Check expiry
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return { allowed: false, decision: attempt.originalDecision };
    }

    // Verify secret
    const secretHash = createHash("sha256")
      .update(attempt.overrideSecret)
      .digest("hex");
    if (secretHash !== key.hash) {
      return { allowed: false, decision: attempt.originalDecision };
    }

    // Override granted — build new decision
    const overriddenDecision: Decision = {
      effect: attempt.desiredEffect,
      reasons: [
        ...attempt.originalDecision.reasons,
        {
          ruleId: "owner-override",
          message: `Owner override applied: ${attempt.reason}`,
        },
      ],
      evaluatedAt: new Date().toISOString(),
      doctrineVersion: attempt.originalDecision.doctrineVersion,
    };

    // Always audit
    await this.config.audit.writeOverride({
      overrideKeyId: attempt.overrideKeyId,
      originalEffect: attempt.originalDecision.effect,
      newEffect: attempt.desiredEffect,
      reason: attempt.reason,
      actorId: attempt.actorId,
      source: "owner-override",
    });

    return { allowed: true, decision: overriddenDecision };
  }
}
