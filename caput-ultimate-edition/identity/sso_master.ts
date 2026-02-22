// identity/sso_master.ts
//
// GENESIS SSO — JWT-based identity with Evaluator-backed authorization.
//
// authenticate() validates a JWT, extracts identity claims.
// authorise() builds an EvaluationInput and asks the Evaluator.
// issueToken() creates a signed JWT for authenticated sessions.
//
// No external IdP calls — this is the internal identity layer.
// External IdP integration (Google, Azure, Bitwarden) happens at the
// gateway and feeds claims into this layer via JWT.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHmac, randomUUID } from "crypto";
import { Evaluator, EvaluationInput } from "../src/core/evaluator";
import { AuditService } from "../src/audit/audit-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdentityProvider = "bitwarden" | "google" | "azure" | "local";

export interface Identity {
  subjectId: string;
  email: string;
  roles: string[];
  mfa: boolean;
  provider: IdentityProvider;
  issuedAt: number;
  expiresAt: number;
}

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  mfa: boolean;
  provider: IdentityProvider;
  iat: number;
  exp: number;
  jti: string;
}

export interface SSOConfig {
  jwtSecret: string;          // HMAC-SHA256 signing key (from env var)
  tokenTtlSeconds: number;    // Default: 3600 (1 hour)
  evaluator: Evaluator;
  audit: AuditService;
}

// ---------------------------------------------------------------------------
// JWT helpers — minimal, no external deps
// ---------------------------------------------------------------------------

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf.toString("base64url");
}

function decodeBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function hmacSign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

// ---------------------------------------------------------------------------
// GenesisSSO
// ---------------------------------------------------------------------------

export class GenesisSSO {
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
  }

  // Issue a signed JWT for an authenticated identity
  issueToken(identity: {
    subjectId: string;
    email: string;
    roles: string[];
    mfa: boolean;
    provider: IdentityProvider;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      sub: identity.subjectId,
      email: identity.email,
      roles: identity.roles,
      mfa: identity.mfa,
      provider: identity.provider,
      iat: now,
      exp: now + this.config.tokenTtlSeconds,
      jti: randomUUID(),
    };

    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = base64url(JSON.stringify(payload));
    const sig = hmacSign(`${header}.${body}`, this.config.jwtSecret);

    return `${header}.${body}.${sig}`;
  }

  // Validate a JWT and return the identity
  async authenticate(token: string): Promise<Identity> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("SSO: Malformed token");
    }

    const [header, body, sig] = parts;

    // Verify HMAC signature
    const expectedSig = hmacSign(`${header}.${body}`, this.config.jwtSecret);
    if (sig !== expectedSig) {
      await this.config.audit.writeLogin({
        principalId: "unknown",
        ipAddress: "unknown",
        userAgent: "unknown",
        success: false,
        riskLevel: "high",
        actorId: "sso",
        actorType: "service",
        source: "sso-authenticate",
      });
      throw new Error("SSO: Invalid signature");
    }

    // Decode payload
    const payload: TokenPayload = JSON.parse(decodeBase64url(body));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error("SSO: Token expired");
    }

    const identity: Identity = {
      subjectId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      mfa: payload.mfa,
      provider: payload.provider,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };

    // Audit successful auth
    await this.config.audit.writeLogin({
      principalId: identity.subjectId,
      ipAddress: "internal",
      userAgent: "genesis-sso",
      success: true,
      riskLevel: identity.mfa ? "low" : "medium",
      actorId: identity.subjectId,
      actorType: "human",
      source: "sso-authenticate",
    });

    return identity;
  }

  // Authorize an action by feeding the Evaluator
  async authorise(
    identity: Identity,
    resource: string,
    action: string,
    tags: string[] = [],
  ): Promise<boolean> {
    const input: EvaluationInput = {
      principalId: identity.subjectId,
      principalType: "human",
      action,
      resource,
      tags: [...identity.roles, ...tags],
      context: {
        mfaPassed: identity.mfa,
        riskScore: identity.mfa ? 10 : 60,
        email: identity.email,
        provider: identity.provider,
      },
    };

    const decision = await this.config.evaluator.evaluate(input);

    // Audit the decision
    await this.config.audit.writePolicyDecision({
      decision,
      principalId: identity.subjectId,
      resourceId: resource,
      actionName: action,
      actorId: identity.subjectId,
      actorType: "human",
      source: "sso-authorise",
    });

    return decision.effect === "ALLOW";
  }
}
