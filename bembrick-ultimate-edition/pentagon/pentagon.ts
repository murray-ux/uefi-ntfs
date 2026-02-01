// pentagon/pentagon.ts
//
// THE PENTAGON
//
// From outside: one structure, five facets, clean surface.
// From inside: five underfloor layers of plumbing.
//
//              ╔═══════════════════════╗
//              ║                       ║
//              ║      P E N T A G O N  ║
//              ║                       ║
//              ║   ┌─────┐ ┌─────┐    ║
//              ║   │ CMD │ │ IDN │    ║    5 Facets
//              ║   └─────┘ └─────┘    ║    (public surface)
//              ║   ┌─────┐ ┌─────┐    ║
//              ║   │ EVD │ │ EXE │    ║
//              ║   └─────┘ └─────┘    ║
//              ║       ┌─────┐        ║
//              ║       │ OUT │        ║
//              ║       └─────┘        ║
//              ╠═══════════════════════╣
//              ║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ║    ← floor line
//              ║   L4 Manifold        ║
//              ║   L3 Valve           ║    5 Underfloor Layers
//              ║   L2 Reservoir       ║    (invisible plumbing)
//              ║   L1 Conduit         ║
//              ║   L0 Kernel          ║
//              ╚═══════════════════════╝
//
// The consumer creates a Pentagon and interacts with its five facets.
// They never import, instantiate, or reference any underfloor layer.
// The underfloor wires itself during construction.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel } from "./underfloor/layer0-kernel";
import { Conduit } from "./underfloor/layer1-conduit";
import { Reservoir } from "./underfloor/layer2-reservoir";
import { Valve, PolicyRule, ValveDecision } from "./underfloor/layer3-valve";
import { Manifold, Step, ManifoldResult } from "./underfloor/layer4-manifold";

// ---------------------------------------------------------------------------
// Pentagon config — the ONLY thing the consumer provides
// ---------------------------------------------------------------------------

export interface PentagonConfig {
  dataDir: string;
  ownerId: string;
  policies?: PolicyRule[];
  hotCacheCapacity?: number;
  rateLimitCapacity?: number;
  rateLimitRefill?: number;
}

// ---------------------------------------------------------------------------
// Facet response types — the ONLY types the consumer sees
// ---------------------------------------------------------------------------

export interface CommandResult {
  id: string;
  command: string;
  success: boolean;
  output: unknown;
  durationMs: number;
}

export interface IdentityCheck {
  principalId: string;
  allowed: boolean;
  reason: string;
  remainingQuota: number;
}

export interface EvidenceRecord {
  key: string;
  hash: string;
  version: number;
  storedAt: string;
}

export interface ExecutionReceipt {
  id: string;
  pattern: string;
  success: boolean;
  steps: number;
  durationMs: number;
}

export interface OutputBundle {
  id: string;
  type: string;
  artifacts: string[];
  integrity: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// THE PENTAGON — one structure, five facets
// ---------------------------------------------------------------------------

export class Pentagon {
  // These are private. Nobody outside touches them. Ever.
  private readonly kernel: Kernel;
  private readonly conduit: Conduit;
  private readonly reservoir: Reservoir;
  private readonly valve: Valve;
  private readonly manifold: Manifold;
  private readonly ownerId: string;

