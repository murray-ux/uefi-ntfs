// src/pep/identity-pep.ts
// Identity Policy Enforcement Point — gates login and identity actions.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { evaluatePolicy, PDPResponse } from "../engine/policy-engine-api";

export interface IdentityContext {
  userId: string;
  username: string;
  email: string;
  groups: string[];
  mfaEnabled: boolean;
  mfaPassed: boolean;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  ipAddress: string;
  userAgent: string;
  deviceTrustLevel: "low" | "medium" | "high";
}

export interface IdentityAction {
  type: "login" | "token_refresh" | "scope_escalation" | "mfa_challenge";
  targetApp: string;
  requestedScopes: string[];
  requestedGroups: string[];
}

export interface IdentityPEPConfig {
  policyEngineUrl: string;
  apiKey: string;
}

export class IdentityPEP {
  constructor(private config: IdentityPEPConfig) {}

  async decide(ctx: IdentityContext, action: IdentityAction): Promise<PDPResponse> {
    return evaluatePolicy({
      principalId: ctx.userId,
      principalType: "human",
      action: action.type,
      resource: action.targetApp,
      tags: ctx.groups,
      context: {
        mfaPassed: ctx.mfaPassed,
        riskScore: ctx.riskScore,
        riskLevel: ctx.riskLevel,
        ipAddress: ctx.ipAddress,
        deviceTrustLevel: ctx.deviceTrustLevel,
        requestedScopes: action.requestedScopes,
      },
    });
  }
}
