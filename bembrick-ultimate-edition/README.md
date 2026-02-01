# GENESIS 2.0

A hardened automation stack for document generation, device management,
cryptographic audit trails, and AI-assisted workflows.

## Architecture

```
src/index.ts          ← GATE: single CLI entry point
  │
  ├── src/wheel/      ← Wheel state machine (every command runs through here)
  │     └── wheel-orchestrator.ts   6-phase lifecycle: BORN→GATED→ATTESTED→EXECUTING→SEALED|DEAD
  │
  ├── src/core/       ← Policy engine
  │     ├── evaluator.ts            PDP — evaluates ALLOW/DENY decisions
  │     └── doctrine.ts             Rule definitions
  │
  ├── identity/       ← Authentication & signing
  │     ├── ed25519_signer.ts       Ed25519 keypair generation, file/object signing
  │     └── sso_master.ts           JWT issue/authenticate/authorise (HMAC-SHA256)
  │
  ├── security/       ← Defense layer
  │     ├── quantum_shield_core.ts  OS health checks, hardening verification, drift detection
  │     ├── tolkien_key.ts          Multi-strand HMAC key derivation + beacon chain
  │     ├── certificate_manager.py  SSL/TLS chain validation, expiry monitoring, pinning
  │     └── fleetdm_client.ts       FleetDM API client for device management
  │
  ├── legal/          ← Court document pipeline
  │     └── legal_automation.ts     CSV → HTML → PDF → Ed25519 sign → evidence store
  │
  ├── cert_master/    ← Exam certificate pipeline
  │     └── cert_master.ts          CSV → 100% pass gate → PDF → sign → evidence store
  │
  ├── ai/             ← LLM integration (optional)
  │     └── ai_orchestrator.ts      Legal drafting, evidence summary, automation planning
  │
  ├── orchestration/  ← Workflow coordination
  │     └── grandmaster_orchestrator.ts   Wires all services, every workflow through Wheel.spin()
  │
  ├── src/audit/      ← Audit trails
  │     ├── audit-service.ts        Structured JSONL event logging
  │     └── chain-of-custody.ts     Append-only JSONL with chained SHA-256 + Ed25519 signatures
  │
  ├── db/             ← Database
  │     ├── genesis_platform.sql    PostgreSQL schema (RLS, hash-chain ledger, audit)
  │     └── genesis_db.ts           Typed PostgreSQL client
  │
  ├── src/server.ts   ← HTTP server (12 endpoints, zero Express)
  │
  ├── deploy/         ← Deployment
  │     └── genesis-deploy.sh       Bootstrap script (user, dirs, keys, Docker)
  │
  └── Docker
        ├── Dockerfile              Multi-stage build (Rust → TS → Node 20 slim)
        ├── docker-compose.yml      Read-only filesystem, non-root, no-new-privileges
        └── .dockerignore
```

## Quick Start

### Prerequisites

- Node.js 20+
- TypeScript 5+
- (Optional) PostgreSQL 15+ for persistent evidence storage
- (Optional) Docker for containerised deployment

### Environment Variables

Required:

```sh
export GENESIS_KEY_DIR=./data/keys
export GENESIS_AUDIT_DIR=./data/audit
export GENESIS_EVIDENCE_DIR=./data/evidence
export GENESIS_JWT_SECRET=your-secret-here
```

Optional:

```sh
export GENESIS_PDP_PORT=8080
export GENESIS_OWNER_ID=owner
export GENESIS_JURISDICTION=general
export GENESIS_LLM_API_KEY=sk-...          # enables AI features
export GENESIS_DATABASE_URL=postgres://...   # enables persistent storage
export GENESIS_FLEET_API_URL=https://...     # enables FleetDM
export GENESIS_FLEET_API_KEY=...
```

### Run via CLI (GATE)

```sh
npx ts-node src/index.ts health
npx ts-node src/index.ts harden
npx ts-node src/index.ts legal court_data.csv
npx ts-node src/index.ts cert exam_data.csv
npx ts-node src/index.ts compliance
npx ts-node src/index.ts sign document.pdf
npx ts-node src/index.ts token admin
npx ts-node src/index.ts ai "plan database migration"
```

Every command runs through the Wheel state machine (BORN → GATED → ATTESTED → EXECUTING → SEALED).

