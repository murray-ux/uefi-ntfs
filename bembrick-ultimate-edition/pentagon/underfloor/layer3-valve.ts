// pentagon/underfloor/layer3-valve.ts
//
// LAYER 3 — VALVE
//
// Policy enforcement, circuit breakers, rate limiters, and admission
// control. The Valve decides what gets through and what gets rejected.
// Every request from the facets passes through at least one Valve
// before reaching execution.
//
// Three mechanisms:
//   GATE    — Binary allow/deny based on policy evaluation
//   BREAKER — Circuit breaker: closed → open → half-open → closed
//   LIMITER — Token-bucket rate limiter per principal
//
// The Valve consumes Kernel for hashing/timing, Conduit for signalling,
// and Reservoir for persisting breaker/limiter state.
//
// From outside: invisible. Pentagon consumers just get "allowed" or "denied".
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "./layer0-kernel";
import { Reservoir } from "./layer2-reservoir";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValveVerdict = "ALLOW" | "DENY" | "THROTTLE" | "CIRCUIT_OPEN";

export interface ValveRequest {
  principalId: string;
  action: string;
  resource: string;
  context: Record<string, unknown>;
}

export interface ValveDecision {
  readonly verdict: ValveVerdict;
  readonly reason: string;
  readonly decidedAt: Timestamp;
  readonly requestHash: string;
  readonly gateResult: GateResult;
  readonly breakerState: BreakerState;
  readonly limiterRemaining: number;
}

// ── Gate ──────────────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  effect: "allow" | "deny";
  conditions: {
    principals?: string[];         // whitelist; empty = any
    actions?: string[];            // glob patterns
    resources?: string[];          // glob patterns
    requireMfa?: boolean;
    maxRiskScore?: number;
  };
  priority: number;
}

export interface GateResult {
  effect: "allow" | "deny";
  matchedRule: string | null;
  evaluated: number;
}

// ── Circuit Breaker ──────────────────────────────────────────────────

export type BreakerPhase = "closed" | "open" | "half-open";

export interface BreakerState {
  phase: BreakerPhase;
  failures: number;
  lastFailure: Timestamp | null;
  lastSuccess: Timestamp | null;
  tripThreshold: number;
  cooldownMs: number;
}

// ── Rate Limiter ─────────────────────────────────────────────────────

interface TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number;        // tokens per second
  lastRefill: number;        // epochMs
}

// ---------------------------------------------------------------------------
// Valve
// ---------------------------------------------------------------------------

export class Valve {
  private readonly kernel: Kernel;
  private readonly reservoir: Reservoir;
  private readonly rules: PolicyRule[];
  private readonly breakers = new Map<string, BreakerState>();
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly defaultBucketCapacity: number;
  private readonly defaultRefillRate: number;
  private readonly breakerThreshold: number;
  private readonly breakerCooldownMs: number;

  constructor(
    kernel: Kernel,
    reservoir: Reservoir,
    rules: PolicyRule[],
    opts?: {
      bucketCapacity?: number;
      refillRate?: number;
      breakerThreshold?: number;
      breakerCooldownMs?: number;
    },
  ) {
    this.kernel = kernel;
    this.reservoir = reservoir;
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
    this.defaultBucketCapacity = opts?.bucketCapacity ?? 100;
    this.defaultRefillRate = opts?.refillRate ?? 10;
    this.breakerThreshold = opts?.breakerThreshold ?? 5;
    this.breakerCooldownMs = opts?.breakerCooldownMs ?? 30000;
  }

  // ── Main entry point ───────────────────────────────────────────────────

  evaluate(request: ValveRequest): ValveDecision {
    const ts = this.kernel.now();
    const requestHash = this.kernel.hash(JSON.stringify(request)).hex.slice(0, 24);

    // 1. Circuit breaker check
    const breakerKey = `${request.principalId}:${request.action}`;
    const breaker = this.getBreaker(breakerKey);

    if (breaker.phase === "open") {
      // Check if cooldown has elapsed
      if (breaker.lastFailure && ts.epochMs - breaker.lastFailure.epochMs >= breaker.cooldownMs) {
        breaker.phase = "half-open";
      } else {
        return this.freeze({
          verdict: "CIRCUIT_OPEN",
          reason: `Circuit breaker open for ${breakerKey} — ${breaker.failures} failures`,
          decidedAt: ts,
          requestHash,
          gateResult: { effect: "deny", matchedRule: null, evaluated: 0 },
          breakerState: { ...breaker },
          limiterRemaining: 0,
        });
      }
    }

    // 2. Rate limiter check
    const bucket = this.getBucket(request.principalId);
    this.refillBucket(bucket, ts.epochMs);

    if (bucket.tokens < 1) {
      return this.freeze({
        verdict: "THROTTLE",
        reason: `Rate limit exceeded for ${request.principalId}`,
        decidedAt: ts,
        requestHash,
        gateResult: { effect: "deny", matchedRule: null, evaluated: 0 },
        breakerState: { ...breaker },
        limiterRemaining: 0,
      });
    }

    // 3. Policy gate evaluation
    const gate = this.evaluateGate(request);

    if (gate.effect === "deny") {
      this.recordFailure(breakerKey);
      return this.freeze({
        verdict: "DENY",
        reason: gate.matchedRule
          ? `Denied by rule ${gate.matchedRule}`
          : `Default deny — no matching allow rule`,
        decidedAt: ts,
        requestHash,
        gateResult: gate,
        breakerState: { ...this.getBreaker(breakerKey) },
        limiterRemaining: bucket.tokens,
      });
    }

    // Consume a token
    bucket.tokens -= 1;

    // Record success
    this.recordSuccess(breakerKey);

    return this.freeze({
      verdict: "ALLOW",
      reason: gate.matchedRule ? `Allowed by rule ${gate.matchedRule}` : "Default allow",
      decidedAt: ts,
      requestHash,
      gateResult: gate,
      breakerState: { ...this.getBreaker(breakerKey) },
      limiterRemaining: bucket.tokens,
    });
  }

