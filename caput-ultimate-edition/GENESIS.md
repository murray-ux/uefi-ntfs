# GENESIS 2.0 — Master Reference

> Charter-governed. Audit-trailed. AI-assisted. YubiKey-secured.

---

## Quick Start

```bash
# Windows
GO.bat

# Linux/Mac
chmod +x go.sh && ./go.sh

# Or manually
npm install
npm run setup
npm start
```

Open: **http://localhost:8080**

---

## Architecture

```
GENESIS 2.0
│
├── src/server.ts                 ← HTTP API (25 endpoints)
│
├── pentagon/pentagon.ts          ← THE PENTAGON (single facade)
│   │
│   ├── 5 PUBLIC FACETS
│   │   ├── CMD  → command("health" | "engine" | ...)
│   │   ├── IDN  → check(principal, action, resource)
│   │   ├── EVD  → store() / retrieve() / history()
│   │   ├── EXE  → execute(pipeline | fan-out | saga)
│   │   └── OUT  → output(type, artifacts) → signed bundle
│   │
│   └── 5 UNDERFLOOR LAYERS (40 rooms total)
│       │
│       ├── L0 Kernel (7 rooms)
│       │   Thermostat  — thermal zones, alarms
│       │   Chip        — entropy, random generation
│       │   Battery     — capacity tracking
│       │   Clock       — scheduling, timers, drift detection
│       │   Compass     — service discovery, waypoints
│       │   Fuse        — circuit protection, cooldown
│       │   Spark       — bootstrap orchestration
│       │
│       ├── L1 Conduit (7 rooms)
│       │   Flares      — alerts, notifications
│       │   Locks       — distributed locking
│       │   Doors       — request routing
│       │   Horn        — broadcast announcements
│       │   Mirrors     — introspection, probes
│       │   Antenna     — external signal ingestion
│       │   Relay       — message forwarding
│       │
│       ├── L2 Reservoir (8 rooms)
│       │   Trunk       — document storage
│       │   Spares      — backup snapshots
│       │   Coolant     — cache management
│       │   Wash        — data sanitization
│       │   Tank        — stream buffering
│       │   Filter      — data transformation
│       │   Jack        — layer elevation
│       │   Glove       — ephemeral secrets
│       │
│       ├── L3 Valve (9 rooms)
│       │   Brakes      — emergency stops
│       │   Tint        — data masking
│       │   Wipers      — scheduled cleanup
│       │   Fuel        — quota management
│       │   Clutch      — pipeline engagement
│       │   Gears       — throughput control
│       │   Pedals      — input throttling
│       │   Gauges      — metric monitoring
│       │   Seatbelts   — rollback guards
│       │
│       └── L4 Manifold (9 rooms)
│           Engine      — workflow execution
│           Wings       — parallel lanes
│           Mods        — plugin system
│           Exhaust     — telemetry output
│           Turbo       — burst processing
│           Chassis     — module mounting
│           Bumper      — error boundaries
│           Spoiler     — stability control
│           Wheels      — rotation scheduling
│
├── orchestration/grandmaster_orchestrator.ts
│   ├── onboardDevice()           ← FleetDM enrol → harden → audit
│   ├── runLegalBatch()           ← CSV → PDF → sign → evidence
│   ├── runCertBatch()            ← CSV → 100% gate → PDF → sign
│   ├── healthCheck()             ← Shield + ledger integrity
│   ├── generateComplianceReport()← Signed compliance bundle
│   ├── runOodaCycle()            ← OODA cyber-defence loop
│   └── resilienceProbe()         ← Chaos testing
│
├── security/
│   ├── quantum_shield_core.ts    ← Device health + CIS hardening
│   ├── yubikey_bridge.ts         ← Hardware MFA (4 modes)
│   └── fleetdm_client.ts         ← MDM integration
│
├── identity/
│   ├── ed25519_signer.ts         ← Cryptographic signing
│   └── sso_master.ts             ← JWT authentication
│
├── src/wheel/wheel-orchestrator.ts
│   └── State machine: GATE → ATTEST → EXECUTE → SEAL/DEAD
│
└── static/index.html             ← Developer Pro Dashboard
    ├── Drag-drop panels
    ├── Command palette (Ctrl+K)
    ├── AI Chat with offline fallback
    ├── Pentagon room map (40 rooms)
    └── API Explorer (25 endpoints)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | System health |
| POST | `/evaluate` | Policy decision |
| POST | `/authenticate` | JWT validation |
| POST | `/authorise` | Authorization check |
| POST | `/issue-token` | Issue JWT |
| POST | `/sign` | Ed25519 sign |
| POST | `/verify-signature` | Verify signature |
| GET | `/audit/chain` | Chain integrity |
| POST | `/audit/record` | Record event |
| GET | `/shield/health` | Device health |
| GET | `/shield/hardening` | CIS checks |
| POST | `/ai/query` | AI query |
| POST | `/ai/draft` | Legal draft |
| POST | `/ai/plan` | Plan change |
| POST | `/ai/summarise` | Summarise evidence |
| POST | `/ai/autogen` | Auto-generate pipeline |
| GET | `/yubikey/status` | YubiKey bridge stats |
| POST | `/yubikey/register/options` | WebAuthn registration |
| POST | `/yubikey/register/verify` | Store credential |
| POST | `/yubikey/auth/options` | WebAuthn authentication |
| POST | `/yubikey/auth/verify` | Verify authentication |
| POST | `/yubikey/challenge` | HMAC challenge |
| POST | `/yubikey/challenge/verify` | Verify HMAC response |
| POST | `/yubikey/otp` | Validate OTP |
| POST | `/yubikey/mfa` | Unified MFA |
| GET | `/network/status` | Router status |
| GET | `/network/devices` | Connected devices |
| GET | `/network/traffic` | Bandwidth stats |
| GET | `/network/wifi` | WiFi networks |
| GET | `/network/security` | Firewall/Armor status |
| POST | `/network/reboot` | Reboot router |
| POST | `/network/block` | Block device by MAC |
| POST | `/network/unblock` | Unblock device |
| POST | `/network/guest-wifi` | Guest WiFi control |
| GET | `/network/stats` | Bridge diagnostics |

---

## YubiKey Integration

### Mode 1: OTP (Simplest)

```bash
# 1. Get API credentials: https://upgrade.yubico.com/getapikey/

