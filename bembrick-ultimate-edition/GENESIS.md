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
bembrick-ultimate-edition/
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
    "id": "murray@bembrick.org",
    "name": "Murray Bembrick",
    "role": "ADMIN",
    "exclusiveOwner": true
  },
  "authorization": {
    "role": "ADMIN",
    "level": "exclusive",
    "permissions": ["*"]
  },
  "emails": {
    "primary": "murray@bembrick.org",
    "all": [
      "murray@bembrick.org",
      "m.bembrick@icloud.com",
      "m_bembrick@icloud.com",
      "murraybembrick@gmail.com",
      "murraybembrick1@gmail.com",
      "mabembrick@outlook.com",
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
    "bembrick.org",
    "bembrick.com.au",
    "bembrick.net.au",
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

Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0
