# GENESIS 2.0 — Complete API Reference

> All 60+ API endpoints documented

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
3. [Audit Endpoints](#audit-endpoints)
4. [Shield Endpoints](#shield-endpoints)
5. [AI Endpoints](#ai-endpoints)
6. [YubiKey Endpoints](#yubikey-endpoints)
7. [Network Endpoints](#network-endpoints)
8. [Control System (MERKAVA)](#control-system-merkava)
9. [Sentinel (TZOFEH)](#sentinel-tzofeh)
10. [Message Bus (MALAKH)](#message-bus-malakh)
11. [System Endpoints](#system-endpoints)
12. [Metrics Endpoints](#metrics-endpoints)
13. [Pentagon Room Endpoints](#pentagon-room-endpoints)

---

## Authentication

### JWT Token

Protected endpoints require a Bearer token in the `Authorization` header.

```bash
# Get a token
curl -X POST http://localhost:8080/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "owner"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}

# Use the token
curl http://localhost:8080/api/merkava/status \
  -H "Authorization: Bearer <token>"
```

### Rate Limiting

All endpoints (except health/metrics) are rate-limited:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Remaining requests |
| `Retry-After` | Seconds until window reset (on 429) |

**Limits:** 100 requests/minute per IP

---

## Core Endpoints

### GET /

**Dashboard**

Returns the Developer Pro dashboard HTML.

```bash
curl http://localhost:8080/
```

---

### GET /health

**System Health Check**

Returns overall system health status.

```bash
curl http://localhost:8080/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "uptime": 3600,
  "components": {
    "pentagon": "operational",
    "audit": "operational",
    "identity": "operational",
    "wheel": "operational"
  },
  "memory": {
    "heapUsed": 45678912,
    "heapTotal": 123456789,
    "rss": 234567890
  }
}
```

---

### POST /evaluate

**Policy Decision Point (PDP)**

Evaluates a policy request.

```bash
curl -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "user123",
    "action": "read",
    "resource": "document:456",
    "context": {
      "mfaPassed": true,
      "riskScore": 0
    }
  }'
```

**Response:**

```json
{
  "decision": "ALLOW",
  "reason": "Policy ADMIN_FULL_ACCESS matched",
  "obligations": [],
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

**Decision Values:** `ALLOW`, `DENY`, `INDETERMINATE`, `NOT_APPLICABLE`

---

### POST /authenticate

**Validate JWT Token**

```bash
curl -X POST http://localhost:8080/authenticate \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGciOiJIUzI1NiIs..."}'
```

**Response:**

```json
{
  "valid": true,
  "principal": "owner",
  "claims": {
    "sub": "owner",
    "iat": 1707735000,
    "exp": 1707821400
  }
}
```

---

### POST /authorise

**Check Action Authorization**

```bash
curl -X POST http://localhost:8080/authorise \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "action": "deploy:app",
    "resource": "server:prod"
  }'
```

**Response:**

```json
{
  "authorized": true,
  "principal": "owner",
  "action": "deploy:app",
  "resource": "server:prod"
}
```

---

### POST /issue-token

**Issue JWT Token**

```bash
curl -X POST http://localhost:8080/issue-token \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "owner",
    "claims": {
      "role": "admin"
    },
    "expiresIn": "24h"
  }'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-02-13T10:30:00.000Z"
}
```

---

### POST /sign

**Ed25519 Digital Signature**

```bash
curl -X POST http://localhost:8080/sign \
  -H "Content-Type: application/json" \
  -d '{
    "data": "document content to sign",
    "keyId": "default"
  }'
```

**Response:**

```json
{
  "signature": "base64-encoded-signature",
  "publicKey": "base64-encoded-public-key",
  "algorithm": "Ed25519",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

### POST /verify-signature

**Verify Ed25519 Signature**

```bash
curl -X POST http://localhost:8080/verify-signature \
  -H "Content-Type: application/json" \
  -d '{
    "data": "document content to sign",
    "signature": "base64-encoded-signature",
    "publicKey": "base64-encoded-public-key"
  }'
```

**Response:**

```json
{
  "valid": true,
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

## Audit Endpoints

### GET /audit/chain

**Verify Chain of Custody Integrity**

```bash
curl http://localhost:8080/audit/chain
```

**Response:**

```json
{
  "valid": true,
  "chainLength": 1234,
  "firstHash": "abc123...",
  "lastHash": "xyz789...",
  "brokenLinks": [],
  "verifiedAt": "2026-02-12T10:30:00.000Z"
}
```

---

### POST /audit/record

**Record Custody Event**

```bash
curl -X POST http://localhost:8080/audit/record \
  -H "Content-Type: application/json" \
  -d '{
    "action": "access",
    "resourceId": "document:456",
    "principal": "user123",
    "metadata": {
      "ip": "192.168.1.100",
      "userAgent": "curl/7.68.0"
    }
  }'
```

**Response:**

```json
{
  "recorded": true,
  "eventId": "evt_abc123",
  "hash": "sha256-hash-of-event",
  "prevHash": "sha256-hash-of-previous",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

## Shield Endpoints

### GET /shield/health

**Quantum Shield Device Health**

```bash
curl http://localhost:8080/shield/health
```

**Response:**

```json
{
  "status": "healthy",
  "os": {
    "platform": "linux",
    "release": "5.15.0-91-generic",
    "uptime": 86400
  },
  "cpu": {
    "usage": 15.5,
    "temperature": 45
  },
  "memory": {
    "total": 16000000000,
    "used": 8000000000,
    "percent": 50
  },
  "disk": {
    "total": 500000000000,
    "used": 100000000000,
    "percent": 20
  }
}
```

---

### GET /shield/hardening

**CIS Benchmark Hardening Report**

```bash
curl http://localhost:8080/shield/hardening
```

**Response:**

```json
{
  "score": 85,
  "maxScore": 100,
  "grade": "B",
  "checks": [
    {
      "id": "CIS-1.1.1",
      "name": "Filesystem partitioning",
      "status": "PASS",
      "severity": "high"
    },
    {
      "id": "CIS-1.1.2",
      "name": "Separate /tmp partition",
      "status": "FAIL",
      "severity": "medium",
      "recommendation": "Create separate /tmp partition"
    }
  ],
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

## AI Endpoints

### POST /ai/query

**General-Purpose AI Query**

```bash
curl -X POST http://localhost:8080/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the security best practices for this system?",
    "context": {
      "role": "admin",
      "component": "authentication"
    }
  }'
```

**Response:**

```json
{
  "response": "Based on the GENESIS 2.0 architecture...",
  "model": "gpt-4",
  "tokens": {
    "prompt": 150,
    "completion": 500
  },
  "disclaimer": "AI-generated response. Verify before acting.",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

### POST /ai/draft

**Legal Document Drafting**

```bash
curl -X POST http://localhost:8080/ai/draft \
  -H "Content-Type: application/json" \
  -d '{
    "type": "affidavit",
    "facts": [
      "Event occurred on 2026-01-15",
      "Witnesses: John Doe, Jane Smith"
    ],
    "jurisdiction": "AU-VIC"
  }'
```

---

### POST /ai/plan

**Automation Change Planning**

```bash
curl -X POST http://localhost:8080/ai/plan \
  -H "Content-Type: application/json" \
  -d '{
    "change": "Add new authentication method",
    "scope": "identity module",
    "constraints": ["no downtime", "backwards compatible"]
  }'
```

---

### POST /ai/summarise

**Evidence Summarisation**

```bash
curl -X POST http://localhost:8080/ai/summarise \
  -H "Content-Type: application/json" \
  -d '{
    "evidenceIds": ["evd_001", "evd_002", "evd_003"],
    "format": "executive"
  }'
```

---

### POST /ai/autogen

**Auto-Generate Pipeline**

```bash
curl -X POST http://localhost:8080/ai/autogen \
  -H "Content-Type: application/json" \
  -d '{
    "template": "security-audit",
    "parameters": {
      "target": "network",
      "depth": "comprehensive"
    }
  }'
```

---

## YubiKey Endpoints

### GET /yubikey/status

**YubiKey Bridge Statistics**

```bash
curl http://localhost:8080/yubikey/status
```

**Response:**

```json
{
  "mode": "otp",
  "configured": true,
  "registeredKeys": 2,
  "lastAuthentication": "2026-02-12T09:00:00.000Z",
  "stats": {
    "otpValidations": 150,
    "webauthnAuths": 0,
    "challengeResponses": 0
  }
}
```

---

### POST /yubikey/otp

**Validate YubiKey OTP**

```bash
curl -X POST http://localhost:8080/yubikey/otp \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "ccccccccccccbirheelhklfhrvtjbitjjdtlftttdcte"
  }'
```

**Response:**

```json
{
  "valid": true,
  "serial": "31695265",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

### POST /yubikey/register/options

**WebAuthn Registration Options**

```bash
curl -X POST http://localhost:8080/yubikey/register/options \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "owner",
    "userName": "admin@genesis.local"
  }'
```

**Response:**

```json
{
  "challenge": "base64-challenge",
  "rp": {
    "id": "localhost",
    "name": "GENESIS 2.0"
  },
  "user": {
    "id": "base64-user-id",
    "name": "admin@genesis.local",
    "displayName": "Administrator"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "attestation": "direct",
  "authenticatorSelection": {
    "authenticatorAttachment": "cross-platform",
    "requireResidentKey": false,
    "userVerification": "preferred"
  }
}
```

---

### POST /yubikey/register/verify

**Store WebAuthn Credential**

```bash
curl -X POST http://localhost:8080/yubikey/register/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "owner",
    "credential": {
      "id": "credential-id",
      "rawId": "base64-raw-id",
      "response": {
        "clientDataJSON": "base64-client-data",
        "attestationObject": "base64-attestation"
      },
      "type": "public-key"
    }
  }'
```

---

### POST /yubikey/auth/options

**WebAuthn Authentication Options**

```bash
curl -X POST http://localhost:8080/yubikey/auth/options \
  -H "Content-Type: application/json" \
  -d '{"userId": "owner"}'
```

---

### POST /yubikey/auth/verify

**Verify WebAuthn Authentication**

```bash
curl -X POST http://localhost:8080/yubikey/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "owner",
    "credential": {
      "id": "credential-id",
      "rawId": "base64-raw-id",
      "response": {
        "clientDataJSON": "base64-client-data",
        "authenticatorData": "base64-auth-data",
        "signature": "base64-signature"
      },
      "type": "public-key"
    }
  }'
```

---

### POST /yubikey/challenge

**HMAC Challenge Request**

```bash
curl -X POST http://localhost:8080/yubikey/challenge \
  -H "Content-Type: application/json" \
  -d '{"userId": "owner"}'
```

**Response:**

```json
{
  "challenge": "abc123def456...",
  "instruction": "Run: ykchalresp -2 abc123def456...",
  "expiresIn": 60
}
```

---

### POST /yubikey/challenge/verify

**Verify HMAC Challenge Response**

```bash
curl -X POST http://localhost:8080/yubikey/challenge/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "owner",
    "challenge": "abc123def456...",
    "response": "hmac-response-from-yubikey"
  }'
```

---

### POST /yubikey/mfa

**Unified MFA Endpoint**

Supports all YubiKey modes in one endpoint.

```bash
curl -X POST http://localhost:8080/yubikey/mfa \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "owner",
    "mode": "otp",
    "credential": "ccccccccccccbirheelhklfhrvtjbitjjdtlftttdcte"
  }'
```

---

## Network Endpoints

### GET /network/status

**Router Status**

```bash
curl http://localhost:8080/network/status
```

**Response:**

```json
{
  "model": "Nighthawk R8000",
  "firmware": "1.0.4.82",
  "uptime": 864000,
  "wan": {
    "connected": true,
    "ip": "203.0.113.50",
    "gateway": "203.0.113.1"
  },
  "lan": {
    "ip": "192.168.1.1",
    "subnet": "255.255.255.0"
  }
}
```

---

### GET /network/devices

**Connected Devices**

```bash
curl http://localhost:8080/network/devices
```

**Response:**

```json
{
  "count": 15,
  "devices": [
    {
      "mac": "AA:BB:CC:DD:EE:FF",
      "ip": "192.168.1.100",
      "name": "MacBook-Pro",
      "connectionType": "5GHz",
      "online": true,
      "lastSeen": "2026-02-12T10:30:00.000Z"
    }
  ]
}
```

---

### GET /network/traffic

**Bandwidth Statistics**

```bash
curl http://localhost:8080/network/traffic
```

**Response:**

```json
{
  "wan": {
    "download": {
      "current": 45000000,
      "peak": 120000000,
      "total": 1500000000000
    },
    "upload": {
      "current": 5000000,
      "peak": 20000000,
      "total": 200000000000
    }
  },
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

### GET /network/wifi

**WiFi Networks**

```bash
curl http://localhost:8080/network/wifi
```

**Response:**

```json
{
  "networks": [
    {
      "ssid": "GENESIS-5G",
      "band": "5GHz",
      "channel": 36,
      "security": "WPA3",
      "enabled": true,
      "clients": 8
    },
    {
      "ssid": "GENESIS-2G",
      "band": "2.4GHz",
      "channel": 6,
      "security": "WPA2",
      "enabled": true,
      "clients": 5
    }
  ]
}
```

---

### GET /network/security

**Firewall/Armor Status**

```bash
curl http://localhost:8080/network/security
```

**Response:**

```json
{
  "firewall": {
    "enabled": true,
    "level": "high",
    "blockedToday": 1523
  },
  "armor": {
    "enabled": true,
    "subscription": "active",
    "expiresAt": "2027-02-12",
    "threatsBlocked": 45
  },
  "dosProtection": true,
  "portScan": "blocked"
}
```

---

### POST /network/block

**Block Device by MAC**

```bash
curl -X POST http://localhost:8080/network/block \
  -H "Content-Type: application/json" \
  -d '{"mac": "AA:BB:CC:DD:EE:FF"}'
```

---

### POST /network/unblock

**Unblock Device**

```bash
curl -X POST http://localhost:8080/network/unblock \
  -H "Content-Type: application/json" \
  -d '{"mac": "AA:BB:CC:DD:EE:FF"}'
```

---

### POST /network/reboot

**Reboot Router**

```bash
curl -X POST http://localhost:8080/network/reboot \
  -H "Authorization: Bearer <token>"
```

---

### POST /network/guest-wifi

**Guest WiFi Control**

```bash
curl -X POST http://localhost:8080/network/guest-wifi \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "ssid": "Guest-Network",
    "password": "guest123",
    "duration": 24
  }'
```

---

## Control System (MERKAVA)

### GET /api/merkava/status

**Command Center Status**

```bash
curl http://localhost:8080/api/merkava/status
```

**Response:**

```json
{
  "status": "operational",
  "modules": {
    "total": 13,
    "healthy": 13,
    "degraded": 0,
    "failed": 0
  },
  "uptime": 3600,
  "lastDirective": "2026-02-12T10:25:00.000Z",
  "sovereignMode": false
}
```

---

### GET /api/merkava/diagnostics

**Full Diagnostics**

```bash
curl http://localhost:8080/api/merkava/diagnostics
```

---

### GET /api/merkava/alerts

**Active Alerts**

```bash
curl http://localhost:8080/api/merkava/alerts
```

---

### GET /api/merkava/commands

**Command Log**

```bash
curl http://localhost:8080/api/merkava/commands
```

---

### POST /api/merkava/directive

**Send Directive to Module** (Protected)

```bash
curl -X POST http://localhost:8080/api/merkava/directive \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "TETSUYA",
    "command": "assessRisk",
    "payload": {
      "component": "database"
    }
  }'
```

---

### POST /api/merkava/broadcast

**Broadcast to All Modules** (Protected)

```bash
curl -X POST http://localhost:8080/api/merkava/broadcast \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "healthCheck"
  }'
```

---

### POST /api/merkava/workflow/:name

**Execute Named Workflow**

```bash
curl -X POST http://localhost:8080/api/merkava/workflow/security:sweep \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/merkava/lockdown

**Trigger System Lockdown** (Protected)

```bash
curl -X POST http://localhost:8080/api/merkava/lockdown \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Security incident detected",
    "level": "full"
  }'
```

---

### POST /api/merkava/sovereign/authorize

**Sovereign Mode Authorization** (Protected)

```bash
curl -X POST http://localhost:8080/api/merkava/sovereign/authorize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "passphrase": "sovereign-passphrase",
    "yubikey": "otp-from-yubikey"
  }'
```

---

## Sentinel (TZOFEH)

### GET /api/tzofeh/status

**Sentinel Status**

```bash
curl http://localhost:8080/api/tzofeh/status
```

**Response:**

```json
{
  "status": "watching",
  "watchLevel": "ACTIVE",
  "guardians": 5,
  "canaries": 2,
  "lastScan": "2026-02-12T10:29:00.000Z",
  "anomaliesDetected": 3
}
```

---

### GET /api/tzofeh/diagnostics

**Sentinel Diagnostics**

```bash
curl http://localhost:8080/api/tzofeh/diagnostics
```

---

### GET /api/tzofeh/guardians

**Guardian Daemons**

```bash
curl http://localhost:8080/api/tzofeh/guardians
```

**Response:**

```json
{
  "guardians": [
    {
      "id": "guardian_db",
      "target": "database",
      "status": "healthy",
      "checkInterval": 5000,
      "lastCheck": "2026-02-12T10:30:00.000Z"
    }
  ]
}
```

---

### POST /api/tzofeh/watch-level

**Set Watch Level** (Protected)

```bash
curl -X POST http://localhost:8080/api/tzofeh/watch-level \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"level": "combat"}'
```

**Watch Levels:**
- `0` - PASSIVE
- `1` - ACTIVE
- `2` - ALERT
- `3` - COMBAT
- `4` - SENTINEL

---

### GET /api/tzofeh/anomalies

**Recent Anomalies**

```bash
curl http://localhost:8080/api/tzofeh/anomalies
```

---

## Message Bus (MALAKH)

### GET /api/malakh/status

**Message Bus Status**

```bash
curl http://localhost:8080/api/malakh/status
```

**Response:**

```json
{
  "status": "operational",
  "topics": 15,
  "subscribers": 45,
  "messagesProcessed": 12500,
  "deadLetters": 3
}
```

---

### GET /api/malakh/queues

**Queue Statistics**

```bash
curl http://localhost:8080/api/malakh/queues
```

---

### POST /api/malakh/publish

**Publish Message**

```bash
curl -X POST http://localhost:8080/api/malakh/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "security.alert",
    "payload": {
      "type": "intrusion",
      "severity": "high",
      "source": "network"
    }
  }'
```

---

### POST /api/malakh/broadcast

**Broadcast Message**

```bash
curl -X POST http://localhost:8080/api/malakh/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "type": "maintenance",
      "scheduled": true
    }
  }'
