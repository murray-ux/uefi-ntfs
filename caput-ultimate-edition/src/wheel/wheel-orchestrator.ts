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
//   - AbortSignal-style cancellation for composable abort sources.
//
// Failure codes (Charter §3.1):
//   W-001  Illegal state transition
//   W-002  Evaluator returned DENY
//   W-003  Attestation failed (receipt chain integrity broken)
//   W-004  Deadline exceeded
//   W-005  Execute function threw
//   W-006  Audit write failed
//   W-007  Aborted by signal
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
  W007: "W-007",
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
// WheelAbortController — Composable abort signals (AbortSignal.any() pattern)
// ---------------------------------------------------------------------------

export type AbortReason = string | Error | { code: string; message: string };

export interface WheelAbortSignal {
  readonly aborted: boolean;
  readonly reason: AbortReason | undefined;
  addEventListener(type: 'abort', listener: () => void): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

/**
 * WheelAbortController — composable abort signals for workflow cancellation.
 *
 * Follows the AbortSignal.any() pattern:
 *   - Multiple abort sources can be composed
 *   - First abort reason wins
 *   - Events fire in registration order
 *   - Dependent signals are marked aborted before events fire
 */
export class WheelAbortController {
  private _aborted = false;
  private _reason: AbortReason | undefined;
  private _listeners: Set<() => void> = new Set();
  private _sources: WheelAbortSignal[] = [];

  readonly signal: WheelAbortSignal = {
    get aborted() { return this._aborted; },
    get reason() { return this._reason; },
    addEventListener: (type: 'abort', listener: () => void) => {
      if (type === 'abort') {
        this._listeners.add(listener);
        // If already aborted, fire immediately (sync)
        if (this._aborted) {
          listener();
        }
      }
    },
    removeEventListener: (type: 'abort', listener: () => void) => {
      if (type === 'abort') {
        this._listeners.delete(listener);
      }
    },
  };

  constructor() {
    // Bind signal getters to this instance
    Object.defineProperty(this.signal, 'aborted', {
      get: () => this._aborted,
    });
    Object.defineProperty(this.signal, 'reason', {
      get: () => this._reason,
    });
  }

