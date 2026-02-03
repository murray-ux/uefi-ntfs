# GENESIS 2.0

A hardened automation stack for document generation, device management,
cryptographic audit trails, AI-assisted workflows, and multi-layer
infrastructure orchestration.

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                    G E N E S I S    2 . 0                        ║
║                                                                   ║
║   ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐   ║
║   │  Wheel  │  │  Pentagon  │  │ Sovereign│  │ Developer Pro│   ║
║   │  State  │  │  5-Facet   │  │  Suite   │  │   Dashboard  │   ║
║   │ Machine │  │ Framework  │  │ Doc Auto │  │   + AI Chat  │   ║
║   └─────────┘  └───────────┘  └──────────┘  └──────────────┘   ║
║         │            │              │               │             ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │              Unified HTTP Server (zero Express)          │   ║
║   │        19 endpoints · Ed25519 · JWT · OODA · AI          │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

## Architecture

```
src/index.ts              ← GATE: single CLI entry point
  │
  ├── src/wheel/          ← Wheel state machine
  │     └── wheel-orchestrator.ts   6-phase: BORN→GATED→ATTESTED→EXECUTING→SEALED|DEAD
  │
  ├── src/core/           ← Policy engine
  │     ├── evaluator.ts            PDP — evaluates ALLOW/DENY
  │     └── doctrine.ts             Rule definitions
  │
  ├── src/server.ts       ← Unified HTTP server (19 endpoints, zero Express)
  │
  ├── identity/           ← Authentication & signing
  │     ├── ed25519_signer.ts       Ed25519 keypair, file/object signing
  │     └── sso_master.ts           JWT issue/authenticate/authorise
  │
  ├── security/           ← Defence layer
  │     ├── quantum_shield_core.ts  OS health, hardening, drift detection
  │     ├── tolkien_key.ts          Multi-strand HMAC key derivation + beacon chain
  │     ├── certificate_manager.py  SSL/TLS chain validation, pinning
  │     └── fleetdm_client.ts       FleetDM API client
  │
  ├── ai/                 ← LLM integration (optional)
  │     └── ai_orchestrator.ts      Legal drafting, evidence summary, planning
  │
  ├── pentagon/           ← Multi-layer framework
  │     ├── pentagon.ts             Single facade — 5 facets, 18 rooms
  │     └── underfloor/
  │           ├── layer0-kernel.ts    Crypto, hashing, HMAC, timestamps
  │           ├── layer1-conduit.ts   Message pipes, back-pressure, dead letters
  │           ├── layer2-reservoir.ts HOT→WARM→COLD tiered state
  │           ├── layer3-valve.ts     Policy gate, circuit breakers, rate limiters
  │           ├── layer4-manifold.ts  Pipeline, fan-out, saga orchestration
  │           ├── L0-kernel/          Thermostat · Chip · Battery
  │           ├── L1-conduit/         Flares · Locks · Doors
  │           ├── L2-reservoir/       Trunk · Spares · Coolant · Wash
  │           ├── L3-valve/           Brakes · Tint · Wipers · Fuel
  │           └── L4-manifold/        Engine · Wings · Mods · Exhaust
  │
  ├── sovereign-suite/    ← Document automation
  │     ├── shortcuts/sovereign-orchestrator.ts   8 automation pipelines
  │     ├── config/keywords.json                  15 category maps
  │     ├── config/routes.json                    Rule-based routing
  │     └── bin/                                  Vault setup, AI booster
  │
  ├── orchestration/      ← Workflow coordination
  │     ├── grandmaster_orchestrator.ts   OODA loop, resilience probe
  │     └── generation/                   Procedural generation (Python)
  │
  ├── legal/              ← Court document pipeline
  │     └── legal_automation.ts     CSV → HTML → sign → evidence store
  │
  ├── cert_master/        ← Exam certificate pipeline
  │     └── cert_master.ts          CSV → 100% pass gate → sign → store
  │
  ├── src/audit/          ← Audit trails
  │     ├── audit-service.ts        Structured JSONL event logging
  │     └── chain-of-custody.ts     Hash-chained JSONL + Ed25519 signatures
  │
  ├── db/                 ← Database
  │     ├── genesis_platform.sql    PostgreSQL schema (RLS, hash-chain ledger)
  │     └── genesis_db.ts           Typed PostgreSQL client
  │
  ├── static/             ← Developer Pro dashboard
  │     └── index.html              Drag-drop panels, pop menus, AI chat, room map
  │
  └── deploy/
        ├── Dockerfile              Multi-stage (Rust → TS → Node 20 slim)
        ├── docker-compose.yml      Read-only fs, non-root, no-new-privileges
        └── genesis-deploy.sh       Bootstrap script
```

