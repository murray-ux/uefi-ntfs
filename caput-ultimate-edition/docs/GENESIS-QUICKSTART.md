# GENESIS 2.0 — Quick Start Guide

> Get up and running in 5 minutes

---

## Prerequisites

| Requirement | Version | Required |
|-------------|---------|----------|
| Node.js | 20+ | Yes |
| TypeScript | 5+ | Yes |
| PostgreSQL | 15+ | Optional |
| Docker | Latest | Optional |
| YubiKey | 5 series | Optional |

---

## 1. Installation

```bash
# Clone repository
git clone https://github.com/murray-ux/uefi-ntfs.git
cd uefi-ntfs/caput-ultimate-edition

# Install dependencies
npm install
```

---

## 2. Configuration

```bash
# Create environment file
cp .env.example .env

# Generate JWT secret (REQUIRED)
echo "GENESIS_JWT_SECRET=$(openssl rand -hex 32)" >> .env

# Source environment
source .env
```

### Minimal .env

```bash
# Required
GENESIS_JWT_SECRET=<your-64-char-hex-secret>

# Optional but recommended
GENESIS_OWNER_ID=owner
GENESIS_PDP_PORT=8080
```

---

## 3. Start the Server

### Option A: Quick Start Scripts

```bash
# Windows
GO.bat

# Linux/Mac
chmod +x go.sh && ./go.sh
```

### Option B: NPM Scripts

```bash
# Production
npm start

# Development (with watch)
npm run dev
```

### Option C: Direct

```bash
npx tsx src/server.ts
```

---

## 4. Verify Installation

Open your browser: **http://localhost:8080**

You should see the Developer Pro Dashboard with:

- Pentagon room map (40 rooms)
- System health indicators
- API explorer
- Command palette (Ctrl+K)

### API Health Check

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T...",
  "components": {
    "pentagon": "operational",
    "audit": "operational",
    "identity": "operational"
  }
}
```

---

## 5. First Commands

### GENESIS CLI

```bash
# System health
npm run genesis health

# List Pentagon rooms
npm run genesis pentagon list

# Interactive AI (if configured)
npm run genesis ai
```

### Control System

```bash
# Full bootstrap with all modules
npm run boot

# Check module status
genesis-control status

# List all 13 biblical modules
genesis-control modules
```

---

## 6. Enable Features (Optional)

### YubiKey Hardware MFA

```bash
# Add to .env
GENESIS_YUBIKEY_MODE=otp
GENESIS_YUBIKEY_CLIENT_ID=<your-client-id>
GENESIS_YUBIKEY_SECRET_KEY=<your-secret>
```

Get credentials: https://upgrade.yubico.com/getapikey/

### AI Integration

```bash
# OpenAI
GENESIS_AI_API_KEY=sk-...
GENESIS_AI_BASE_URL=https://api.openai.com/v1

# Or Anthropic
GENESIS_AI_API_KEY=sk-ant-...
GENESIS_AI_BASE_URL=https://api.anthropic.com/v1

# Or local Ollama
GENESIS_AI_BASE_URL=http://localhost:11434/v1
```

### Netgear Router

```bash
GENESIS_NETGEAR_ROUTER_IP=192.168.1.1
GENESIS_NETGEAR_ADMIN_USER=admin
GENESIS_NETGEAR_ADMIN_PASS=<password>
```

### PostgreSQL

```bash
GENESIS_DATABASE_URL=postgresql://user:pass@localhost:5432/genesis
```

---

## 7. Run Tests

```bash
# Full test suite
npm test

# Control system tests
npm run test:modules

# All tests
npm run test:all
```

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | Notification panel |
| `Ctrl+1-6` | Quick navigation |
| `Shift+?` | Help |
| `/` | Focus search |
| `Ctrl+Shift+K` | Throne panel |
| `Ctrl+Shift+S` | Sovereign mode |

---

## 9. Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard |
| `GET /health` | Health check |
| `POST /sign` | Sign data |
| `POST /ai/query` | AI query |
| `GET /api/merkava/status` | Control status |
| `GET /api/metrics` | Metrics (JSON) |
| `GET /api/metrics/prometheus` | Metrics (Prometheus) |

---

## 10. Docker Deployment

```bash
# Build and run
docker compose up --build

# Or use deploy script
sudo deploy/genesis-deploy.sh --docker
```

---

## Troubleshooting

### "GENESIS_JWT_SECRET not set"

```bash
echo "GENESIS_JWT_SECRET=$(openssl rand -hex 32)" >> .env
source .env
```

### "Port 8080 in use"

```bash
GENESIS_PDP_PORT=3000 npm start
```

### "Module not found"

```bash
rm -rf node_modules
npm install
```

### "Permission denied"

```bash
chmod +x go.sh
chmod +x deploy/*.sh
```

---

## Next Steps

1. Read [GENESIS.md](../GENESIS.md) for full documentation
2. Explore [PENTAGON.md](../pentagon/PENTAGON.md) for architecture details
3. Configure YubiKey for hardware MFA
4. Set up AI integration for assisted workflows
5. Connect to your Netgear router for network management

---

## Support

- Issues: [GitHub Issues](https://github.com/murray-ux/uefi-ntfs/issues)
- Full Docs: [GENESIS-MASTER-README.md](../GENESIS-MASTER-README.md)

---

**GENESIS 2.0 — Sovereign Security Platform**

Copyright (c) 2025 murray-ux — Founder & Lead Developer — Apache-2.0
