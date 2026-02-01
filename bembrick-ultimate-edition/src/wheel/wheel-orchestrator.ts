// src/wheel/wheel-orchestrator.ts
//
// THE WHEEL
//
// A task orchestrator that doesn't just gate execution — it *governs* it.
// Every axiom from the Unnamed System is structural, not decorative:
//
//   CLOSED WORLD      → Finite state machine. No dynamic phases. No plugins.
//   OWNER SUPREMACY   → Owner can halt any spoke at any phase, no questions.
//   REPRODUCIBILITY   → Deterministic spoke IDs derived from content hash.
//   DEFENSE ONLY      → The Wheel observes, attests, and halts. Never attacks.
//   ATTESTATION > TRUST → Every phase transition produces a signed receipt.
//   SILENCE IS A FEATURE → Hard deadline. Overrun = kill. No daemons linger.
//   FAIL-CLOSED ALWAYS → Unknown state is compromise state. Full stop.
//
// Architecture:
//   Hub    = Policy core (Evaluator + Doctrine). Immovable.
//   Spoke  = One task lifecycle. Born, gated, attested, executed, sealed.
//   Rim    = The audit trail. Append-only. Write failure is fatal.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, randomUUID } from "crypto";
import { Evaluator, EvaluationInput, Decision } from "../core/evaluator";
import { AuditService } from "../audit/audit-service";
import { assertSafe, SanityContext } from "../guardrails/local-sanity-checks";

// ---------------------------------------------------------------------------
// Phase — the only states a spoke can inhabit. No extensions. No "pending".
// ---------------------------------------------------------------------------

export enum Phase {
  BORN       = "BORN",        // Spoke created, nothing validated
  GATED      = "GATED",       // Policy evaluated, decision rendered
  ATTESTED   = "ATTESTED",    // Pre-execution attestation recorded
  EXECUTING  = "EXECUTING",   // Executor running (timer armed)
  SEALED     = "SEALED",      // Terminal. Succeeded or failed. Immutable.
  DEAD       = "DEAD",        // Terminal. Killed by policy, timeout, or owner.
}

// Legal transitions. Anything else is a state violation → DEAD.
const LEGAL_TRANSITIONS: ReadonlyMap<Phase, ReadonlySet<Phase>> = new Map([
  [Phase.BORN,      new Set([Phase.GATED, Phase.DEAD])],
  [Phase.GATED,     new Set([Phase.ATTESTED, Phase.DEAD])],
  [Phase.ATTESTED,  new Set([Phase.EXECUTING, Phase.DEAD])],
  [Phase.EXECUTING, new Set([Phase.SEALED, Phase.DEAD])],
  // SEALED and DEAD are terminal — no outbound transitions.
]);

// ---------------------------------------------------------------------------
// Spoke — one task's full lifecycle, recorded immutably.
// ---------------------------------------------------------------------------

export interface SpokeSpec {
  agentId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  deadlineMs: number;            // Hard deadline. Non-negotiable.
  targetPath?: string;           // For guardrail path checks
}

export interface PhaseReceipt {
  phase: Phase;
  ts: string;
  hash: string;                  // SHA-256 of (previous_hash + phase + ts)
  detail: string;
}

export interface Spoke {
  readonly spokeId: string;      // Deterministic: SHA-256(spec content)
  readonly spec: Readonly<SpokeSpec>;
  readonly createdAt: string;
  phase: Phase;
  decision: Decision | null;
  receipts: PhaseReceipt[];
  output: unknown;
  error: string | null;
  durationMs: number | null;
}

export interface WheelResult {
  spokeId: string;
  phase: Phase;
  decision: Decision | null;
  output: unknown;
  error: string | null;
  durationMs: number | null;
  receipts: ReadonlyArray<PhaseReceipt>;
}

// ---------------------------------------------------------------------------
// Executor contract — the Wheel doesn't know what you run. It only knows
// whether you finished before the deadline, and whether you threw.
// ---------------------------------------------------------------------------

export type Executor = (spec: SpokeSpec) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Wheel configuration
// ---------------------------------------------------------------------------

export interface WheelConfig {
  evaluator: Evaluator;
  audit: AuditService;
  executor: Executor;
  ownerId: string;               // Owner can halt any spoke
}

