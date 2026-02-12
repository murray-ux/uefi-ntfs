# GENESIS 2.0 — Sovereign Security Platform

> **Charter-governed. Audit-trailed. AI-assisted. YubiKey-secured.**

```
    ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗    ██████╗    ██████╗
   ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝    ╚════██╗  ██╔═████╗
   ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗     █████╔╝  ██║██╔██║
   ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║    ██╔═══╝   ████╔╝██║
   ╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║    ███████╗  ╚██████╔╝
    ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝    ╚══════╝   ╚═════╝
```

**Founded by murray-ux — Founder & Lead Developer**

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Pentagon Framework](#pentagon-framework)
6. [GENESIS 2.0 Control System](#genesis-20-control-system)
7. [Biblical-Named Core Modules](#biblical-named-core-modules)
8. [API Reference](#api-reference)
9. [YubiKey Integration](#yubikey-integration)
10. [Network Integration](#network-integration)
11. [Dashboard Features](#dashboard-features)
12. [Security Design](#security-design)
13. [Environment Variables](#environment-variables)
14. [CLI Commands](#cli-commands)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [File Structure](#file-structure)
18. [Contributing](#contributing)
19. [License](#license)

---

## Overview

GENESIS 2.0 is a comprehensive sovereign security platform providing:

- **Document Automation** — Intake, classify, route to vault pipelines
- **Device Management** — FleetDM integration, hardening, compliance
- **Cryptographic Audit Trails** — Ed25519 signing, hash-chain ledgers
- **AI-Assisted Workflows** — Multi-provider LLM integration
- **Multi-Layer Infrastructure** — Pentagon 5-facet, 40-room architecture
- **Hardware Security** — YubiKey 4-mode integration (OTP, WebAuthn, Challenge-Response, PIV)
- **Network Control** — Netgear router integration with device management

---

## Key Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Pentagon Architecture** | 5 public facets, 40 rooms across 5 underfloor layers |
| **Zero External Dependencies** | Built on Node 20 native HTTP, no Express |
| **Ed25519 Everywhere** | All signing uses native `crypto.sign()` |
| **Chained Audit Trails** | Hash-chain custody with tamper detection |
| **Fail-Closed Security** | Unknown state = compromise state, default DENY |
| **AI Optional** | Full operation without AI, enhanced when enabled |

### Security Features

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Token-based API protection |
| **Rate Limiting** | 100 req/min per IP with headers |
| **YubiKey MFA** | 4 hardware authentication modes |
| **RBAC/ABAC** | Role and attribute-based access control |
| **Prometheus Metrics** | Full observability export |
| **Request Logging** | Structured audit via KOL logger |

### Dashboard Features

| Feature | Shortcut |
|---------|----------|
| Command Palette | `Ctrl+K` |
| Notification Panel | `Ctrl+N` |
| AI Actions | `Ctrl+.` |
| Quick Navigation | `Ctrl+1-6` |
| Shortcuts Help | `Shift+?` |
| Focus Search | `/` |
| Throne Panel | `Ctrl+Shift+K` |
| Sovereign Mode | `Ctrl+Shift+S` |

---

## Architecture

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                      G E N E S I S    2 . 0                          ║
║                                                                       ║
║   ┌─────────────┐  ┌───────────────┐  ┌────────────┐  ┌────────────┐ ║
║   │   Wheel     │  │    Pentagon   │  │  Sovereign │  │  Developer │ ║
║   │   State     │  │    5-Facet    │  │   Suite    │  │    Pro     │ ║
║   │   Machine   │  │   Framework   │  │  Doc Auto  │  │  Dashboard │ ║
║   └─────────────┘  └───────────────┘  └────────────┘  └────────────┘ ║
║         │                │                  │                │        ║
║   ┌─────────────────────────────────────────────────────────────────┐ ║
║   │              Unified HTTP Server (zero Express)                 │ ║
║   │        40+ endpoints · Ed25519 · JWT · OODA · AI                │ ║
║   └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║   ┌─────────────────────────────────────────────────────────────────┐ ║
║   │           GENESIS 2.0 Control System (Biblical Names)           │ ║
║   │   MERKAVA · TZOFEH · MALAKH · KERUV · EBEN · SHINOBI · TETSUYA │ ║
║   │        RUACH · OHR · HADAAT · NEPHESH · VIZ · HEREV · KOL       │ ║
║   └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Directory Layout

```
caput-ultimate-edition/
├── src/
│   ├── index.ts              ← GATE: single CLI entry point
│   ├── server.ts             ← Unified HTTP server (40+ endpoints)
│   ├── wheel/                ← Wheel state machine
│   ├── core/                 ← Policy engine
│   ├── audit/                ← Audit trails
│   ├── lib/                  ← GENESIS 2.0 Core Modules (Biblical Names)
│   ├── cli/                  ← Command-line tools
│   ├── ui/                   ← Dashboard server + static files
│   ├── db/                   ← Database integrations
│   ├── pentagon/             ← Pentagon handlers
│   ├── ai/                   ← AI integration
│   └── hooks/                ← Claude Code hooks
├── pentagon/                 ← Pentagon framework
│   ├── pentagon.ts           ← Single facade
│   └── underfloor/           ← 5 layers, 40 rooms
├── security/                 ← Defence layer
├── identity/                 ← Auth & signing
├── ai/                       ← LLM integration
├── orchestration/            ← Workflow coordination
├── sovereign-suite/          ← Document automation
├── legal/                    ← Court document pipeline
├── cert_master/              ← Certificate pipeline
├── db/                       ← Database schemas
├── config/                   ← Configuration files
├── boot/                     ← Boot scripts
├── deploy/                   ← Deployment files
├── static/                   ← Static HTML files
├── test/                     ← Test suites
└── data/                     ← Runtime data (gitignored)
```

---

## Quick Start

### Prerequisites

- **Node.js 20+** (required)
- **TypeScript 5+** (required)
- **PostgreSQL 15+** (optional, for persistent storage)
- **Docker** (optional, for containerised deployment)
- **YubiKey** (optional, for hardware MFA)

### Installation

```bash
# Clone the repository
git clone https://github.com/murray-ux/uefi-ntfs.git
cd uefi-ntfs/caput-ultimate-edition

# Install dependencies
npm install

# Setup (creates directories, generates .env)
npm run setup
```

### Environment Configuration

```bash
# Copy example and configure
cp .env.example .env

# Required: Generate JWT secret
echo "GENESIS_JWT_SECRET=$(openssl rand -hex 32)" >> .env

# Source environment
source .env
```

### Run the Server

```bash
# Windows
GO.bat

# Linux/Mac
chmod +x go.sh && ./go.sh

# Or manually
npm start
```

Open: **http://localhost:8080**

### Run via GENESIS CLI

```bash
# System health check
npm run genesis health

# Pentagon room commands
npm run genesis pentagon list
npm run genesis pentagon room spark generate

# AI assistant
npm run genesis ai

# Evidence documentation
npm run genesis evidence interactive
```

### Run Tests

```bash
npm test                    # Full test suite
npm run test:modules        # Control system tests
npm run test:all           # All tests
```

---

## Pentagon Framework

> One structure from outside. Multi-plumbed infrastructure underneath.

```
         Consumer → pentagon.command("health")
                      │
                      ▼
              ╔═══════════════╗
              ║   Pentagon    ║  5 public facets: CMD · IDN · EVD · EXE · OUT
              ╠═══════════════╣
              ║ L4 Manifold   ║  Engine · Wings · Mods · Exhaust · Turbo · Chassis
              ║ L3 Valve      ║  Brakes · Tint · Wipers · Fuel · Gauges · Gears
              ║ L2 Reservoir  ║  Trunk · Spares · Coolant · Wash · Tank · Filter
              ║ L1 Conduit    ║  Flares · Locks · Doors · Horn · Mirrors · Relay
              ║ L0 Kernel     ║  Thermostat · Chip · Battery · Clock · Spark · Fuse
              ╚═══════════════╝
```

### Five Public Facets

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
| **L0 Kernel** | thermostat, chip, clock, spark, battery, fuse, ground, coil | Crypto primitives, timing, entropy |
| **L1 Conduit** | flares, locks, doors, relay, antenna, buffer, bridge, tunnel | Messaging, synchronization, routing |
| **L2 Reservoir** | trunk, spares, coolant, wash, glove, tank, pump, filter | State storage, caching, sanitization |
| **L3 Valve** | brakes, tint, wipers, fuel, gauges, gears, horn, seatbelts | Policy enforcement, access control |
| **L4 Manifold** | engine, wings, mods, exhaust, wheels, bumper, mirrors, chassis | Orchestration, scaling, observability |

### Usage Example

```typescript
import { Pentagon } from "./pentagon/pentagon";

const pentagon = new Pentagon({
  dataDir: "./data",
  ownerId: "owner",
});

// CMD facet — execute commands
const health = await pentagon.command("health");
const thermal = await pentagon.command("thermostat");

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

## GENESIS 2.0 Control System

The control layer uses a biblical/Hebrew naming convention. Each module is a self-contained sovereign component wired together via the bootstrap init system.

### 6-Phase Bootstrap

```bash
npm run boot                      # Full 6-phase bootstrap
npm run boot:sentinel             # Boot with TZOFEH in active watch
node src/lib/genesis-init.js --port 4000 --watch-level combat
```

**Bootstrap Phases:**

1. **Core Infrastructure** — MERKAVA Command Center + MALAKH Message Bus
2. **Security Layer** — KERUV Guardian + SHINOBI Stealth + EBEN Evidence
3. **AI & Intelligence** — RUACH Neural + OHR Observability + HADAAT Decision + TETSUYA Defense + NEPHESH Hooks + VIZ Engine
4. **Wire** — Module registration + topic subscriptions via MALAKH
5. **Dashboard** — HTTP server with 40+ API endpoints
6. **Monitoring** — TZOFEH Sentinel watchdog with guardian daemons

### Control CLI

```bash
# System overview
genesis-control status

# List all 13 modules
genesis-control modules

# Aggregated health check
genesis-control health

# MERKAVA commands
genesis-control merkava status
genesis-control merkava directive KERUV healthCheck
genesis-control merkava broadcast healthCheck
genesis-control merkava lockdown "Incident response"

# TZOFEH commands
genesis-control tzofeh status
genesis-control tzofeh watch-level combat
genesis-control tzofeh anomalies

# MALAKH commands
genesis-control malakh status
genesis-control malakh publish security.alert '{"severity":"high"}'
```

---

## Biblical-Named Core Modules

| Module | Hebrew | Meaning | Purpose |
|--------|--------|---------|---------|
| **MERKAVA** | מרכבה | Chariot | Master Command Center — module orchestration, directives |
| **TZOFEH** | צופה | Watchman | Sentinel Watchdog — anomaly detection, guardians |
| **MALAKH** | מלאך | Messenger | High-performance Message Bus — pub/sub, circuit breakers |
| **KISSEH** | כסא | Throne | Control Panel UI — module grid, health ring |
| **RUACH** | רוח | Spirit | Neural Network Engine — AI inference |
| **OHR** | אור | Light | Observability System — metrics, tracing |
| **HADAAT** | הדעת | Knowledge | Decision Intelligence — routing, policy |
| **KERUV** | כרוב | Cherub | Guardian Security — mTLS, RBAC/ABAC |
| **NEPHESH** | נפש | Soul | Lifecycle Hooks — Claude Code integration |
| **EBEN** | אבן | Stone | Evidence Management — court-grade vault |
| **SHINOBI** | 忍び | Ninja | Stealth Security — hidden admin, shadow |
| **TETSUYA** | 鉄矢 | Iron Arrow | Predictive Defense — AI agents, risk |
| **VIZ** | — | Visualize | Visualization Engine — dashboards |
| **KOL** | קול | Voice | Shared Logging — structured output |
| **HEREV** | חרב | Sword | Security Arsenal — 100+ curated resources |

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

### HEREV Security Arsenal

```javascript
import { herev } from './src/lib/herev-arsenal.js';

// Get arsenal statistics
const stats = herev.getStats();
console.log(`Arsenal: ${stats.totalResources} resources`);

// Get critical priority resources
const critical = herev.getCritical();

// Search arsenal
const results = herev.search('pentest');

// Get resources by category
const osint = herev.getByCategory('osint');

// Generate markdown documentation
const markdown = herev.generateMarkdown();
```

**Arsenal Categories:** offensive, defensive, forensics, intelligence, web, osint, mobile, network, iot, ai_security, crypto, ctf, payloads, tools, training

---

## API Reference

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Developer Pro dashboard |
| `GET` | `/health` | System health check |
| `POST` | `/evaluate` | PDP: evaluate policy request |
| `POST` | `/authenticate` | SSO: validate JWT |
| `POST` | `/authorise` | SSO: check action authorization |
| `POST` | `/issue-token` | SSO: issue JWT |
| `POST` | `/sign` | Ed25519: sign data |
| `POST` | `/verify-signature` | Ed25519: verify signature |

### Audit Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/audit/chain` | Verify custody chain integrity |
| `POST` | `/audit/record` | Record custody event |

### Shield Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/shield/health` | Quantum Shield device health |
| `GET` | `/shield/hardening` | CIS benchmark report |

### AI Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai/query` | General-purpose AI query |
| `POST` | `/ai/draft` | Legal document draft |
| `POST` | `/ai/plan` | Automation planning |
| `POST` | `/ai/summarise` | Evidence summarisation |
| `POST` | `/ai/autogen` | Auto-generate pipeline |

### YubiKey Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/yubikey/status` | YubiKey bridge stats |
| `POST` | `/yubikey/otp` | Validate OTP |
| `POST` | `/yubikey/register/options` | WebAuthn registration |
| `POST` | `/yubikey/register/verify` | Store credential |
| `POST` | `/yubikey/auth/options` | WebAuthn authentication |
| `POST` | `/yubikey/auth/verify` | Verify authentication |
| `POST` | `/yubikey/challenge` | HMAC challenge |
| `POST` | `/yubikey/challenge/verify` | Verify HMAC response |
| `POST` | `/yubikey/mfa` | Unified MFA |

### Network Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/network/status` | Router status |
| `GET` | `/network/devices` | Connected devices |
| `GET` | `/network/traffic` | Bandwidth stats |
| `GET` | `/network/wifi` | WiFi networks |
| `GET` | `/network/security` | Firewall/Armor status |
| `POST` | `/network/reboot` | Reboot router |
| `POST` | `/network/block` | Block device by MAC |
| `POST` | `/network/unblock` | Unblock device |
| `POST` | `/network/guest-wifi` | Guest WiFi control |

### Control System Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/merkava/status` | MERKAVA system status |
| `POST` | `/api/merkava/directive` | Send directive to module |
| `POST` | `/api/merkava/broadcast` | Broadcast to all modules |
| `POST` | `/api/merkava/workflow/:name` | Execute named workflow |
| `POST` | `/api/merkava/lockdown` | Trigger system lockdown |
| `GET` | `/api/tzofeh/status` | TZOFEH monitoring status |
| `GET` | `/api/tzofeh/anomalies` | Recent anomaly detections |
| `POST` | `/api/tzofeh/watch-level` | Set watch level |
| `GET` | `/api/malakh/status` | MALAKH bus status |
| `POST` | `/api/malakh/publish` | Publish message to topic |
| `GET` | `/api/malakh/circuit-breakers` | Circuit breaker states |
| `GET` | `/api/metrics` | Request metrics (JSON) |
| `GET` | `/api/metrics/prometheus` | Prometheus text format |

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

# 2. Program YubiKey slot 2
ykpersonalize -2 -ochal-resp -ochal-hmac -ohmac-lt64 -oserial-api-visible

# 3. Configure
echo 'GENESIS_YUBIKEY_MODE=challenge-response' >> .env
echo "GENESIS_YUBIKEY_HMAC_SECRET=$SECRET" >> .env

# 4. Get challenge and compute response
curl -X POST http://localhost:8080/yubikey/challenge \
  -H "Content-Type: application/json" \
  -d '{"userId":"owner"}'

RESPONSE=$(ykchalresp -2 <challenge>)

# 5. Verify
curl -X POST http://localhost:8080/yubikey/challenge/verify \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"owner\",\"challenge\":\"<challenge>\",\"response\":\"$RESPONSE\"}"
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

## Network Integration

### Netgear Router Support

```bash
# Configure in .env
GENESIS_NETGEAR_ROUTER_IP=192.168.1.1
GENESIS_NETGEAR_ADMIN_USER=admin
GENESIS_NETGEAR_ADMIN_PASS=your-password
```

**Supported Devices:**
- Nighthawk routers (R7000, R8000, RAX series)
- Orbi mesh systems
- ReadyNAS devices
- NETGEAR Armor (if enabled)

### Usage Examples

```bash
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

---

## Dashboard Features

### Immersive Experience

| Feature | Description |
|---------|-------------|
| Command Palette | Spotlight-style command search (Cmd/Ctrl+K) |
| Keyboard Shortcuts | Ctrl+1-6 navigation, Shift+? for help |
| Audio Engine | Subtle sound feedback |
| Ambient Effects | Floating particle animation |
| Health Pulse | Real-time system health indicator |
| Focus Mode | Distraction-free interface |
| Light/Dark Theme | Toggle between themes |

### Advanced UI Components

| Component | Description |
|-----------|-------------|
| Magnetic Buttons | Cursor-following with ripple effects |
| Glassmorphic Toggles | Animated switches with glow |
| AI-Powered Search | Fuzzy matching with score display |
| Floating Label Inputs | Animated form fields |
| Drag-Drop-Pop AI | Right-click/double-click for AI actions |
| 3D Glass Cards | Perspective tilt on hover |
| Skeleton Loading | Shimmer loading states |

### Data Visualization

| Widget | Description |
|--------|-------------|
| Animated Gauges | Circular/semi/linear with thresholds |
| Sparkline Charts | Line, area, bar with tooltips |
| Network Graphs | Physics simulation, draggable nodes |
| Dashboard Widgets | Draggable, resizable grid layout |
| Notification Panel | Slide-out with filters (Ctrl+N) |
| Activity Timeline | Animated feed with connectors |
| File Upload | Drag-drop with image previews |
| Theme Customizer | Color presets and pickers |

---

## Security Design

### Key Principles

1. **Fail-closed security** — Unknown state = compromise state. Default DENY.
2. **Zero external HTTP** — Node 20 built-in `http`. No Express, no axios.
3. **Ed25519 everywhere** — All signing uses native `crypto.sign()`.
4. **Chained audit trails** — Hash-chaining with tamper detection.
5. **Layer dependency** — Pentagon layers only reach DOWN, never sideways or up.
6. **AI optional** — Full operation without AI providers.
7. **No PII in code** — All identifiers via environment variables.
8. **Injectable dependencies** — Swappable implementations.

### API Security

| Feature | Configuration |
|---------|---------------|
| **Rate Limiting** | 100 req/min per IP, `X-RateLimit-*` headers |
| **JWT Authentication** | Bearer token when `GENESIS_JWT_SECRET` set |
| **Request Logging** | All requests logged via KOL |
| **Metrics Export** | `/api/metrics` (JSON), `/api/metrics/prometheus` |

### Protected Routes

These routes require JWT authentication:

- `POST /api/merkava/lockdown`
- `POST /api/merkava/sovereign/*`
- `POST /api/merkava/directive`
- `POST /api/merkava/broadcast`
- `POST /api/tzofeh/watch-level`

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

# ── Netgear (optional) ────────────────────────────────────────
GENESIS_NETGEAR_ROUTER_IP=192.168.1.1
GENESIS_NETGEAR_ADMIN_USER=admin
GENESIS_NETGEAR_ADMIN_PASS=
```

---

## CLI Commands

### NPM Scripts

```bash
npm run setup     # First-run setup
npm start         # Start server on :8080
npm run dev       # Start with watch mode
npm run gate      # Run policy gate check
npm run health    # Run health check
npm run harden    # Run CIS hardening check
npm run ooda      # Run OODA cyber-defence cycle
npm test          # Run test suite
npm run boot      # Full 6-phase bootstrap
npm run daemon    # Run health daemon
npm run connect   # Test service connections
```

### GENESIS CLI

```bash
npm run genesis health              # System health
npm run genesis pentagon list       # List all rooms
npm run genesis pentagon room spark # Room command
npm run genesis ai                  # AI assistant
npm run genesis evidence            # Evidence documentation
```

### Grandmaster CLI

```bash
npx tsx orchestration/grandmaster_orchestrator.ts health-check
npx tsx orchestration/grandmaster_orchestrator.ts ooda
npx tsx orchestration/grandmaster_orchestrator.ts resilience
npx tsx orchestration/grandmaster_orchestrator.ts compliance-report
npx tsx orchestration/grandmaster_orchestrator.ts legal-batch ./data/cases.csv
npx tsx orchestration/grandmaster_orchestrator.ts cert-batch ./data/exams.csv
```

---

## Testing

```bash
# Full test suite
npm test

# Control system tests (35+ tests)
npm run test:modules

# All tests combined
npm run test:all

# Dashboard API tests (31 tests)
npm run test:dashboard
```

---

## Deployment

### Docker

```bash
# Using deploy script
sudo deploy/genesis-deploy.sh --docker

# Using docker compose
docker compose up --build
```

### Docker Security

- Read-only filesystem
- Non-root user
- `no-new-privileges`
- Multi-stage build (Rust → TS → Node 20 slim)

### USB Portable Launch

```bash
# Windows
boot/GENESIS-USB.bat

# Linux/Mac
chmod +x boot/GENESIS-USB.sh && ./boot/GENESIS-USB.sh
```

---

## File Structure

```
caput-ultimate-edition/
├── GO.bat                    # Windows launcher
├── go.sh                     # Linux/Mac launcher
├── package.json              # NPM config
├── .env.example              # Environment template
├── GENESIS.md                # Master reference
├── README.md                 # Project overview
├── CONTRIBUTING.md           # Dev guidelines
├── LICENSE                   # Apache-2.0
├── src/
│   ├── server.ts             # HTTP API server
│   ├── index.ts              # CLI entry
│   ├── lib/                  # Core modules (Biblical names)
│   ├── cli/                  # Command-line tools
│   ├── ui/                   # Dashboard
│   └── ...
├── pentagon/                 # Pentagon framework
├── security/                 # Security layer
├── identity/                 # Auth layer
├── orchestration/            # Workflows
├── sovereign-suite/          # Document automation
├── static/                   # Static HTML
├── test/                     # Tests
└── data/                     # Runtime data
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## License

**Apache 2.0** — see [LICENSE](LICENSE)

Copyright (c) 2025 murray-ux — Founder & Lead Developer

See [OWNERSHIP.md](OWNERSHIP.md) for attribution and IP details.

---

## Support

- Issues: [GitHub Issues](https://github.com/murray-ux/uefi-ntfs/issues)
- Documentation: [GENESIS.md](GENESIS.md)
- Pentagon Reference: [pentagon/PENTAGON.md](pentagon/PENTAGON.md)

---

**GENESIS 2.0 — Sovereign Security Platform**
*Charter-governed. Audit-trailed. AI-assisted. YubiKey-secured.*