  constructor(config: PentagonConfig) {
    this.ownerId = config.ownerId;

    // ── Wire the underfloor ────────────────────────────────────────────
    // Layer 0: Kernel — crypto, hashing, time
    this.kernel = new Kernel();

    // Layer 1: Conduit — message passing
    this.conduit = new Conduit(this.kernel);

    // Layer 2: Reservoir — state, cache, persistence
    this.reservoir = new Reservoir(this.kernel, config.dataDir, config.hotCacheCapacity ?? 4096);

    // Layer 3: Valve — policy, circuit breakers, rate limiters
    const defaultPolicies: PolicyRule[] = config.policies ?? [
      {
        id: "owner-allow",
        effect: "allow",
        conditions: {
          principals: [config.ownerId],
          requireMfa: true,
          maxRiskScore: 80,
        },
        priority: 10,
      },
      {
        id: "system-health",
        effect: "allow",
        conditions: {
          principals: ["system"],
          actions: ["health:*", "diagnostics:*"],
        },
        priority: 20,
      },
      {
        id: "deny-all",
        effect: "deny",
        conditions: {},
        priority: 999,
      },
    ];
    this.valve = new Valve(this.kernel, this.reservoir, defaultPolicies, {
      bucketCapacity: config.rateLimitCapacity,
      refillRate: config.rateLimitRefill,
    });

    // Layer 4: Manifold — orchestration
    this.manifold = new Manifold(this.kernel, this.conduit, this.reservoir, this.valve);

    // Wire conduit pipes for internal signalling
    this.conduit.register("manifold", "reservoir", "step:done", async (env) => {
      this.reservoir.put(`signal:${env.id}`, env.payload);
    });
    this.conduit.register("manifold", "reservoir", "saga:compensation-failed", async (env) => {
      this.reservoir.put(`compensation-fail:${env.id}`, env.payload);
    });
    this.conduit.register("facet", "reservoir", "evidence:store", async (env) => {
      // no-op handler — evidence is stored directly by the facet
    });
  }

  // =====================================================================
  // FACET 1: COMMAND — Entry point for all operations
  // =====================================================================

  async command(name: string, input: unknown = null): Promise<CommandResult> {
    const id = this.kernel.monotonicId();
    const start = this.kernel.now();

    const result = await this.manifold.pipeline(
      {
        principalId: this.ownerId,
        action: `command:${name}`,
        resource: "pentagon:command",
        context: { mfaPassed: true, riskScore: 0 },
      },
      [
        {
          id: `cmd-${name}`,
          name,
          execute: async (inp) => {
            // Route to internal handlers
            switch (name) {
              case "health":
                return this.internalHealth();
              case "diagnostics":
                return this.internalDiagnostics();
              case "status":
                return this.internalStatus();
              default:
                return { command: name, input: inp, handled: false };
            }
          },
          timeoutMs: 30000,
        },
      ],
      input,
    );

    const end = this.kernel.now();
    return {
      id,
      command: name,
      success: result.success,
      output: result.output,
      durationMs: Number(end.monotonic - start.monotonic) / 1e6,
    };
  }

  // =====================================================================
  // FACET 2: IDENTITY — Authentication and authorization
  // =====================================================================

  check(principalId: string, action: string, resource: string, context?: Record<string, unknown>): IdentityCheck {
    const decision = this.valve.evaluate({
      principalId,
      action,
      resource,
      context: context ?? { mfaPassed: true, riskScore: 0 },
    });

    return {
      principalId,
      allowed: decision.verdict === "ALLOW",
      reason: decision.reason,
      remainingQuota: decision.limiterRemaining,
    };
  }

  // =====================================================================
  // FACET 3: EVIDENCE — Store and retrieve evidence records
  // =====================================================================

  store(key: string, value: unknown, ttlMs: number = 0): EvidenceRecord {
    const entry = this.reservoir.put(key, value, ttlMs);
    return {
      key: entry.key,
      hash: entry.hash,
      version: entry.version,
      storedAt: entry.storedAt.iso,
    };
  }

  retrieve(key: string): unknown | null {
    return this.reservoir.get(key);
  }

  history(key: string): EvidenceRecord[] {
    return this.reservoir.history(key).map((e) => ({
      key: e.key,
      hash: e.hash,
      version: e.version,
      storedAt: e.storedAt.iso,
    }));
  }

  // =====================================================================
  // FACET 4: EXECUTE — Run orchestrated workflows
  // =====================================================================