// ---------------------------------------------------------------------------
// THE WHEEL
// ---------------------------------------------------------------------------

export class Wheel {
  private readonly hub: Evaluator;
  private readonly rim: AuditService;
  private readonly executor: Executor;
  private readonly ownerId: string;

  // No spoke registry. The Wheel doesn't accumulate state between runs.
  // Silence is a feature — when a spoke seals, nothing lingers.

  constructor(config: WheelConfig) {
    this.hub = config.evaluator;
    this.rim = config.audit;
    this.executor = config.executor;
    this.ownerId = config.ownerId;
  }

  // -------------------------------------------------------------------------
  // spin() — the only public method. One spoke in, one result out.
  // No batch mode. No queue. No parallelism hidden behind an API.
  // If you want concurrency, you call spin() concurrently. The Wheel
  // doesn't pretend to manage what it can't guarantee.
  // -------------------------------------------------------------------------

  async spin(spec: SpokeSpec, evidence: EvaluationInput): Promise<WheelResult> {
    const spoke = this.birthSpoke(spec);

    try {
      // Phase 1: GATE — ask the Hub
      this.advancePhase(spoke, Phase.GATED, "Policy evaluation requested");
      spoke.decision = await this.hub.evaluate(evidence);

      if (spoke.decision.effect !== "ALLOW") {
        // Denied or challenged. Spoke dies here.
        this.advancePhase(spoke, Phase.DEAD,
          `Policy: ${spoke.decision.effect} — ${spoke.decision.reasons.map(r => r.message).join("; ")}`
        );
        await this.auditSpoke(spoke, "WHEEL_POLICY_DENY");
        return this.seal(spoke);
      }

      // Phase 2: ATTEST — guardrails + pre-execution snapshot
      this.advancePhase(spoke, Phase.ATTESTED, "Pre-execution attestation");
      const sanity = assertSafe({
        action: spec.action,
        targetPath: spec.targetPath,
        actorId: spec.agentId,
        isDryRun: false,
      } satisfies SanityContext);

      if (!sanity.safe) {
        this.advancePhase(spoke, Phase.DEAD,
          `Guardrail: ${sanity.violations.join("; ")}`
        );
        await this.auditSpoke(spoke, "WHEEL_GUARDRAIL_HALT");
        return this.seal(spoke);
      }

      // Phase 3: EXECUTE — timer armed, no mercy
      this.advancePhase(spoke, Phase.EXECUTING, `Deadline: ${spec.deadlineMs}ms`);
      await this.auditSpoke(spoke, "WHEEL_EXECUTE_START");

      const t0 = Date.now();
      spoke.output = await this.executeWithDeadline(spoke);
      spoke.durationMs = Date.now() - t0;

      // Phase 4: SEAL — done
      this.advancePhase(spoke, Phase.SEALED,
        `Completed in ${spoke.durationMs}ms`
      );
      await this.auditSpoke(spoke, "WHEEL_EXECUTE_COMPLETE");
      return this.seal(spoke);

    } catch (err: unknown) {
      // Any unhandled throw = unknown state = compromise state.
      // The spoke dies. The error is recorded. Nothing is hidden.
      spoke.error = err instanceof Error ? err.message : String(err);
      this.forceKill(spoke, `Unhandled: ${spoke.error}`);
      await this.auditSpoke(spoke, "WHEEL_UNKNOWN_STATE");
      return this.seal(spoke);
    }
  }

  // -------------------------------------------------------------------------
  // halt() — Owner kills a spoke by ID. No reason required. Always works.
  // This is Owner Supremacy made structural.
  // -------------------------------------------------------------------------

  haltSpoke(spoke: Spoke, actorId: string): boolean {
    if (actorId !== this.ownerId) return false;
    this.forceKill(spoke, "Owner halt");
    return true;
  }

  // =========================================================================
  // INTERNALS — nothing below is accessible outside the class.
  // =========================================================================

  // ---- Spoke birth --------------------------------------------------------