## Quick Start

### Prerequisites

- Node.js 20+
- TypeScript 5+
- (Optional) PostgreSQL 15+ for persistent evidence storage
- (Optional) Docker for containerised deployment

### Install

```bash
cd bembrick-ultimate-edition
npm install
```

### Environment

Copy the example and fill in your values:

```bash
cp .env.example .env
source .env
```

Required:

```sh
export GENESIS_JWT_SECRET=<random-64-char-string>
```

Everything else has sensible defaults. See [.env.example](.env.example) for the full list.

### Run via CLI (GATE)

```bash
npx tsx src/index.ts health
npx tsx src/index.ts harden
npx tsx src/index.ts legal court_data.csv
npx tsx src/index.ts cert exam_data.csv
npx tsx src/index.ts compliance
npx tsx src/index.ts sign document.pdf
npx tsx src/index.ts token admin
npx tsx src/index.ts ai "plan database migration"
npx tsx src/index.ts ooda
npx tsx src/index.ts resilience
```

Every command runs through the Wheel state machine (BORN → GATED → ATTESTED → EXECUTING → SEALED).

### Run via GENESIS CLI (Unified)

The unified CLI provides direct access to all GENESIS subsystems:

```bash
# System health check
npm run genesis health

# Pentagon room commands
npm run genesis pentagon list           # List all 40 rooms
npm run genesis pentagon room spark generate  # Generate crypto key
npm run genesis pentagon layer L0       # Show kernel layer

# Network/router integration
npm run genesis network devices         # List attached devices
npm run genesis network traffic         # Traffic statistics
npm run genesis network wan             # WAN connection status

# AI assistant (multi-provider)
npm run genesis ai                      # Interactive chat mode
npm run genesis ai query "your message" # Single query

# Certificate management
npm run cert generate                   # Generate Ed25519 certificate
npm run cert list                       # List all certificates

# Evidence documentation
npm run genesis evidence interactive    # Document evidence
```

### Test Service Connections

Before using network or AI features, test your connections:

```bash
npm run connect
```

This validates:
- Pentagon architecture initialization
- Netgear router connectivity (if configured)
- AI provider availability (OpenAI/Anthropic/Ollama/Offline)
- Charter verification
- YubiKey configuration

### Run Health Daemon

Continuous system monitoring with alerting:

```bash
npm run daemon
```

Optional: expose metrics endpoint:
```bash
DAEMON_METRICS_PORT=9090 npm run daemon
# Then: curl http://localhost:9090/health
```

### Run via HTTP Server

```bash
npx tsx src/server.ts
# Listening on http://localhost:8080
# Dashboard at http://localhost:8080/
```

### Run Tests

```bash
npm test
```

### Run via Docker

```bash
sudo deploy/genesis-deploy.sh --docker
# or:
docker compose up --build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Developer Pro dashboard |
| `GET` | `/health` | System health (device + policy + audit) |
| `POST` | `/evaluate` | PDP: evaluate a policy request |
| `POST` | `/authenticate` | SSO: validate JWT |
| `POST` | `/authorise` | SSO: check action authorization |
| `POST` | `/issue-token` | SSO: issue JWT (owner bootstrap) |
| `POST` | `/sign` | Ed25519: sign data |
| `POST` | `/verify-signature` | Ed25519: verify signature |
| `GET` | `/audit/chain` | Verify custody chain integrity |
| `POST` | `/audit/record` | Record custody event |
| `GET` | `/shield/health` | Quantum Shield device health |
| `GET` | `/shield/hardening` | CIS benchmark hardening report |
| `POST` | `/ai/query` | AI: general-purpose query |
| `POST` | `/ai/draft` | AI: legal document draft |
| `POST` | `/ai/plan` | AI: automation change planning |
| `POST` | `/ai/summarise` | AI: evidence summarisation |
| `POST` | `/ai/autogen` | AI: auto-generate pipeline |

## Pentagon Framework

One structure from outside. Multi-plumbed infrastructure underneath.

```
Consumer → pentagon.command("health")
             │
             ▼
         ╔═════════╗
         ║ Pentagon ║  5 public facets: CMD · IDN · EVD · EXE · OUT
         ╠═════════╣
         ║ L4 Manifold  ║  Engine · Wings · Mods · Exhaust
         ║ L3 Valve     ║  Brakes · Tint · Wipers · Fuel
         ║ L2 Reservoir ║  Trunk · Spares · Coolant · Wash
         ║ L1 Conduit   ║  Flares · Locks · Doors
         ║ L0 Kernel    ║  Thermostat · Chip · Battery
         ╚══════════════╝
