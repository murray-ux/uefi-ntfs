// src/pep/host-pep.ts
// Host Policy Enforcement Point — gates process execution.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { evaluatePolicy, PDPResponse } from "../engine/policy-engine-api";

export interface HostPEPConfig {
  policyEngineUrl: string;
  apiKey: string;
}

export interface ProcessDecisionInput {
  principalId: string;
  principalType: "human" | "agent" | "service";
  executablePath: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  tags: string[];
}

export class HostPEP {
  constructor(private config: HostPEPConfig) {}

  async decideForProcess(input: ProcessDecisionInput): Promise<PDPResponse> {
    return evaluatePolicy({
      principalId: input.principalId,
      principalType: input.principalType,
      action: "execute",
      resource: input.executablePath,
      tags: input.tags,
      context: {
        cwd: input.cwd,
        args: input.args,
        mfaPassed: true, // host context assumes local auth
      },
    });
  }
}