# 2. Configure
echo 'GENESIS_YUBIKEY_MODE=otp' >> .env
echo 'GENESIS_YUBIKEY_CLIENT_ID=12345' >> .env
echo 'GENESIS_YUBIKEY_SECRET_KEY=base64secret=' >> .env

# 3. Use — touch YubiKey, it types OTP
curl -X POST http://localhost:8080/yubikey/otp \
  -H "Content-Type: application/json" \
  -d '{"otp":"ccccccccccccbirheelhklfhrvtjbitjjdtlftttdcte"}'
```

### Mode 2: Challenge-Response (CLI)

```bash
# 1. Generate secret
SECRET=$(openssl rand -hex 20)
echo $SECRET

# 2. Program YubiKey slot 2
ykpersonalize -2 -ochal-resp -ochal-hmac -ohmac-lt64 -oserial-api-visible

# 3. Configure
echo 'GENESIS_YUBIKEY_MODE=challenge-response' >> .env
echo "GENESIS_YUBIKEY_HMAC_SECRET=$SECRET" >> .env

# 4. Get challenge
curl -X POST http://localhost:8080/yubikey/challenge \
  -H "Content-Type: application/json" \
  -d '{"userId":"owner"}'
# Returns: {"challenge":"abc123...","instruction":"Run: ykchalresp -2 abc123..."}

# 5. Compute response (touch YubiKey)
RESPONSE=$(ykchalresp -2 abc123...)