```

### Five Facets

| Facet | Method | Purpose |
|-------|--------|---------|
| **CMD** | `command(name, input?)` | Entry point — routes to rooms + internals |
| **IDN** | `check(principal, action, resource)` | Policy evaluation — ALLOW/DENY |
| **EVD** | `store / retrieve / history` | Versioned evidence storage |
| **EXE** | `execute(action, steps, input?, pattern?)` | Pipeline, fan-out, or saga |
| **OUT** | `output(type, artifacts)` | Bundled output with integrity hash |

### 40 Rooms (8 per Layer)

| Layer | Rooms | Purpose |
|-------|-------|---------|
| **L0 Kernel** | thermostat, chip, clock, spark, battery, fuse, ground, coil | Crypto primitives, timing, entropy, power management |
| **L1 Conduit** | flares, locks, doors, relay, antenna, buffer, bridge, tunnel | Messaging, synchronization, routing, connectivity |
| **L2 Reservoir** | trunk, spares, coolant, wash, glove, tank, pump, filter | State storage, caching, data sanitization |
| **L3 Valve** | brakes, tint, wipers, fuel, gauges, gears, horn, seatbelts | Policy enforcement, access control, safety systems |
| **L4 Manifold** | engine, wings, mods, exhaust, wheels, bumper, mirrors, chassis | Orchestration, scaling, plugins, observability |

All 40 rooms are accessible via the CMD facade:
```bash
npm run genesis pentagon room <room-name> <action> [payload]
```

## Sovereign Suite

Document automation subsystem — intake, classify, route to vault.

```
Mobile Capture → Intake → Classifier → Router → iCloud Drive Vault
                           │
                           ├── Rules (routes.json)
                           ├── Keywords (keywords.json)
                           ├── AI Booster (Anthropic API)
                           └── Unsorted fallback
```

8 automation pipelines: Finish the Job, Intake-Collect, Classifier-Route, Legal Pack, Finance Pack, ATO Pack, Trust Pack, Health Pack.

See [sovereign-suite/SOVEREIGN-SUITE.md](sovereign-suite/SOVEREIGN-SUITE.md).

## Developer Pro Dashboard

Immersive web UI served at `GET /`.

| Feature | Access |
|---------|--------|
| Pop menu | Click hamburger or press `M` |
| Command palette | `Ctrl+K` |
| Drag-drop panels | Grab panel headers to reorder |
| AI chat | Inline assistant with quick-action chips |
| Auto-generate | 7 one-click pipelines |
| Room map | Click any Pentagon room for live status |
| API explorer | Click endpoints to fire requests |
| Toast notifications | Auto-dismiss on actions |

## Key Design Decisions

- **Fail-closed security.** Unknown state = compromise state. The Wheel kills any spoke that attempts an illegal state transition. Default is DENY.
- **Zero external HTTP dependencies.** The server uses Node 20 built-in `http`. No Express, no axios.
- **Ed25519 everywhere.** All signing uses Ed25519 via Node 20's native `crypto.sign()`.
- **Chained audit trails.** Both chain-of-custody and PostgreSQL ledger use hash-chaining. Tampering breaks the chain.
- **Layer dependency rule.** Pentagon layers only reach DOWN (L4→L3→L2→L1→L0), never sideways or up.
- **AI is optional.** Only activates when `GENESIS_AI_API_KEY` is set. Everything else works without it.
- **No PII in code.** All personal identifiers parameterised via environment variables.
- **Injectable dependencies.** PDF rendering and storage are interfaces — swap in real implementations as needed.

## File Count

| Type | Count |
|------|-------|
| TypeScript | 48 |
| Python | 7 |
| Markdown/Spec | 12 |
| Shell | 5 |
| Rust | 3 |
| SQL | 1 |
| HTML/CSS | 1 |
| JSON Config | 4 |
| **Total** | **81+** |

## Security Notes

- All personal information removed. Configuration uses `${ENV_VAR}` placeholders.
- Private keys generated on first run, stored with 600 permissions.
- Docker: read-only filesystem, non-root user, `no-new-privileges`.
- AI outputs include mandatory disclaimers and are audit-logged.
- No credentials, API keys, or personal data in codebase or git history.

## License

Apache 2.0 — see [LICENSE](LICENSE)
