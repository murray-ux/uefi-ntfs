// src/audit/audit-service.ts
// TypeScript audit service — mirrors core/audit.py for the Node.js layer.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, randomUUID } from "crypto";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { Decision } from "../core/evaluator";

export interface AuditEvent {
  eventId: string;
  ts: string;
  eventType: string;
  actorId: string;
  actorType: "human" | "agent" | "service" | "system";
  source: string;
  payload: Record<string, unknown>;
}

export interface AuditServiceConfig {
  logDir: string;
}

export class AuditService {
  private logPath: string;

  constructor(config: AuditServiceConfig) {
    if (!existsSync(config.logDir)) {
      mkdirSync(config.logDir, { recursive: true });
    }
    this.logPath = join(config.logDir, "audit.log");
  }

  private write(event: AuditEvent): void {
    const line = JSON.stringify(event) + "\n";
    appendFileSync(this.logPath, line, "utf-8");
  }

  private createEvent(
    eventType: string,
    actorId: string,
    actorType: AuditEvent["actorType"],
    source: string,
    payload: Record<string, unknown>
  ): AuditEvent {
    return {
      eventId: randomUUID(),
      ts: new Date().toISOString(),
      eventType,
      actorId,
      actorType,
      source,
      payload,
    };
  }

  async writePolicyDecision(params: {
    decision: Decision;
    principalId: string;
    resourceId: string;
    actionName: string;
    actorId: string;
    actorType: AuditEvent["actorType"];
    source: string;
  }): Promise<void> {
    const event = this.createEvent(
      "POLICY_DECISION",
      params.actorId,
      params.actorType,
      params.source,
      {
        effect: params.decision.effect,
        reasons: params.decision.reasons,
        principalId: params.principalId,
        resourceId: params.resourceId,
        actionName: params.actionName,
      }
    );
    this.write(event);
  }

  async writeLogin(params: {
    principalId: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    riskLevel: string;
    actorId: string;
    actorType: AuditEvent["actorType"];
    source: string;
  }): Promise<void> {
    const event = this.createEvent(
      params.success ? "LOGIN_SUCCESS" : "LOGIN_FAILURE",
      params.actorId,
      params.actorType,
      params.source,
      {
        principalId: params.principalId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        riskLevel: params.riskLevel,
      }
    );
    this.write(event);
  }

  async writeAgentAction(params: {
    agentId: string;
    actionName: string;
    targetType: string;
    targetId: string;
    actorId: string;
    actorType: AuditEvent["actorType"];
    source: string;
  }): Promise<void> {
    const event = this.createEvent(
      "AGENT_ACTION",
      params.actorId,
      params.actorType,
      params.source,
      {
        agentId: params.agentId,
        actionName: params.actionName,
        targetType: params.targetType,
        targetId: params.targetId,
      }
    );
    this.write(event);
  }

  async writeOverride(params: {
    overrideKeyId: string;
    originalEffect: string;
    newEffect: string;
    reason: string;
    actorId: string;
    source: string;
  }): Promise<void> {
    const event = this.createEvent(
      "OWNER_OVERRIDE",
      params.actorId,
      "human",
      params.source,
      {
        overrideKeyId: params.overrideKeyId,
        originalEffect: params.originalEffect,
        newEffect: params.newEffect,
        reason: params.reason,
      }
    );
    this.write(event);
  }
}
