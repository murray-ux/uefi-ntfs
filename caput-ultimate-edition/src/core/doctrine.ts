// src/core/doctrine.ts
// All policy lives here. Evaluator consumes doctrine; nothing else defines policy.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

export interface DoctrineRule {
  id: string;
  description: string;
  effect: "ALLOW" | "DENY" | "CHALLENGE";
  conditions: Record<string, unknown>;
  priority: number;
  tags: string[];
}

export interface Doctrine {
  version: string;
  owner: string;
  rules: DoctrineRule[];
  defaults: {
    effect: "DENY"; // fail-closed
    requireMfa: boolean;
    maxRiskScore: number;
  };
}

const doctrine: Doctrine = {
  version: "1.0.0",
  owner: "owner",
  rules: [
    {
      id: "owner-full-access",
      description: "Owner has full access when MFA is passed",
      effect: "ALLOW",
      conditions: { principalId: "owner", mfaPassed: true },
      priority: 0,
      tags: ["owner"],
    },
    {
      id: "deny-high-risk",
      description: "Deny any request with risk score above threshold",
      effect: "DENY",
      conditions: { riskScoreAbove: 80 },
      priority: 10,
      tags: ["risk"],
    },
    {
      id: "challenge-medium-risk",
      description: "Challenge requests with moderate risk",
      effect: "CHALLENGE",
      conditions: { riskScoreAbove: 40, riskScoreBelow: 80 },
      priority: 20,
      tags: ["risk"],
    },
    {
      id: "deny-no-mfa-privileged",
      description: "Deny privileged actions without MFA",
      effect: "DENY",
      conditions: { mfaPassed: false, tags: ["elevated", "admin", "write"] },
      priority: 5,
      tags: ["mfa"],
    },
    {
      id: "agent-write-requires-owner",
      description: "Agent write operations require owner as supervisor",
      effect: "DENY",
      conditions: { actorType: "agent", action: "write", ownerSupervised: false },
      priority: 5,
      tags: ["agent"],
    },
  ],
  defaults: {
    effect: "DENY",
    requireMfa: true,
    maxRiskScore: 80,
  },
};

export function getDoctrine(): Doctrine {
  return doctrine;
}

export { doctrine };