  // ── Gate evaluation ────────────────────────────────────────────────────

  private evaluateGate(request: ValveRequest): GateResult {
    let evaluated = 0;

    for (const rule of this.rules) {
      evaluated++;

      // Check principal match
      if (rule.conditions.principals && rule.conditions.principals.length > 0) {
        if (!rule.conditions.principals.includes(request.principalId)) continue;
      }

      // Check action match (simple glob: * matches anything)
      if (rule.conditions.actions && rule.conditions.actions.length > 0) {
        const matches = rule.conditions.actions.some((pattern) =>
          pattern === "*" || request.action === pattern || request.action.startsWith(pattern.replace("*", "")),
        );
        if (!matches) continue;
      }

      // Check resource match
      if (rule.conditions.resources && rule.conditions.resources.length > 0) {
        const matches = rule.conditions.resources.some((pattern) =>
          pattern === "*" || request.resource === pattern || request.resource.startsWith(pattern.replace("*", "")),
        );
        if (!matches) continue;
      }

      // Check MFA requirement
      if (rule.conditions.requireMfa && !request.context.mfaPassed) continue;

      // Check risk score
      if (rule.conditions.maxRiskScore !== undefined) {
        const risk = (request.context.riskScore as number) ?? 0;
        if (risk > rule.conditions.maxRiskScore) continue;
      }

      // Rule matched
      return { effect: rule.effect, matchedRule: rule.id, evaluated };
    }

    // Default deny
    return { effect: "deny", matchedRule: null, evaluated };
  }

  // ── Circuit breaker management ─────────────────────────────────────────

  private getBreaker(key: string): BreakerState {
    let b = this.breakers.get(key);
    if (!b) {
      b = {
        phase: "closed",
        failures: 0,
        lastFailure: null,
        lastSuccess: null,
        tripThreshold: this.breakerThreshold,
        cooldownMs: this.breakerCooldownMs,
      };
      this.breakers.set(key, b);
    }
    return b;
  }

  private recordFailure(key: string): void {
    const b = this.getBreaker(key);
    b.failures++;
    b.lastFailure = this.kernel.now();
    if (b.failures >= b.tripThreshold) {
      b.phase = "open";
    }
  }

  private recordSuccess(key: string): void {
    const b = this.getBreaker(key);
    b.lastSuccess = this.kernel.now();
    if (b.phase === "half-open") {
      b.phase = "closed";
      b.failures = 0;
    }
  }

  // ── Rate limiter management ────────────────────────────────────────────

  private getBucket(principalId: string): TokenBucket {
    let bucket = this.buckets.get(principalId);
    if (!bucket) {
      bucket = {
        tokens: this.defaultBucketCapacity,
        capacity: this.defaultBucketCapacity,
        refillRate: this.defaultRefillRate,
        lastRefill: Date.now(),
      };
      this.buckets.set(principalId, bucket);
    }
    return bucket;
  }

  private refillBucket(bucket: TokenBucket, nowMs: number): void {
    const elapsed = (nowMs - bucket.lastRefill) / 1000;
    const newTokens = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + newTokens);
    bucket.lastRefill = nowMs;
  }

  // ── Utility ────────────────────────────────────────────────────────────

  private freeze(decision: ValveDecision): ValveDecision {
    return Object.freeze(decision);
  }

  // ── Diagnostics ────────────────────────────────────────────────────────

  breakerStates(): Record<string, BreakerState> {
    const result: Record<string, BreakerState> = {};
    for (const [key, state] of this.breakers) {
      result[key] = { ...state };
    }
    return result;
  }

  limiterStates(): Record<string, { tokens: number; capacity: number }> {
    const result: Record<string, { tokens: number; capacity: number }> = {};
    for (const [key, bucket] of this.buckets) {
      result[key] = { tokens: Math.floor(bucket.tokens), capacity: bucket.capacity };
    }
    return result;
  }
}