# 6. Verify
curl -X POST http://localhost:8080/yubikey/challenge/verify \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"owner\",\"challenge\":\"abc123...\",\"response\":\"$RESPONSE\"}"
```

### Mode 3: WebAuthn (Browser)

```bash
# Configure
echo 'GENESIS_YUBIKEY_MODE=webauthn' >> .env
echo 'GENESIS_YUBIKEY_RP_ID=localhost' >> .env

# Use via browser — endpoints return options for:
# - navigator.credentials.create()  → /yubikey/register/options + /verify
# - navigator.credentials.get()     → /yubikey/auth/options + /verify
```

---

## Environment Variables

```bash
# ── Required ──────────────────────────────────────────────────
GENESIS_JWT_SECRET=           # Min 32 chars (openssl rand -hex 32)

# ── Directories ───────────────────────────────────────────────
GENESIS_KEY_DIR=./data/keys
GENESIS_AUDIT_DIR=./data/audit
GENESIS_EVIDENCE_DIR=./data/evidence
GENESIS_STATIC_DIR=./static

# ── Server ────────────────────────────────────────────────────
GENESIS_PDP_PORT=8080
GENESIS_OWNER_ID=owner

# ── YubiKey ───────────────────────────────────────────────────
GENESIS_YUBIKEY_MODE=otp      # otp | webauthn | challenge-response
GENESIS_YUBIKEY_RP_ID=localhost
GENESIS_YUBIKEY_CLIENT_ID=    # Yubico API client ID
GENESIS_YUBIKEY_SECRET_KEY=   # Yubico API secret
GENESIS_YUBIKEY_HMAC_SECRET=  # For challenge-response mode

# ── AI (optional) ─────────────────────────────────────────────
GENESIS_AI_API_KEY=           # OpenAI-compatible API key
GENESIS_AI_BASE_URL=https://api.openai.com/v1

# ── FleetDM (optional) ────────────────────────────────────────
GENESIS_FLEET_API_URL=
GENESIS_FLEET_API_KEY=
```

---

## NPM Scripts

```bash
npm run setup     # First-run setup (creates dirs, generates .env)
npm start         # Start server on :8080
npm run dev       # Start with watch mode
npm run gate      # Run policy gate check
npm run health    # Run health check
npm run harden    # Run CIS hardening check
npm run ooda      # Run OODA cyber-defence cycle
npm test          # Run test suite
```

---

## Grandmaster CLI

```bash
# Health check
npx tsx orchestration/grandmaster_orchestrator.ts health-check

# OODA cyber-defence cycle
npx tsx orchestration/grandmaster_orchestrator.ts ooda

# Resilience probe (chaos test)
npx tsx orchestration/grandmaster_orchestrator.ts resilience

# Compliance report
npx tsx orchestration/grandmaster_orchestrator.ts compliance-report

# Legal document batch
npx tsx orchestration/grandmaster_orchestrator.ts legal-batch ./data/cases.csv

# Certificate batch
npx tsx orchestration/grandmaster_orchestrator.ts cert-batch ./data/exams.csv

# Device onboarding (requires FleetDM)
npx tsx orchestration/grandmaster_orchestrator.ts onboard-device msi-titan owner@example.com
```

---

## Pentagon Usage

```typescript
import { Pentagon } from "./pentagon/pentagon";

// Create
const pentagon = new Pentagon({
  dataDir: "./data",
  ownerId: "owner",
});

// CMD facet — execute commands
const health = await pentagon.command("health");
const engine = await pentagon.command("engine");
const turbo = await pentagon.command("turbo");

// IDN facet — check authorization
const check = pentagon.check("user123", "deploy:app", "server:prod", {
  mfaPassed: true,
  riskScore: 0,
});

// EVD facet — store evidence
const record = pentagon.store("finding:001", { severity: "high" });
const data = pentagon.retrieve("finding:001");
const versions = pentagon.history("finding:001");