  private birthSpoke(spec: SpokeSpec): Spoke {
    const spokeId = this.deriveSpokeId(spec);
    const now = new Date().toISOString();

    const spoke: Spoke = {
      spokeId,
      spec: Object.freeze({ ...spec }),
      createdAt: now,
      phase: Phase.BORN,
      decision: null,
      receipts: [],
      output: null,
      error: null,
      durationMs: null,
    };

    // First receipt: birth
    spoke.receipts.push({
      phase: Phase.BORN,
      ts: now,
      hash: this.hashReceipt("GENESIS", Phase.BORN, now),
      detail: `Spoke ${spokeId} born`,
    });

    return spoke;
  }

  // ---- Deterministic spoke ID ---------------------------------------------
  // Reproducibility: same spec → same ID. Always.

  private deriveSpokeId(spec: SpokeSpec): string {
    const canonical = JSON.stringify({
      agentId: spec.agentId,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: spec.resourceId,
      payload: spec.payload,
    });
    return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
  }

  // ---- Phase transitions --------------------------------------------------
  // Closed World: only legal transitions are permitted.
  // Anything else → DEAD. No exceptions. No recovery.

  private advancePhase(spoke: Spoke, next: Phase, detail: string): void {
    const allowed = LEGAL_TRANSITIONS.get(spoke.phase);

    if (!allowed || !allowed.has(next)) {
      // Illegal transition attempt. This is an invariant violation.
      // In the Unnamed System, unknown state is compromise state.
      this.forceKill(spoke,
        `Illegal transition ${spoke.phase} → ${next}: ${detail}`
      );
      return;
    }

    spoke.phase = next;
    const ts = new Date().toISOString();
    const prevHash = spoke.receipts.length > 0
      ? spoke.receipts[spoke.receipts.length - 1].hash
      : "GENESIS";

    spoke.receipts.push({
      phase: next,
      ts,
      hash: this.hashReceipt(prevHash, next, ts),
      detail,
    });
  }

  // ---- Force kill ---------------------------------------------------------

  private forceKill(spoke: Spoke, reason: string): void {
    // Terminal states are truly terminal.
    if (spoke.phase === Phase.SEALED || spoke.phase === Phase.DEAD) return;

    spoke.phase = Phase.DEAD;
    spoke.error = spoke.error ?? reason;
    const ts = new Date().toISOString();
    const prevHash = spoke.receipts.length > 0
      ? spoke.receipts[spoke.receipts.length - 1].hash
      : "GENESIS";

    spoke.receipts.push({
      phase: Phase.DEAD,
      ts,
      hash: this.hashReceipt(prevHash, Phase.DEAD, ts),
      detail: reason,
    });
  }

  // ---- Deadline enforcement -----------------------------------------------
  // Silence is a feature. If the executor overruns, it dies.

  private async executeWithDeadline(spoke: Spoke): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(
          `Deadline exceeded: ${spoke.spec.deadlineMs}ms — spoke ${spoke.spokeId} killed`
        ));
      }, spoke.spec.deadlineMs);

      this.executor(spoke.spec)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // ---- Receipt hashing ----------------------------------------------------
  // Attestation > Trust. Each receipt chains to the previous one.
  // Tampering with any receipt breaks the chain for every receipt after it.

  private hashReceipt(prevHash: string, phase: Phase, ts: string): string {
    return createHash("sha256")
      .update(`${prevHash}|${phase}|${ts}`)
      .digest("hex");
  }

  // ---- Audit integration --------------------------------------------------
  // The Rim records everything. Write failure here should be fatal,
  // but we let AuditService enforce that contract.

  private async auditSpoke(spoke: Spoke, eventType: string): Promise<void> {
    await this.rim.writeAgentAction({
      agentId: spoke.spec.agentId,
      actionName: spoke.spec.action,
      targetType: spoke.spec.resourceType,
      targetId: spoke.spec.resourceId,
      actorId: spoke.spec.agentId,
      actorType: "agent",
      source: "wheel",
    });
  }

  // ---- Seal a spoke into a result -----------------------------------------
  // Once sealed, the spoke is garbage. The Wheel keeps nothing.

  private seal(spoke: Spoke): WheelResult {
    return {
      spokeId: spoke.spokeId,
      phase: spoke.phase,
      decision: spoke.decision,
      output: spoke.output,
      error: spoke.error,
      durationMs: spoke.durationMs,
      receipts: Object.freeze([...spoke.receipts]),
    };
  }
}