```

---

### GET /api/malakh/circuit-breakers

**Circuit Breaker States**

```bash
curl http://localhost:8080/api/malakh/circuit-breakers
```

**Response:**

```json
{
  "breakers": [
    {
      "name": "external-api",
      "state": "closed",
      "failures": 0,
      "threshold": 5
    },
    {
      "name": "database",
      "state": "half-open",
      "failures": 3,
      "threshold": 5
    }
  ]
}
```

---

## System Endpoints

### GET /api/system/health

**Unified Health Aggregation**

```bash
curl http://localhost:8080/api/system/health
```

---

### GET /api/system/modules

**All Module Listing**

```bash
curl http://localhost:8080/api/system/modules
```

**Response:**

```json
{
  "modules": [
    { "name": "MERKAVA", "status": "healthy", "uptime": 3600 },
    { "name": "TZOFEH", "status": "healthy", "uptime": 3600 },
    { "name": "MALAKH", "status": "healthy", "uptime": 3600 },
    { "name": "KERUV", "status": "healthy", "uptime": 3600 },
    { "name": "EBEN", "status": "healthy", "uptime": 3600 },
    { "name": "SHINOBI", "status": "healthy", "uptime": 3600 },
    { "name": "TETSUYA", "status": "healthy", "uptime": 3600 },
    { "name": "RUACH", "status": "healthy", "uptime": 3600 },
    { "name": "OHR", "status": "healthy", "uptime": 3600 },
    { "name": "HADAAT", "status": "healthy", "uptime": 3600 },
    { "name": "NEPHESH", "status": "healthy", "uptime": 3600 },
    { "name": "VIZ", "status": "healthy", "uptime": 3600 },
    { "name": "HEREV", "status": "healthy", "uptime": 3600 }
  ]
}
```

---

### POST /api/auth/token

**Generate JWT Token**

```bash
curl -X POST http://localhost:8080/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "owner"}'
```

---

### GET /api/auth/verify

**Check Auth Configuration**

```bash
curl http://localhost:8080/api/auth/verify
```

---

## Metrics Endpoints

### GET /api/metrics

**Request Metrics (JSON)**

```bash
curl http://localhost:8080/api/metrics
```

**Response:**

```json
{
  "uptime": 3600,
  "requests": {
    "total": 15000,
    "byMethod": {
      "GET": 12000,
      "POST": 3000
    },
    "byStatus": {
      "2xx": 14500,
      "4xx": 400,
      "5xx": 100
    }
  },
  "latency": {
    "avg": 45,
    "p50": 30,
    "p95": 150,
    "p99": 500
  },
  "memory": {
    "heapUsed": 45678912,
    "heapTotal": 123456789,
    "rss": 234567890
  }
}
```

---

### GET /api/metrics/prometheus

**Prometheus Text Format**

```bash
curl http://localhost:8080/api/metrics/prometheus
```

**Response:**

```
# HELP genesis_uptime_seconds Dashboard uptime in seconds
# TYPE genesis_uptime_seconds gauge
genesis_uptime_seconds 3600