// EXE facet — run workflows
const receipt = await pentagon.execute("my:pipeline", [
  { name: "step-1", fn: async () => ({ done: true }) },
  { name: "step-2", fn: async (input) => ({ ...input, step2: true }) },
]);

// OUT facet — generate bundles
const bundle = await pentagon.output("report", [
  { name: "summary.json", data: JSON.stringify({ status: "ok" }) },
  { name: "detail.txt", data: "All checks passed" },
]);
```

---

## Room Commands

Query any of the 40 rooms via the CMD facet:

```typescript
// L0 Kernel
await pentagon.command("thermostat");  // Thermal zones
await pentagon.command("chip");        // Entropy stats
await pentagon.command("battery");     // Capacity
await pentagon.command("clock");       // Timers, drift
await pentagon.command("compass");     // Service discovery
await pentagon.command("fuse");        // Circuit states
await pentagon.command("spark");       // Bootstrap status

// L1 Conduit
await pentagon.command("flares");      // Alert stats
await pentagon.command("locks");       // Lock stats
await pentagon.command("doors");       // Routing stats
await pentagon.command("horn");        // Broadcast stats
await pentagon.command("mirrors");     // Probe results
await pentagon.command("antenna");     // Signal stats
await pentagon.command("relay");       // Forward stats

// L2 Reservoir
await pentagon.command("trunk");       // Document stats
await pentagon.command("spares");      // Snapshot manifest
await pentagon.command("coolant");     // Cache stats
await pentagon.command("wash");        // Sanitization stats
await pentagon.command("tank");        // Buffer stats
await pentagon.command("filter");      // Pipeline stats
await pentagon.command("jack");        // Elevation stats
await pentagon.command("glove");       // Secret stats

// L3 Valve
await pentagon.command("brakes");      // Stop stats
await pentagon.command("tint");        // Mask stats
await pentagon.command("wipers");      // Cleanup stats
await pentagon.command("fuel");        // Quota gauge
await pentagon.command("clutch");      // Engagement stats
await pentagon.command("gears");       // Throughput stats
await pentagon.command("pedals");      // Throttle stats
await pentagon.command("gauges");      // Metric dashboard
await pentagon.command("seatbelts");   // Rollback stats

// L4 Manifold
await pentagon.command("engine");      // Execution stats
await pentagon.command("wings");       // Lane stats
await pentagon.command("mods");        // Plugin stats
await pentagon.command("exhaust");     // Telemetry snapshot
await pentagon.command("turbo");       // Boost stats
await pentagon.command("chassis");     // Mount manifest
await pentagon.command("bumper");      // Impact stats
await pentagon.command("spoiler");     // Stability stats
await pentagon.command("wheels");      // Rotation stats
```

---

## Dashboard Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+K` | Open command palette |
| `M` | Toggle menu |
| `Escape` | Close palette/menu |
| `Enter` | Execute selected command |

---

## File Structure

