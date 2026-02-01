// src/pep/agent-pep.ts
// Agent Policy Enforcement Point — gates AI/pipeline agent operations.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { evaluatePolicy, PDPResponse } from "../engine/policy-engine-api";

export interface AgentContext {
  agent: {
    id: string;
    kind: "pipeline" | "llm" | "service";
    name: string;
    ownerHumanId: string;
    repo?: string;
    tags: string[];
  };
  action: {
    name: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  };
  env: {
    branch?: string;
    pipelineId?: string;
    jobId?: string;
    deviceTrustLevel: "low" | "medium" | "high";
  };
}

export interface AgentPEPConfig {
  policyEngineUrl: string;
  apiKey: string;
}

export class AgentPEP {
  constructor(private config: AgentPEPConfig) {}

  async decide(ctx: AgentContext): Promise<PDPResponse> {
    return evaluatePolicy({
      principalId: ctx.agent.id,
      principalType: "agent",
      action: ctx.action.name,
      resource: `${ctx.action.targetType}:${ctx.action.targetId}`,
      tags: ctx.agent.tags,
      context: {
        ownerSupervised: false, // agent ops require explicit owner supervision
        agentKind: ctx.agent.kind,
        ownerHumanId: ctx.agent.ownerHumanId,
        branch: ctx.env.branch,
        deviceTrustLevel: ctx.env.deviceTrustLevel,
      },
    });
  }
}
