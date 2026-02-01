// src/wheel/wheel-orchestrator.ts
//
// THE WHEEL — Charter §3.1
//
// Lifecycle governance. Every operation is a spoke. The Wheel is a
// persistent machine — create it once, spin it many times.
//
// Design:
//   - The executor travels WITH the spoke spec, not in the constructor.
//   - Evidence is derived FROM the spec, not passed separately.
//   - Attestation verifies the receipt chain, not regex patterns.
//   - Every audit event carries full spoke context.
//   - Every failure carries a charter failure code.
//
// Failure codes (Charter §3.1):
//   W-001  Illegal state transition
//   W-002  Evaluator returned DENY
//   W-003  Attestation failed (receipt chain integrity broken)
//   W-004  Deadline exceeded
//   W-005  Execute function threw
//   W-006  Audit write failed
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash } from "crypto";
import { Evaluator, EvaluationInput, Decision } from "../core/evaluator";
import { AuditService } from "../audit/audit-service";

// ---------------------------------------------------------------------------
// Failure codes
// ---------------------------------------------------------------------------

export const WHEEL_CODES = {
  W001: "W-001",
  W002: "W-002",
  W003: "W-003",
  W004: "W-004",
  W005: "W-005",
  W006: "W-006",
} as const;

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

export enum Phase {
  BORN      = "BORN",
  GATED     = "GATED",
  ATTESTED  = "ATTESTED",
  EXECUTING = "EXECUTING",
  SEALED    = "SEALED",
  DEAD      = "DEAD",
}

const LEGAL: ReadonlyMap<Phase, ReadonlySet<Phase>> = new Map([
  [Phase.BORN,      new Set([Phase.GATED])],
  [Phase.GATED,     new Set([Phase.ATTESTED, Phase.DEAD])],
  [Phase.ATTESTED,  new Set([Phase.EXECUTING, Phase.DEAD])],
  [Phase.EXECUTING, new Set([Phase.SEALED, Phase.DEAD])],
]);