```
caput-ultimate-edition/
├── GO.bat                    # Windows launcher
├── go.sh                     # Linux/Mac launcher
├── package.json              # NPM config
├── .env.example              # Environment template
├── GENESIS.md                # This file
├── README.md                 # Project overview
├── CONTRIBUTING.md           # Dev guidelines
├── LICENSE                   # Apache-2.0
│
├── scripts/
│   └── setup.js              # First-run setup
│
├── src/
│   ├── server.ts             # HTTP API server
│   ├── index.ts              # CLI entry
│   ├── core/
│   │   ├── evaluator.ts      # Policy engine
│   │   └── doctrine.ts       # Policy rules
│   ├── audit/
│   │   ├── audit-service.ts  # Audit logging
│   │   └── chain-of-custody.ts
│   └── wheel/
│       └── wheel-orchestrator.ts
│
├── pentagon/
│   ├── pentagon.ts           # Main facade
│   ├── PENTAGON.md           # Architecture docs
│   └── underfloor/
│       ├── layer0-kernel.ts
│       ├── layer1-conduit.ts
│       ├── layer2-reservoir.ts
│       ├── layer3-valve.ts
│       ├── layer4-manifold.ts
│       ├── L0-kernel/        # 7 rooms
│       ├── L1-conduit/       # 7 rooms
│       ├── L2-reservoir/     # 8 rooms
│       ├── L3-valve/         # 9 rooms
│       └── L4-manifold/      # 9 rooms
│
├── orchestration/
│   └── grandmaster_orchestrator.ts
│
├── security/
│   ├── quantum_shield_core.ts
│   ├── yubikey_bridge.ts
│   └── fleetdm_client.ts
│
├── identity/
│   ├── ed25519_signer.ts
│   └── sso_master.ts
│
├── ai/
│   └── ai_orchestrator.ts
│
├── src/lib/                      # GENESIS 2.0 Core Modules (Biblical Names)
│   ├── genesis-init.js           # 6-phase bootstrap — single entry point
│   ├── kol-logger.js             # KOL (Voice) — Shared logging utility
│   ├── merkava-command.js        # MERKAVA — Master Command Center
│   ├── tzofeh-sentinel.js        # TZOFEH — Watchdog Sentinel
│   ├── malakh-bus.js             # MALAKH — High-perf Message Bus
│   ├── ruach-neural.js           # RUACH Neural Processing Engine
│   ├── ohr-observability.js      # OHR Observability System
│   ├── hadaat-decision.js        # HADAAT Decision Engine
│   ├── keruv-security.js         # KERUV Zero-Trust Security Gateway
│   ├── nephesh-hooks.js          # NEPHESH Claude Code Hooks
│   ├── eben-evidence.js          # EBEN Evidence Management System
│   ├── shinobi-security.js       # SHINOBI Ninja Security Layer
│   ├── tetsuya-defense.js        # TETSUYA Defense & Risk Management
│   └── viz-engine.js             # VIZ Visualization Engine
│
├── legal/
│   └── legal_automation.ts
│
├── cert_master/
│   └── cert_master.ts
│
├── static/
│   └── index.html            # Developer Pro Dashboard
│
├── test/
│   └── pentagon.test.ts      # 40 room tests
│
└── data/                     # Runtime data (gitignored)
    ├── keys/
    ├── audit/
    └── evidence/
```

---

## Network Integration (Netgear)

```bash
# Configure in .env
GENESIS_NETGEAR_ROUTER_IP=192.168.1.1
GENESIS_NETGEAR_ADMIN_USER=admin
GENESIS_NETGEAR_ADMIN_PASS=your-password

# Query router status
curl http://localhost:8080/network/status

# List connected devices
curl http://localhost:8080/network/devices

# Traffic stats
curl http://localhost:8080/network/traffic

# Block a device
curl -X POST http://localhost:8080/network/block \
  -H "Content-Type: application/json" \
  -d '{"mac":"AA:BB:CC:DD:EE:FF"}'

# Control guest WiFi
curl -X POST http://localhost:8080/network/guest-wifi \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"ssid":"Guest-Network","password":"guest123"}'
```

Supports:
- Nighthawk routers (R7000, R8000, RAX series)
- Orbi mesh systems
- ReadyNAS devices
- NETGEAR Armor (if enabled)

---

## Owner Configuration

Owner profile stored in `config/owner-profile.json`:

```json
{
  "owner": {
    "id": "admin@caput.system",
    "name": "CAPUT Admin",
    "role": "ADMIN",
    "exclusiveOwner": true
  },
  "authorization": {
    "role": "ADMIN",
    "level": "exclusive",
    "permissions": ["*"]
  },
  "emails": {
    "primary": "admin@caput.system",
    "all": [
      "admin@caput.system",
      "admin@caput.system",
      "admin@caput.system",
      "admin@caput.system",
      "admin@caput.system",
      "admin@caput.system",
      "Miet@live.com",
      "Murray@firetechnics.com.au",
      "Admin@alternatemaintenance.com.au"
    ]
  },
  "yubikey": {
    "model": "YubiKey 5C FIPS",
    "serial": "31695265"
  },
  "domains": [
    "caput.system",
    "caput.system",
    "caput.system",
    "firetechnics.com.au",
    "alternatemaintenance.com.au"
  ],
  "businesses": {
    "firetechnics": { "email": "Murray@firetechnics.com.au" },
    "alternatemaintenance": { "email": "Admin@alternatemaintenance.com.au" }
  }
}
```

