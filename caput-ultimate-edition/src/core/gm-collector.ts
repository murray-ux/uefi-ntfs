// src/core/gm-collector.ts
// Evidence collector — PEPs and services use this to build EvidencePack.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

export interface HostEvidence {
  executablePath: string;
  cwd: string;
  args: string[];
  env?: Record<string, string | undefined>;
}

export interface IdentityEvidence {
  userId: string;
  email: string;
  groups: string[];
  mfaPassed: boolean;
  riskScore: number;
}

export interface AgentEvidence {
  agentId: string;
  kind: "pipeline" | "llm" | "service";
  ownerHumanId: string;
  repo?: string;
  tags: string[];
}

export interface EvidencePack {
  collectedAt: string;
  host?: HostEvidence;
  identity?: IdentityEvidence;
  agent?: AgentEvidence;
}

export interface CollectInput {
  host?: Partial<HostEvidence>;
  identity?: Partial<IdentityEvidence>;
  agent?: Partial<AgentEvidence>;
}

export class GMCollector {
  async collect(input: CollectInput): Promise<EvidencePack> {
    const pack: EvidencePack = {
      collectedAt: new Date().toISOString(),
    };

    if (input.host) {
      pack.host = {
        executablePath: input.host.executablePath ?? "unknown",
        cwd: input.host.cwd ?? process.cwd(),
        args: input.host.args ?? [],
        env: input.host.env,
      };
    }

    if (input.identity) {
      pack.identity = {
        userId: input.identity.userId ?? "unknown",
        email: input.identity.email ?? "unknown",
        groups: input.identity.groups ?? [],
        mfaPassed: input.identity.mfaPassed ?? false,
        riskScore: input.identity.riskScore ?? 100,
      };
    }

    if (input.agent) {
      pack.agent = {
        agentId: input.agent.agentId ?? "unknown",
        kind: input.agent.kind ?? "service",
        ownerHumanId: input.agent.ownerHumanId ?? "unknown",
        repo: input.agent.repo,
        tags: input.agent.tags ?? [],
      };
    }

    return pack;
  }
}
