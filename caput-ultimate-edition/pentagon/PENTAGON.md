# Pentagon — Unnamed Multi-Layer Framework

One structure from outside. Multi-plumbed infrastructure underneath.

```
              ╔═══════════════════════════════╗
              ║                               ║
              ║       P E N T A G O N         ║
              ║                               ║
              ║   ┌───────┐   ┌─────────┐    ║
              ║   │  CMD  │   │   IDN   │    ║    5 Public Facets
              ║   └───────┘   └─────────┘    ║
              ║   ┌───────┐   ┌─────────┐    ║
              ║   │  EVD  │   │   EXE   │    ║
              ║   └───────┘   └─────────┘    ║
              ║       ┌───────────┐          ║
              ║       │    OUT    │          ║
              ║       └───────────┘          ║
              ╠═══════════════════════════════╣
              ║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║  ← floor line
              ║  L4  Manifold               ║
              ║  L3  Valve                  ║  5 Underfloor Layers
              ║  L2  Reservoir              ║  (invisible plumbing)
              ║  L1  Conduit                ║
              ║  L0  Kernel                 ║
              ╚═══════════════════════════════╝
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

## 18 Rooms

Each layer contains modular "rooms" — self-contained capabilities wired into the Pentagon during construction. All rooms are queryable via `pentagon.command("roomName")`.

### L0 Kernel — Crypto & Primitives

| Room | File | Purpose | Key Methods |
|------|------|---------|-------------|
| **Thermostat** | `L0-kernel/thermostat.ts` | System temperature monitoring across 8 zones (cpu.load, memory.used, disk.used, events.per_sec, errors.per_min, latency.p99_ms, queue.depth, entropy.available). Classifies readings as nominal/warm/hot/critical, tracks trends, fires alarms. | `addZone`, `record`, `read`, `readAll`, `trend`, `alarms`, `sweep` |
| **Chip** | `L0-kernel/chip.ts` | Crypto accelerator with opaque key handles. AES-256-GCM encrypt/decrypt, HMAC sign/verify, key derivation. No raw key material escapes. | `status` (keyCount, algorithms) |
| **Battery** | `L0-kernel/battery.ts` | Entropy pool (8KB default) with draw/refill, power budgets with TTL, charge level monitoring (full/good/low/critical/dead), secure wipe. | `status`, `charge` |

### L1 Conduit — Messaging

| Room | File | Purpose | Key Methods |
|------|------|---------|-------------|
| **Flares** | `L1-conduit/flares.ts` | Alert system with 5 severity levels (info/warning/error/critical/fatal), fingerprint de-duplication window, async handlers, acknowledgement. | `fire`, `acknowledge`, `active`, `recent`, `stats` |
| **Locks** | `L1-conduit/locks.ts` | Mutex, rwlock, semaphore with TTL-based reaping, wait queues with timeout, automatic dead-holder cleanup. | `acquire`, `release`, `isLocked`, `holders`, `stats` |
| **Doors** | `L1-conduit/doors.ts` | Layer ingress/egress access points. Direction enforcement (inbound/outbound/bidirectional), sealing, emergency lockdown/liftLockdown, transit metering. | `install`, `transit`, `seal`, `unseal`, `lockdown`, `liftLockdown`, `stats` |

### L2 Reservoir — State & Storage

| Room | File | Purpose | Key Methods |
|------|------|---------|-------------|
| **Trunk** | `L2-reservoir/trunk.ts` | Content-addressed bulk storage. SHA-256 dedup with shard directories (first 2 hex chars). Metadata tags, MIME types, access counting. | `store`, `retrieve`, `getMeta`, `findByTag`, `findByMimeType`, `stats` |
| **Spares** | `L2-reservoir/spares.ts` | Snapshot management with hash-chain verification (parentHash links), bounded history (maxSnapshots), restore with integrity check. | `snapshot`, `restore`, `latest`, `list`, `verifyChain`, `manifest` |
| **Coolant** | `L2-reservoir/coolant.ts` | Cache eviction with LRU/LFU/TTL strategies, pressure monitoring (0.0–1.0), auto-cool at threshold. | `track`, `touch`, `remove`, `cool`, `flush`, `pressure`, `stats` |
| **Wash** | `L2-reservoir/wash.ts` | Data sanitisation with regex rules for PII (email, phone, TFN, ABN, credit card, IP, Medicare) and secrets (JWT, API keys, private keys, passwords, bearer tokens). Encoding cleanup. | `addRule`, `removeRule`, `scrub`, `scan`, `scrubObject`, `stats` |

### L3 Valve — Policy & Control

| Room | File | Purpose | Key Methods |
|------|------|---------|-------------|
| **Brakes** | `L3-valve/brakes.ts` | Emergency stop with 3 modes: ABS (progressive throttle −25% per trigger), EBRAKE (instant full stop, queue everything), COAST (release, drain queue). | `abs`, `ebrake`, `coast`, `gate`, `state`, `isEngaged`, `stats` |
| **Tint** | `L3-valve/tint.ts` | Data masking with 3 levels: CLEAR (full visibility), FROSTED (partial: `"abcd...[64 chars]"`), BLACKOUT (`[REDACTED]`). Per-field policies with substring matching. | `setPolicy`, `removePolicy`, `setDefault`, `apply`, `deepApply`, `stats` |
| **Wipers** | `L3-valve/wipers.ts` | Periodic cleanup with registered tasks, configurable intervals, manual sweep or auto-sweep (background timer). | `register`, `unregister`, `enable`, `disable`, `sweep`, `start`, `stop`, `stats` |
| **Fuel** | `L3-valve/fuel.ts` | Resource allocation with named pools (compute, io, network, crypto, storage), consume/refill, auto-refill at configurable rate. | `gauge` (all pools with remaining/capacity/percent) |

### L4 Manifold — Orchestration

| Room | File | Purpose | Key Methods |
|------|------|---------|-------------|
| **Engine** | `L4-manifold/engine.ts` | Core execution runtime with timeout, retry with backoff, max concurrency control, batch execution. | `run`, `batch`, `stats` |
| **Wings** | `L4-manifold/wings.ts` | Horizontal scaling with lanes. Three routing strategies: round-robin, least-loaded, hash-pinned. Lane health management. | `route`, `complete`, `markUnhealthy`, `addLane`, `setStrategy`, `stats` |
| **Mods** | `L4-manifold/mods.ts` | Plugin system with ModSpec (name, version, hooks, provides), dispatch events to hooked mods, query services. | `install`, `uninstall`, `enable`, `disable`, `dispatch`, `provides`, `stats` |
| **Exhaust** | `L4-manifold/exhaust.ts` | Output telemetry with counters, gauges, histograms (percentile queries), telemetry events with subscribers. | `emit`, `snapshot`, `stats` |

## Cross-Wiring

Rooms are cross-wired in the Pentagon constructor:

| Wiper Task | Interval | Action |
|------------|----------|--------|
| `coolant-flush` | 60s | Flush expired cache entries via `coolant.flush()` |
| `thermal-sweep` | 15s | Check `thermostat.alarms()`, fire `flares.fire()` for hot/critical zones, emit telemetry via `exhaust.emit()` |

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

// FACET 1: Command (includes all 18 rooms)
const health = await p.command("health");
const thermal = await p.command("thermostat");
const fuel = await p.command("fuel");
const engine = await p.command("engine");

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