---

## GENESIS 2.0 Core Modules (Biblical Names)

| Module | Hebrew | Meaning | Purpose |
|--------|--------|---------|---------|
| **RUACH** | רוח | Spirit/Wind | Neural Processing Engine — AI inference, embeddings |
| **OHR** | אור | Light | Observability System — metrics, tracing, logging |
| **HADAAT** | הדעת | Knowledge | Decision Engine — intelligent routing, policy decisions |
| **KERUV** | כרוב | Cherubim | Zero-Trust Security Gateway — mTLS, RBAC/ABAC |
| **NEPHESH** | נפש | Soul | Claude Code Hooks — 13-hook lifecycle integration |
| **EBEN** | אבן | Stone | Evidence Management — court-grade vault, chain of custody |
| **SHINOBI** | 忍び | Ninja | Security Layer — hidden admin, shadow protection |
| **TETSUYA** | 鉄夜 | Iron Night | Defense & Risk Management — AI agents, shockwave mitigation |
| **VIZ** | — | Visualize | Visualization Engine — dashboards, real-time displays |
| **KOL** | קול | Voice | Shared Logging Utility — structured output, JSON mode, colour-coded |

### EBEN Evidence Vault (Admin-Only)

```javascript
import { Eben } from './src/lib/eben-evidence.js';

const eben = new Eben({ vaultPath: './data/evidence' });

// Store court-grade evidence
const evidence = await eben.store({
  caseId: 'CASE-2025-001',
  type: 'document',
  content: buffer,
  metadata: { source: 'discovery', classification: 'confidential' }
});

// Automatic chain of custody
const chain = await eben.getChainOfCustody(evidence.id);

// Australian PII redaction
const redacted = eben.redactPII(document, ['medicare', 'tfn', 'addresses']);
```

### SHINOBI Shadow Access

```javascript
import { Shinobi } from './src/lib/shinobi-security.js';

const shinobi = new Shinobi({ mode: 'stealth' });

// Hidden gateway (Konami code: ↑↑↓↓←→←→BA)
shinobi.activateShadowGateway(secretKnockSequence);

// Access levels: NONE → GUEST → USER → TRUSTED → OPERATOR → ADMIN → SHADOW_ADMIN → SHOGUN
const access = shinobi.checkAccess(identity, 'SHADOW_ADMIN');
```

### TETSUYA Risk Management

```javascript
import { Tetsuya } from './src/lib/tetsuya-defense.js';

const tetsuya = new Tetsuya();

// AI Assessment Agent
const assessment = await tetsuya.assessRisk({
  component: 'database-cluster',
  metrics: currentMetrics
});

// Repair Agent dispatch
if (assessment.riskLevel > 0.7) {
  await tetsuya.dispatchRepairAgent(assessment.componentId);
}

// Shockwave Mitigation
tetsuya.activateMitigationNode('cascade-prevention');
```

---

## Control System

| Module | Script | Meaning | Purpose |
|--------|--------|---------|---------|
| **MERKAVA** | מרכבה | Chariot | Master Command Center — module orchestration, directives, sovereign controls |
| **TZOFEH** | צופה | Watchman | Sentinel Watchdog — anomaly detection, guardians, canary deployments |
| **MALAKH** | מלאך | Messenger | Message Bus — pub/sub, circuit breakers, distributed tracing |
| **KISSEH** | כסא | Throne | Control Panel UI — module grid, health ring, alert dashboard |