# HELP genesis_requests_total Total HTTP requests
# TYPE genesis_requests_total counter
genesis_requests_total 15000

# HELP genesis_requests_by_method Requests by HTTP method
# TYPE genesis_requests_by_method counter
genesis_requests_by_method{method="GET"} 12000
genesis_requests_by_method{method="POST"} 3000

# HELP genesis_requests_by_status Requests by status class
# TYPE genesis_requests_by_status counter
genesis_requests_by_status{status="2xx"} 14500
genesis_requests_by_status{status="4xx"} 400
genesis_requests_by_status{status="5xx"} 100

# HELP genesis_latency_avg_ms Average request latency in ms
# TYPE genesis_latency_avg_ms gauge
genesis_latency_avg_ms 45

# HELP genesis_ratelimit_clients Active rate-limited clients
# TYPE genesis_ratelimit_clients gauge
genesis_ratelimit_clients 25

# HELP genesis_memory_heap_bytes Heap memory usage
# TYPE genesis_memory_heap_bytes gauge
genesis_memory_heap_bytes 45678912

# HELP genesis_memory_rss_bytes RSS memory usage
# TYPE genesis_memory_rss_bytes gauge
genesis_memory_rss_bytes 234567890
```

---

## Pentagon Room Endpoints

Access any of the 40 rooms via the CMD facet:

```bash
# Generic room command
curl -X POST http://localhost:8080/pentagon/command \
  -H "Content-Type: application/json" \
  -d '{"room": "thermostat"}'