  async execute(
    action: string,
    steps: Array<{ name: string; fn: (input: unknown) => Promise<unknown>; timeoutMs?: number; undo?: (input: unknown) => Promise<void> }>,
    input: unknown = null,
    pattern: "pipeline" | "fan-out" | "saga" = "pipeline",
  ): Promise<ExecutionReceipt> {
    const mappedSteps: Step[] = steps.map((s, i) => ({
      id: this.kernel.deriveId("step", action, s.name, String(i)),
      name: s.name,
      execute: s.fn,
      compensate: s.undo,
      timeoutMs: s.timeoutMs ?? 30000,
    }));

    const request = {
      principalId: this.ownerId,
      action,
      resource: `pentagon:${pattern}`,
      context: { mfaPassed: true, riskScore: 0 },
    };

    let result: ManifoldResult;
    switch (pattern) {
      case "pipeline":
        result = await this.manifold.pipeline(request, mappedSteps, input);
        break;
      case "fan-out":
        result = await this.manifold.fanOut(request, mappedSteps, input);
        break;
      case "saga":
        result = await this.manifold.saga(request, mappedSteps, input);
        break;
    }

    return {
      id: result.id,
      pattern: result.pattern,
      success: result.success,
      steps: result.steps.length,
      durationMs: result.durationMs,
    };
  }

  // =====================================================================
  // FACET 5: OUTPUT — Generate bundled outputs
  // =====================================================================

  async output(type: string, artifacts: Array<{ name: string; data: Buffer | string }>): Promise<OutputBundle> {
    const id = this.kernel.monotonicId();
    const ts = this.kernel.now();

    // Hash each artifact and store
    const artifactKeys: string[] = [];
    const hashes: string[] = [];

    for (const artifact of artifacts) {
      const data = typeof artifact.data === "string" ? Buffer.from(artifact.data) : artifact.data;
      const hash = this.kernel.hash(data);
      const key = `output:${id}:${artifact.name}`;
      this.reservoir.put(key, {
        name: artifact.name,
        hash: hash.hex,
        size: data.length,
        storedAt: ts.iso,
      });
      artifactKeys.push(artifact.name);
      hashes.push(hash.hex);
    }

    // Compute bundle integrity — hash of all artifact hashes
    const integrityHash = this.kernel.hashChain(hashes);

    // Store bundle manifest
    const manifestKey = `bundle:${id}`;
    this.reservoir.put(manifestKey, {
      type,
      artifacts: artifactKeys,
      integrity: integrityHash.hex,
      generatedAt: ts.iso,
    });

    // Signal via conduit
    await this.conduit.send("facet", "reservoir", "evidence:store", {
      bundleId: id, type, artifactCount: artifacts.length,
    });

    return {
      id,
      type,
      artifacts: artifactKeys,
      integrity: integrityHash.hex,
      generatedAt: ts.iso,
    };
  }

  // =====================================================================
  // Internal — hidden behind the floor
  // =====================================================================

  private internalHealth(): Record<string, unknown> {
    return {
      status: "operational",
      uptime: Number(this.kernel.now().monotonic) / 1e9,
      reservoir: this.reservoir.stats(),
    };
  }

  private internalDiagnostics(): Record<string, unknown> {
    return {
      kernel: { type: "operational" },
      conduit: this.conduit.stats(),
      reservoir: this.reservoir.stats(),
      valve: {
        breakers: this.valve.breakerStates(),
        limiters: this.valve.limiterStates(),
      },
    };
  }

  private internalStatus(): Record<string, unknown> {
    const stats = this.conduit.stats();
    const deadLetters = this.conduit.getDeadLetters();
    return {
      pipes: Object.keys(stats).length,
      totalDelivered: Object.values(stats).reduce((sum, s) => sum + s.delivered, 0),
      totalDropped: Object.values(stats).reduce((sum, s) => sum + s.dropped, 0),
      deadLetters: deadLetters.length,
      reservoirEntries: this.reservoir.stats(),
    };
  }
}