### Bootstrap (genesis-init.js)

```bash
# Start GENESIS with all modules
node src/lib/genesis-init.js

# Custom port
node src/lib/genesis-init.js --port 8080

# Set watch level
node src/lib/genesis-init.js --watch-level sentinel
```

Boot sequence:
1. **Phase 1** — MERKAVA + MALAKH (core infrastructure)
2. **Phase 2** — KERUV + SHINOBI + EBEN (security & storage)
3. **Phase 3** — RUACH + OHR + HADAAT + TETSUYA + NEPHESH + VIZ (AI & processing)
4. **Phase 4** — Wire all modules through MERKAVA, configure MALAKH topics
5. **Phase 5** — Start Dashboard server
6. **Phase 6** — TZOFEH starts monitoring with guardian daemons

### MERKAVA Command Center

```javascript
// Send directive to a module
await merkava.sendDirective('TETSUYA', 'assessRisk', { component: 'db' });

// Broadcast to all modules
await merkava.broadcast('healthCheck');

// Execute workflow
await merkava.executeWorkflow('security:sweep');

// Initiate lockdown
await merkava.inititateLockdown('Security breach detected');

// Sovereign control (MFA required)
await merkava.sovereign.authorize({ passphrase, yubikey: otp });
await merkava.sovereign.executePrivileged('fullReset');
```

### TZOFEH Sentinel

```javascript
// Deploy guardian daemon
tzofeh.deployGuardian('database', dbInstance, { checkInterval: 5000 });

// Set metric thresholds
tzofeh.setMetricThreshold('cpu.usage', { warning: 70, critical: 90 });

// Deploy canary
tzofeh.deployCanary('new-feature', { endpoint: '/api/v2/test' });

// Set watch level: PASSIVE(0) → ACTIVE(1) → ALERT(2) → COMBAT(3) → SENTINEL(4)
tzofeh.setWatchLevel(3); // COMBAT mode
```

### MALAKH Message Bus

```javascript
// Publish event
malakh.publish('security.alert', { type: 'intrusion', severity: 'high' });

// Subscribe to topic
malakh.subscribe('security.*', async (message) => {
  console.log('Security event:', message.payload);
});

// Request/Reply pattern
const result = await malakh.request('ai.query', { question: 'Assess risk' });

// Broadcast to all
malakh.broadcast('system.maintenance', { scheduled: true });
```

### KISSEH Throne UI

Access via keyboard shortcut in the browser dashboard:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` | Toggle Throne panel |
| `Ctrl+Shift+S` | Toggle Sovereign controls |
| `Escape` | Close panel |

### Control System API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/merkava/status` | Command Center status |
| GET | `/api/merkava/diagnostics` | Full diagnostics |
| GET | `/api/merkava/alerts` | Active alerts |
| GET | `/api/merkava/commands` | Command log |
| POST | `/api/merkava/directive` | Send directive |
| POST | `/api/merkava/broadcast` | Broadcast to all |
| POST | `/api/merkava/workflow/:name` | Execute workflow |
| POST | `/api/merkava/lockdown` | Initiate lockdown |
| POST | `/api/merkava/sovereign/authorize` | Sovereign auth |
| GET | `/api/modules/:id/status` | Module status |
| GET | `/api/tzofeh/status` | Sentinel status |
| GET | `/api/tzofeh/diagnostics` | Sentinel diagnostics |
| GET | `/api/tzofeh/guardians` | Guardian daemons |
| POST | `/api/tzofeh/watch-level` | Set watch level |
| GET | `/api/tzofeh/anomalies` | Recent anomalies |
| GET | `/api/malakh/status` | Message Bus status |
| GET | `/api/malakh/queues` | Queue stats |
| POST | `/api/malakh/publish` | Publish message |
| POST | `/api/malakh/broadcast` | Broadcast message |
| GET | `/api/malakh/circuit-breakers` | Circuit breaker states |
| GET | `/api/system/health` | Unified health aggregation |
| GET | `/api/system/modules` | All module listing |
| GET | `/api/metrics` | Request metrics (JSON) |
| GET | `/api/metrics/prometheus` | Prometheus text format |
| POST | `/api/auth/token` | Generate JWT token |
| GET | `/api/auth/verify` | Check auth configuration |