### Run via HTTP Server

```sh
npx ts-node src/server.ts
# Listening on http://localhost:8080

curl http://localhost:8080/health
curl -X POST http://localhost:8080/evaluate -d '{"principal":"user","resource":"doc","action":"read"}'
curl -X POST http://localhost:8080/sign -d '{"data":"hello"}'
```

### Run via Docker

```sh
sudo deploy/genesis-deploy.sh --docker
# or manually:
docker compose up --build
```

## File Count

| Type | Count |
|------|-------|
| TypeScript | 29 |
| Markdown/Spec | 9 |
| Python | 7 |
| Shell | 5 |
| Rust | 3 |
| SQL | 1 |
| **Total** | **63** |

## Key Design Decisions

**Fail-closed security.** Unknown state = compromise state. The Wheel kills any
spoke that attempts an illegal state transition. Default is DENY.

**Zero external HTTP dependencies.** The server uses Node 20 built-in `http`.
The FleetDM client uses built-in `fetch`. No Express, no axios.

**Ed25519 everywhere.** All document signing, chain-of-custody records, and
compliance reports use Ed25519 via Node 20's native `crypto.sign()`.

**Chained audit trails.** Both the chain-of-custody module and the PostgreSQL
ledger use hash-chaining — each record includes the hash of the previous record.
Tampering with any entry breaks the chain.

**Injectable dependencies.** PDF rendering and evidence storage are interfaces.
Swap in Puppeteer for real PDFs, swap in PostgreSQL for persistent storage.
Standalone mode works with HTML buffers and in-memory store.

**AI is optional.** The AI orchestrator only activates if `GENESIS_LLM_API_KEY`
is set. The `openai` package is dynamically imported. Everything else works
without it.

## Modules

### Wheel State Machine (`src/wheel/wheel-orchestrator.ts`)

Every operation goes through 6 phases:

1. **BORN** — Spoke created with deterministic SHA-256 ID
2. **GATED** — Policy evaluator checks authorization
3. **ATTESTED** — Pre-execution integrity check
4. **EXECUTING** — The actual work runs (with deadline enforcement)
5. **SEALED** — Success: chained receipt recorded
6. **DEAD** — Failure: spoke killed, reason logged

Illegal state transitions (e.g. BORN → EXECUTING) immediately kill the spoke.

### Ed25519 Signer (`identity/ed25519_signer.ts`)

- Generates Ed25519 keypairs and persists them as PEM files
- Signs bytes, files, and JSON objects
- Static `verify()` method for independent verification

### Chain of Custody (`src/audit/chain-of-custody.ts`)

- Append-only JSONL file with per-record Ed25519 signatures
- 5-check verification: sequence, prev-hash, content-hash, chain-hash, signature
- CLI: `demo [output-dir]` and `verify <custody.jsonl>`

### Tolkienian Key (`security/tolkien_key.ts`)

- Multi-factor key derivation via iterated HMAC
- Minimum 2 strands required (multi-factor enforcement)
- Activation tokens ("Ea" command) with timing-safe verification
- Silmaril beacon chain for integrity proofs
- Key zeroization on destroy

### Certificate Manager (`security/certificate_manager.py`)

- SSL/TLS chain validation against system, certifi, or custom CA bundle
- Expiry monitoring with configurable thresholds
- SHA-256 certificate pinning
- CLI: `python certificate_manager.py domain1.com domain2.com`

### Legal Automation (`legal/legal_automation.ts`)

- CSV parser with quoted-field support
- HTML template engine with `{{variable}}` substitution
- Pipeline: parse CSV → render HTML → sign → store evidence → write manifest

### Cert-Master (`cert_master/cert_master.ts`)

- Strict 100% pass policy (score must equal max_score)
- Landscape certificate template
- Pipeline: parse CSV → pass/fail gate → render → sign → store

## Security Notes

- All personal information has been removed. Configuration uses `${ENV_VAR}` placeholders.
- Private keys are generated on first run and stored with 600 permissions.
- The Docker setup uses read-only filesystem, non-root user, and `no-new-privileges`.
- AI outputs include mandatory disclaimers and are logged to the audit trail.
- No credentials, API keys, or personal data exist anywhere in the codebase or git history.

## License

Apache 2.0 — see `licenses/Apache-2.0.txt`
