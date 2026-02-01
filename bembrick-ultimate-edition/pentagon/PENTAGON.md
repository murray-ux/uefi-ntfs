# Pentagon — Unnamed Multi-Layer Framework

One structure from outside. Multi-plumbed infrastructure underneath.

```
              ╔═══════════════════════════╗
              ║                           ║
              ║       P E N T A G O N     ║
              ║                           ║
              ║   ┌───────┐ ┌─────────┐  ║
              ║   │  CMD  │ │   IDN   │  ║    5 Public Facets
              ║   └───────┘ └─────────┘  ║
              ║   ┌───────┐ ┌─────────┐  ║
              ║   │  EVD  │ │   EXE   │  ║
              ║   └───────┘ └─────────┘  ║
              ║       ┌───────────┐      ║
              ║       │    OUT    │      ║
              ║       └───────────┘      ║
              ╠═══════════════════════════╣
              ║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║  ← floor line
              ║  L4  Manifold            ║
              ║  L3  Valve               ║  5 Underfloor Layers
              ║  L2  Reservoir           ║  (invisible plumbing)
              ║  L1  Conduit             ║
              ║  L0  Kernel              ║
              ╚═══════════════════════════╝
```

## Principle

The consumer creates `new Pentagon(config)` and interacts with **five methods**.
They never import, instantiate, or reference any underfloor layer.
The underfloor wires itself during construction.

## Five Facets (Public Surface)

| Facet | Method | Purpose |
|-------|--------|---------|
| **CMD** | `command(name, input?)` | Entry point for named operations |
| **IDN** | `check(principal, action, resource)` | Auth check — allowed or denied |
| **EVD** | `store(key, value)` / `retrieve(key)` / `history(key)` | Evidence storage with versioning |
| **EXE** | `execute(action, steps, input?, pattern?)` | Orchestrated multi-step workflows |
| **OUT** | `output(type, artifacts)` | Bundled output with integrity hash |

## Five Underfloor Layers (Hidden Plumbing)

| Layer | Name | Responsibility |
|-------|------|----------------|
| **L0** | Kernel | Crypto primitives, hashing, HMAC, HKDF, timestamps, nonces |
| **L1** | Conduit | Typed message envelopes, hash-chained pipes, back-pressure, dead letters |
| **L2** | Reservoir | Three-tier state: HOT (LRU cache) → WARM (disk) → COLD (append-only ledger) |
| **L3** | Valve | Policy gate + circuit breakers + token-bucket rate limiters |
| **L4** | Manifold | Pipeline (sequential), Fan-out (parallel), Saga (compensating transactions) |

## Data Flow

```
Consumer calls pentagon.execute("deploy", steps)
         │
         ▼
    ┌─── FACET (EXE) ─────────────────────────────┐
    │  Maps user steps to internal Step objects     │
    │                                               │
    │  ┌─── L4 MANIFOLD ─────────────────────────┐ │
    │  │  Chooses pattern: pipeline/fan-out/saga  │ │
    │  │                                          │ │
    │  │  ┌─── L3 VALVE ───────────────────────┐  │ │
    │  │  │  Policy check → ALLOW/DENY         │  │ │
    │  │  │  Rate limit check → THROTTLE       │  │ │
    │  │  │  Circuit breaker → CIRCUIT_OPEN    │  │ │
    │  │  └────────────────────────────────────┘  │ │
    │  │                                          │ │
    │  │  For each step:                          │ │
    │  │    execute(input) → output               │ │
    │  │    signal via L1 CONDUIT                 │ │
    │  │    persist via L2 RESERVOIR              │ │
    │  │    hash via L0 KERNEL                    │ │
    │  │                                          │ │
    │  │  If saga fails: compensate in reverse    │ │
    │  └──────────────────────────────────────────┘ │
    │                                               │
    │  Return ExecutionReceipt to consumer          │
    └───────────────────────────────────────────────┘
```

## Layer Dependency Rules

Each layer may only depend on layers **below** it. Never sideways, never up.

```
L4 Manifold  → depends on → L3, L2, L1, L0
L3 Valve     → depends on → L2, L0
L2 Reservoir → depends on → L0
L1 Conduit   → depends on → L0
L0 Kernel    → depends on → nothing (crypto stdlib only)
```

## Usage

```typescript
import { Pentagon } from "./pentagon/pentagon";

const p = new Pentagon({
  dataDir: "./data",
  ownerId: "owner",
});

// FACET 1: Command
const health = await p.command("health");

// FACET 2: Identity
const check = p.check("owner", "deploy:app", "prod:server", { mfaPassed: true });

// FACET 3: Evidence
p.store("finding:001", { severity: "high", detail: "..." });
const finding = p.retrieve("finding:001");
const versions = p.history("finding:001");

// FACET 4: Execute
const receipt = await p.execute("deploy", [
  { name: "build",  fn: async () => ({ artifact: "app.zip" }) },
  { name: "test",   fn: async (input) => ({ passed: true }) },
  { name: "deploy", fn: async (input) => ({ deployed: true }), undo: async () => {} },
], null, "saga");

// FACET 5: Output
const bundle = await p.output("report", [
  { name: "summary.json", data: JSON.stringify(receipt) },
  { name: "evidence.json", data: JSON.stringify(finding) },
]);
```

The consumer sees five methods. The plumbing handles itself.