### Dashboard Security

**Rate Limiting**

All API endpoints (except health/metrics) are rate-limited per IP:
- **Window:** 60 seconds
- **Max requests:** 100 per window
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Exceeding limit returns `429 Too Many Requests` with `Retry-After`

**JWT Authentication**

Protected routes require a Bearer token when `GENESIS_JWT_SECRET` is set:

```bash
# Protected routes (require auth)
POST /api/merkava/lockdown
POST /api/merkava/sovereign/*
POST /api/merkava/directive
POST /api/merkava/broadcast
POST /api/tzofeh/watch-level

# Get a token
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "owner"}'

# Use the token
curl http://localhost:3000/api/merkava/lockdown \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Maintenance"}'
```

**Metrics Export**

```bash
# JSON format
curl http://localhost:3000/api/metrics

# Prometheus format (for scrapers)
curl http://localhost:3000/api/metrics/prometheus
```

Available metrics:
- `genesis_uptime_seconds` — Dashboard uptime
- `genesis_requests_total` — Total HTTP requests
- `genesis_requests_by_method{method}` — Requests by HTTP method
- `genesis_requests_by_status{status}` — Requests by status class (2xx/4xx/5xx)
- `genesis_latency_avg_ms` — Average request latency
- `genesis_ratelimit_clients` — Active rate-limited clients
- `genesis_memory_heap_bytes` — Heap memory usage
- `genesis_memory_rss_bytes` — RSS memory usage

### Control CLI (genesis-control)

Command-line access to the GENESIS 2.0 control system. Connects to a running
dashboard via HTTP API, or instantiates modules directly.

```bash
# System overview
genesis-control status
npm run control:status

# List all 13 modules
genesis-control modules
npm run control:modules

# Aggregated health check
genesis-control health
npm run control:health

# MERKAVA commands
genesis-control merkava status
genesis-control merkava directive KERUV healthCheck
genesis-control merkava broadcast healthCheck
genesis-control merkava lockdown "Incident response"
genesis-control merkava alerts

# TZOFEH commands
genesis-control tzofeh status
genesis-control tzofeh watch-level combat
genesis-control tzofeh anomalies
genesis-control tzofeh guardians

# MALAKH commands
genesis-control malakh status
genesis-control malakh queues
genesis-control malakh publish security.alert '{"severity":"high"}'
genesis-control malakh circuit-breakers

# Log level
genesis-control log-level debug
```

### Config Validation

The bootstrap validates configuration on every boot:

- Node.js version (requires 20+)
- `GENESIS_JWT_SECRET` presence and minimum length (32 chars)
- Watch level validity (`passive`, `active`, `alert`, `combat`, `sentinel`)
- Port range (1–65535)
- Pulse interval minimum (1000ms)
- Evidence directory existence (if configured)

Warnings are surfaced through KOL before modules begin loading.

---

## Session Summary

This session added:

1. **22 new Pentagon rooms** (total: 40 rooms across 5 layers)
2. **YubiKey hardware security** (4 modes: OTP, WebAuthn, Challenge-Response, PIV)
3. **9 YubiKey API endpoints**
4. **10 Netgear network endpoints** (router, devices, traffic, WiFi, security)
5. **Owner profile configuration** (all 9 email accounts, ADMIN exclusive rights)
6. **Bug fixes** (OODA methods inside class, unused import removed)
7. **UI updates** (40-room map, YubiKey endpoints in explorer)

---

Copyright (c) 2025 Murray Bembrick — Founder & Lead Developer — Apache-2.0