function isTerminal(p: Phase): boolean {
  return p === Phase.SEALED || p === Phase.DEAD;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Everything the Wheel needs. The executor is here, not in the constructor. */
export interface SpokeSpec {
  /** Who is requesting this. Maps to EvaluationInput.principalId. */
  principalId: string;
  /** What they want to do. Maps to EvaluationInput.action. */
  action: string;
  /** What they want to do it to. Maps to EvaluationInput.resource. */
  resource: string;
  /** Context for the evaluator (MFA, risk score, supervision, etc). */
  context?: Record<string, unknown>;
  /** Hard deadline in ms. Overrun = W-004. Non-negotiable. */
  deadlineMs: number;
  /** The work. Wheel doesn't know what this does. */
  execute: () => Promise<unknown>;
}

export interface PhaseReceipt {
  phase: Phase;
  code: string | null;
  ts: string;
  hash: string;
  detail: string;
}

export interface WheelResult {
  spokeId: string;
  phase: Phase;
  decision: Decision | null;
  output: unknown;
  error: string | null;
  code: string | null;
  durationMs: number | null;
  receipts: ReadonlyArray<PhaseReceipt>;
}

// ---------------------------------------------------------------------------
// Internal spoke
// ---------------------------------------------------------------------------

interface Spoke {
  spokeId: string;
  spec: SpokeSpec;
  createdAt: string;
  phase: Phase;
  decision: Decision | null;
  receipts: PhaseReceipt[];
  output: unknown;
  error: string | null;
  code: string | null;
  durationMs: number | null;
}

// ---------------------------------------------------------------------------
// Wheel
// ---------------------------------------------------------------------------

export class Wheel {
  private readonly hub: Evaluator;
  private readonly rim: AuditService;

  constructor(hub: Evaluator, rim: AuditService) {
    this.hub = hub;
    this.rim = rim;
  }

  /**
   * spin() — the only public method.
   *
   * One spec in, one result out. Create the Wheel once, call spin() for
   * every operation. The executor is in the spec, not in the Wheel.
   */
  async spin(spec: SpokeSpec): Promise<WheelResult> {
    const spoke = this.birth(spec);

    try {
      // ── GATE ──────────────────────────────────────────────────
      // Derive evidence from the spec. One source of truth.
      this.advance(spoke, Phase.GATED, null, "Policy evaluation");

      const evidence: EvaluationInput = {
        principalId: spec.principalId,
        principalType: "human",
        action: spec.action,
        resource: spec.resource,
        tags: [],
        context: spec.context || {},
      };

      spoke.decision = await this.hub.evaluate(evidence);
      await this.audit(spoke, "SPOKE_GATED");

      if (spoke.decision.effect !== "ALLOW") {
        return this.kill(spoke, WHEEL_CODES.W002,
          `DENY: ${spoke.decision.reasons.map(r => r.message).join("; ")}`
        );
      }

      // ── ATTEST ────────────────────────────────────────────────
      // Verify the receipt chain built so far. If the chain is
      // corrupt, something has modified the spoke in memory.
      // This is real attestation: proving internal integrity.
      this.advance(spoke, Phase.ATTESTED, null, "Receipt chain intact");

      if (!this.verifyChain(spoke)) {
        return this.kill(spoke, WHEEL_CODES.W003,
          "Receipt chain integrity broken — attestation failed"
        );
      }
      await this.audit(spoke, "SPOKE_ATTESTED");

      // ── EXECUTE ───────────────────────────────────────────────
      this.advance(spoke, Phase.EXECUTING, null, `Deadline: ${spec.deadlineMs}ms`);
      await this.audit(spoke, "SPOKE_EXECUTING");

      const t0 = Date.now();
      spoke.output = await this.race(spec.execute(), spec.deadlineMs, spoke.spokeId);
      spoke.durationMs = Date.now() - t0;

      // ── SEAL ──────────────────────────────────────────────────
      this.advance(spoke, Phase.SEALED, null, `Completed in ${spoke.durationMs}ms`);
      await this.audit(spoke, "SPOKE_SEALED");
      return this.freeze(spoke);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = msg.includes(WHEEL_CODES.W004) ? WHEEL_CODES.W004 : WHEEL_CODES.W005;
      return this.kill(spoke, code, msg);
    }
  }

  // =========================================================================
  // Internals
  // =========================================================================

  private birth(spec: SpokeSpec): Spoke {
    // Deterministic ID: SHA-256 of the spec's identity fields.
    const canonical = JSON.stringify({
      principalId: spec.principalId,
      action: spec.action,
      resource: spec.resource,
      context: spec.context || {},
    });
    const spokeId = createHash("sha256").update(canonical).digest("hex").slice(0, 16);
    const now = new Date().toISOString();

    const spoke: Spoke = {
      spokeId,
      spec,
      createdAt: now,
      phase: Phase.BORN,
      decision: null,
      receipts: [],
      output: null,
      error: null,
      code: null,
      durationMs: null,
    };

    // Birth receipt. Hash includes spokeId so identical specs at
    // different times still produce unique chains.
    spoke.receipts.push({
      phase: Phase.BORN,
      code: null,
      ts: now,
      hash: this.hash("GENESIS", Phase.BORN, now, spokeId),
      detail: `Spoke ${spokeId} born`,
    });

    return spoke;
  }

  private advance(spoke: Spoke, next: Phase, code: string | null, detail: string): void {
    if (isTerminal(spoke.phase)) return;

    const allowed = LEGAL.get(spoke.phase);
    if (!allowed || !allowed.has(next)) {
      // W-001: Illegal transition. Set DEAD directly (no recursion).
      spoke.phase = Phase.DEAD;
      spoke.code = WHEEL_CODES.W001;
      spoke.error = `${WHEEL_CODES.W001}: Illegal ${spoke.phase} → ${next}`;
      const ts = new Date().toISOString();
      spoke.receipts.push({
        phase: Phase.DEAD,
        code: WHEEL_CODES.W001,
        ts,
        hash: this.chainHash(spoke, Phase.DEAD, ts),
        detail: spoke.error,
      });
      return;
    }

    spoke.phase = next;
    const ts = new Date().toISOString();
    spoke.receipts.push({
      phase: next,
      code,
      ts,
      hash: this.chainHash(spoke, next, ts),
      detail,
    });
  }

  private async kill(spoke: Spoke, code: string, reason: string): Promise<WheelResult> {
    if (!isTerminal(spoke.phase)) {
      spoke.phase = Phase.DEAD;
      spoke.error = reason;
      spoke.code = code;
      const ts = new Date().toISOString();
      spoke.receipts.push({
        phase: Phase.DEAD,
        code,
        ts,
        hash: this.chainHash(spoke, Phase.DEAD, ts),
        detail: `${code}: ${reason}`,
      });
    }

    try {
      await this.audit(spoke, "SPOKE_DEAD");
    } catch {
      // Axiom A3: audit failure is system failure. Record it.
      spoke.code = WHEEL_CODES.W006;
    }

    return this.freeze(spoke);
  }

  private race(work: Promise<unknown>, deadlineMs: number, spokeId: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(
            `${WHEEL_CODES.W004}: Deadline exceeded (${deadlineMs}ms) — spoke ${spokeId}`
          ));
        }
      }, deadlineMs);

      work.then(
        (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } },
        (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(e); } },
      );
    });
  }

  /** Verify every receipt's hash derives correctly from its predecessor. */
  private verifyChain(spoke: Spoke): boolean {
    for (let i = 0; i < spoke.receipts.length; i++) {
      const r = spoke.receipts[i];
      const prev = i === 0 ? "GENESIS" : spoke.receipts[i - 1].hash;
      const expected = this.hash(prev, r.phase, r.ts, spoke.spokeId);
      if (r.hash !== expected) return false;
    }
    return true;
  }

  private hash(prev: string, phase: Phase, ts: string, spokeId: string): string {
    return createHash("sha256")
      .update(`${prev}|${phase}|${ts}|${spokeId}`)
      .digest("hex");
  }

  private chainHash(spoke: Spoke, phase: Phase, ts: string): string {
    const prev = spoke.receipts.length > 0
      ? spoke.receipts[spoke.receipts.length - 1].hash
      : "GENESIS";
    return this.hash(prev, phase, ts, spoke.spokeId);
  }

  private async audit(spoke: Spoke, eventType: string): Promise<void> {
    await this.rim.writeAgentAction({
      agentId: spoke.spec.principalId,
      actionName: `${eventType}:${spoke.spec.action}`,
      targetType: spoke.spec.resource.split(":")[0] || "unknown",
      targetId: spoke.spec.resource,
      actorId: spoke.spec.principalId,
      actorType: "agent",
      source: `wheel:${spoke.spokeId}:${spoke.phase}`,
    });
  }

  private freeze(spoke: Spoke): WheelResult {
    return Object.freeze({
      spokeId: spoke.spokeId,
      phase: spoke.phase,
      decision: spoke.decision,
      output: spoke.output,
      error: spoke.error,
      code: spoke.code,
      durationMs: spoke.durationMs,
      receipts: Object.freeze([...spoke.receipts]),
    });
  }
}