```

### L0 Kernel Rooms

| Room | Command | Description |
|------|---------|-------------|
| thermostat | `thermostat` | Thermal zones |
| chip | `chip` | Entropy stats |
| battery | `battery` | Capacity |
| clock | `clock` | Timers, drift |
| compass | `compass` | Service discovery |
| fuse | `fuse` | Circuit states |
| spark | `spark` | Bootstrap status |
| ground | `ground` | Grounding status |
| coil | `coil` | Induction status |

### L1 Conduit Rooms

| Room | Command | Description |
|------|---------|-------------|
| flares | `flares` | Alert stats |
| locks | `locks` | Lock stats |
| doors | `doors` | Routing stats |
| horn | `horn` | Broadcast stats |
| mirrors | `mirrors` | Probe results |
| antenna | `antenna` | Signal stats |
| relay | `relay` | Forward stats |
| bridge | `bridge` | Bridge stats |
| tunnel | `tunnel` | Tunnel stats |

### L2 Reservoir Rooms

| Room | Command | Description |
|------|---------|-------------|
| trunk | `trunk` | Document stats |
| spares | `spares` | Snapshot manifest |
| coolant | `coolant` | Cache stats |
| wash | `wash` | Sanitization stats |
| tank | `tank` | Buffer stats |
| filter | `filter` | Pipeline stats |
| jack | `jack` | Elevation stats |
| glove | `glove` | Secret stats |
| pump | `pump` | Pump stats |

### L3 Valve Rooms

| Room | Command | Description |
|------|---------|-------------|
| brakes | `brakes` | Stop stats |
| tint | `tint` | Mask stats |
| wipers | `wipers` | Cleanup stats |
| fuel | `fuel` | Quota gauge |
| clutch | `clutch` | Engagement stats |
| gears | `gears` | Throughput stats |
| pedals | `pedals` | Throttle stats |
| gauges | `gauges` | Metric dashboard |
| seatbelts | `seatbelts` | Rollback stats |
| horn | `horn` | Alert stats |

### L4 Manifold Rooms

| Room | Command | Description |
|------|---------|-------------|
| engine | `engine` | Execution stats |
| wings | `wings` | Lane stats |
| mods | `mods` | Plugin stats |
| exhaust | `exhaust` | Telemetry snapshot |
| turbo | `turbo` | Boost stats |
| chassis | `chassis` | Mount manifest |
| bumper | `bumper` | Impact stats |
| spoiler | `spoiler` | Stability stats |
| wheels | `wheels` | Rotation stats |
| mirrors | `mirrors` | Reflection stats |

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": true,
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

**GENESIS 2.0 — Complete API Reference**

Copyright (c) 2025 murray-ux — Founder & Lead Developer — Apache-2.0