  /**
   * Abort with a reason. First abort wins — subsequent calls are ignored.
   */
  abort(reason?: AbortReason): void {
    if (this._aborted) return;

    this._aborted = true;
    this._reason = reason ?? { code: WHEEL_CODES.W007, message: 'Aborted' };

    // Fire listeners in registration order
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Don't let listener errors break the abort chain
      }
    }
  }

  /**
   * Follow another signal — when it aborts, this controller aborts.
   */
  follow(signal: WheelAbortSignal): void {
    if (this._aborted) return;

    // If source is already aborted, abort immediately with its reason
    if (signal.aborted) {
      this.abort(signal.reason);
      return;
    }

    this._sources.push(signal);
    signal.addEventListener('abort', () => {
      this.abort(signal.reason);
    });
  }

  /**
   * Create a composite signal from multiple sources (AbortSignal.any() pattern).
   * First source to abort wins.
   */
  static any(signals: WheelAbortSignal[]): WheelAbortController {
    const controller = new WheelAbortController();

    for (const signal of signals) {
      controller.follow(signal);
      // If any signal is already aborted, controller is now aborted
      if (controller.signal.aborted) break;
    }

    return controller;
  }

  /**
   * Create a timeout signal (AbortSignal.timeout() pattern).
   */
  static timeout(ms: number): WheelAbortController {
    const controller = new WheelAbortController();

    setTimeout(() => {
      controller.abort({
        code: WHEEL_CODES.W004,
        message: `Timeout after ${ms}ms`,
      });
    }, ms);

    return controller;
  }
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
  /**
   * Optional abort signal for external cancellation.
   * Composable with deadline timeout via WheelAbortController.any().
   */
  signal?: WheelAbortSignal;
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
   *
   * Abort sources are composed: external signal + deadline timeout.
   * First abort wins (AbortSignal.any() pattern).
   */
  async spin(spec: SpokeSpec): Promise<WheelResult> {
    const spoke = this.birth(spec);

    // Compose abort sources: external signal (if any) + deadline timeout
    const timeoutController = WheelAbortController.timeout(spec.deadlineMs);
    const abortController = spec.signal
      ? WheelAbortController.any([spec.signal, timeoutController.signal])
      : timeoutController;

    try {
      // Check for pre-aborted signal
      if (abortController.signal.aborted) {
        const reason = abortController.signal.reason;
        const msg = typeof reason === 'string' ? reason
          : reason instanceof Error ? reason.message
          : (reason as { message: string }).message;
        const code = typeof reason === 'object' && 'code' in reason
          ? (reason as { code: string }).code
          : WHEEL_CODES.W007;
        return this.kill(spoke, code, msg);
      }

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

      // Check abort between phases
      if (abortController.signal.aborted) {
        return this.abortSpoke(spoke, abortController.signal.reason);
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

      // Check abort between phases
      if (abortController.signal.aborted) {
        return this.abortSpoke(spoke, abortController.signal.reason);
      }

      // ── EXECUTE ───────────────────────────────────────────────
      this.advance(spoke, Phase.EXECUTING, null, `Deadline: ${spec.deadlineMs}ms`);
      await this.audit(spoke, "SPOKE_EXECUTING");

      const t0 = Date.now();
      spoke.output = await this.race(spec.execute(), abortController, spoke.spokeId);
      spoke.durationMs = Date.now() - t0;

      // ── SEAL ──────────────────────────────────────────────────
      this.advance(spoke, Phase.SEALED, null, `Completed in ${spoke.durationMs}ms`);
      await this.audit(spoke, "SPOKE_SEALED");
      return this.freeze(spoke);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = msg.includes(WHEEL_CODES.W004) ? WHEEL_CODES.W004
        : msg.includes(WHEEL_CODES.W007) ? WHEEL_CODES.W007
        : WHEEL_CODES.W005;
      return this.kill(spoke, code, msg);
    }
  }

  /**
   * Abort a spoke due to signal cancellation.
   */
  private async abortSpoke(spoke: Spoke, reason: AbortReason | undefined): Promise<WheelResult> {
    const msg = typeof reason === 'string' ? reason
      : reason instanceof Error ? reason.message
      : reason ? (reason as { message: string }).message
      : 'Aborted by signal';
    const code = typeof reason === 'object' && reason && 'code' in reason
      ? (reason as { code: string }).code
      : WHEEL_CODES.W007;
    return this.kill(spoke, code, msg);
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

  /**
   * Race work against abort signal. Abort can come from timeout or external signal.
   */
  private race(
    work: Promise<unknown>,
    controller: WheelAbortController,
    spokeId: string
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false;

      // Listen for abort
      const onAbort = () => {
        if (!settled) {
          settled = true;
          const reason = controller.signal.reason;
          const msg = typeof reason === 'string' ? reason
            : reason instanceof Error ? reason.message
            : reason ? (reason as { message: string }).message
            : 'Aborted';
          const code = typeof reason === 'object' && reason && 'code' in reason
            ? (reason as { code: string }).code
            : WHEEL_CODES.W007;
          reject(new Error(`${code}: ${msg} — spoke ${spokeId}`));
        }
      };

      controller.signal.addEventListener('abort', onAbort);

      // Check if already aborted
      if (controller.signal.aborted) {
        onAbort();
        return;
      }

      work.then(
        (v) => {
          if (!settled) {
            settled = true;
            controller.signal.removeEventListener('abort', onAbort);
            resolve(v);
          }
        },
        (e) => {
          if (!settled) {
            settled = true;
            controller.signal.removeEventListener('abort', onAbort);
            reject(e);
          }
        },
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
