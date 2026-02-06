# GENESIS 2.0 — MASTER CHARTER

**Classification:** Sovereign Specification
**Revision:** 1.0.0
**Authority:** This document. Code is subordinate. If code contradicts charter, code is wrong.

---

## 0. PREAMBLE

GENESIS 2.0 is a hardened automation platform. This charter defines what it
*is*, what it *must do*, and what it *must never do*. All subsystems, modules,
agents, and integrations are bound by this document.

No tutorial. No walkthrough. No compromise.

---

## 1. AXIOMS

Axioms are non-negotiable. Violation of any axiom is a system-level failure.

| ID | Axiom | Consequence of Violation |
|----|-------|--------------------------|
| A1 | **Fail closed.** Unknown state is compromise state. | Kill the operation. Log. Do not proceed. |
| A2 | **Default DENY.** No policy match = denial. | Return DENY with reason `NO_MATCHING_POLICY`. |
| A3 | **Audit everything.** Every state transition, every decision, every failure. | If audit write fails, halt the operation. Audit failure is system failure. |
| A4 | **Sign everything.** Every output artifact carries an Ed25519 signature. | Unsigned output must not leave the system boundary. |
| A5 | **Chain everything.** Every audit record links to its predecessor by hash. | Broken chain = evidence of tampering. System enters LOCKDOWN. |
| A6 | **No secrets in code.** All credentials, keys, and identifiers come from environment or keystore. | Presence of a literal secret in source is a build-breaking violation. |
| A7 | **Spec is sovereign.** Code implements charter. Charter does not describe code. | Divergence between spec and code is resolved in favour of spec. |
| A8 | **Single entry.** All operations enter through the GATE. No backdoors. No convenience shortcuts. | Code that bypasses the GATE is dead code. Remove it. |
| A9 | **Wheel governs.** Every operation passes through the Wheel lifecycle. No exceptions. | An unwheeled operation is an unauthorized operation. |
| A10 | **Destroy on done.** Key material in memory is zeroized after use. | Residual key material is a vulnerability. |

---

## 2. IDENTITY MATRIX

Every entity in the system has exactly one identity class. Identity determines
what gates it passes through and what audit events it generates.

| Identity Class | Description | Authentication Method | Trust Level |
|----------------|-------------|----------------------|-------------|
| `owner` | System owner. Ultimate authority. | Ed25519 key + JWT | ABSOLUTE |
| `admin` | Delegated administrator. | JWT with `admin` role | HIGH |
| `service` | Internal service-to-service. | Shared HMAC secret | MEDIUM |
| `agent` | Autonomous software agent. | JWT with `agent` role, scoped | LOW |
| `anonymous` | Unauthenticated caller. | None | ZERO |

**Trust level semantics:**

- ABSOLUTE: May override any DENY (logged, audited, non-silent).
- HIGH: May execute all standard operations. Cannot override.
- MEDIUM: May execute operations within its declared scope.
- LOW: May execute only explicitly permitted operations. All others DENY.
- ZERO: May access `/health` endpoint only. Everything else DENY.

---

## 3. SUBSYSTEM REGISTRY

Each subsystem has: a name, a boundary, a state model, gate conditions,
audit events, and failure codes.

### 3.1 WHEEL

**Purpose:** Lifecycle governance. Every operation is a spoke.

**State Model:**

```
BORN ──→ GATED ──→ ATTESTED ──→ EXECUTING ──→ SEALED
  │         │          │            │              │
  └─→ DEAD  └─→ DEAD   └─→ DEAD    └─→ DEAD       │
                                                    └─→ (terminal, success)
```

**Legal Transitions:**

| From | To | Condition |
|------|----|-----------|
| BORN | GATED | Always (automatic) |
| GATED | ATTESTED | Evaluator returns ALLOW |
| GATED | DEAD | Evaluator returns DENY |
| ATTESTED | EXECUTING | Pre-execution integrity check passes |
| ATTESTED | DEAD | Integrity check fails |
| EXECUTING | SEALED | Execute function returns without throwing |
| EXECUTING | DEAD | Execute throws, or deadline exceeded |

**Any transition not listed above kills the spoke immediately.**

**Gate Conditions:**
- BORN → GATED: Spoke ID derived (SHA-256 of canonical spec).
- GATED → ATTESTED: `Evaluator.evaluate()` returns `{ effect: "ALLOW" }`.
- ATTESTED → EXECUTING: Attestation receipt hash matches expected.
- EXECUTING → SEALED: Result is non-void. Deadline not exceeded.

**Audit Events:**
- `SPOKE_BORN` — spoke created with ID and spec
- `SPOKE_GATED` — policy decision recorded
- `SPOKE_ATTESTED` — integrity receipt recorded
- `SPOKE_EXECUTING` — execution started with deadline
- `SPOKE_SEALED` — success, result hash recorded
- `SPOKE_DEAD` — failure, reason and phase-at-death recorded

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `W-001` | Illegal state transition attempted |
| `W-002` | Evaluator returned DENY |
| `W-003` | Attestation hash mismatch |
| `W-004` | Deadline exceeded |
| `W-005` | Execute function threw |
| `W-006` | Audit write failed during spoke lifecycle |

---

### 3.2 EVALUATOR (PDP)

**Purpose:** Policy Decision Point. Answers ALLOW or DENY.

**Boundary:** Receives `EvaluationInput`, returns `Decision`. No side effects
except audit logging. Evaluator must never modify state.

**State Model:** Stateless. Each evaluation is independent.

**Gate Conditions:**
- Input must contain: `principalId`, `resource`, `action`.
- Missing field → DENY with reason `INCOMPLETE_INPUT`.

**Decision Logic (ordered, first match wins):**

1. Check explicit DENY rules. If match → DENY.
2. Check explicit ALLOW rules. If match → ALLOW.
3. No match → DENY (Axiom A2).

**Audit Events:**
- `POLICY_DECISION` — principal, resource, action, effect, reasons

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `E-001` | Incomplete evaluation input |
| `E-002` | Doctrine not loaded |
| `E-003` | Evaluation threw (treated as DENY) |

---

### 3.3 SIGNER

**Purpose:** Ed25519 digital signatures. Key lifecycle management.

**Boundary:** Signs bytes. Verifies signatures. Manages keypair on disk.

**State Model:**

```
UNINITIALIZED ──→ LOADED ──→ SIGNING ──→ LOADED
                    │                       │
                    └───────────────────────┘
                    │
                    └──→ DESTROYED (terminal)
```

**Gate Conditions:**
- UNINITIALIZED → LOADED: Key file exists on disk with 600 permissions, OR generated fresh.
- LOADED → SIGNING: Caller provides non-empty payload.
- SIGNING → LOADED: Signature produced successfully.
- LOADED → DESTROYED: `destroy()` called. Key material zeroized. No further operations.

**Output Contract:**
Every signature output contains:
- `hash`: SHA-256 of the signed content
- `signature`: hex-encoded Ed25519 signature
- `keyId`: SHA-256 of the public key (identifier, not the key itself)
- `signedAt`: ISO 8601 timestamp

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `S-001` | Key file missing and generation failed |
| `S-002` | Key file permissions not 600 |
| `S-003` | Empty payload |
| `S-004` | Signing operation failed |
| `S-005` | Verification failed (signature invalid) |
| `S-006` | Operation attempted after destroy |

---

### 3.4 SSO

**Purpose:** Token issuance, authentication, and authorization.

**Boundary:** Issues JWTs. Validates JWTs. Delegates authorization to Evaluator.

**Token Structure:**

```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { "sub": <principalId>, "roles": [...], "iat": <unix>, "exp": <unix> }
Signature: HMAC-SHA256(header.payload, JWT_SECRET)
```

**Gate Conditions:**
- `issueToken`: Requires `principalId` and `roles[]`.
- `authenticate`: Token must be well-formed, unexpired, and signature-valid.
- `authorise`: Token must authenticate, then Evaluator must return ALLOW.

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `SSO-001` | Malformed token (not 3 segments) |
| `SSO-002` | Signature verification failed |
| `SSO-003` | Token expired |
| `SSO-004` | Authorization denied by Evaluator |

---

### 3.5 QUANTUM SHIELD

**Purpose:** OS-level health monitoring and hardening verification.

**Boundary:** Reads system state. Never modifies it. Reports findings.

**Checks (Health):**

| Check | Method | Threshold |
|-------|--------|-----------|
| Disk | `df` or `statvfs` | < 90% usage |
| Memory | `os.freemem / os.totalmem` | < 85% usage |
| CPU | `os.loadavg[0] / os.cpus.length` | < 2.0 |
| Secure Boot | `mokutil --sb-state` | Enabled |
| Firewall | `iptables -L` / `ufw status` / `pfctl` | Active |

**Checks (Hardening):**

| Check | Method | Expected |
|-------|--------|----------|
| SSH password auth | `/etc/ssh/sshd_config` | Disabled |
| SSH root login | `/etc/ssh/sshd_config` | Disabled |
| World-writable /etc | `find /etc -perm -002` | None found |
| /tmp noexec | `mount` | noexec flag present |
| Auto-updates | `apt`, `dnf`, or `launchd` | Enabled |

**Drift Detection:** On first run, saves baseline to `<dataDir>/shield_baseline.json`.
On subsequent runs, compares current state to baseline. Any delta is drift.

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `QS-001` | Disk usage exceeds threshold |
| `QS-002` | Memory usage exceeds threshold |
| `QS-003` | CPU load exceeds threshold |
| `QS-004` | Secure Boot not enabled |
| `QS-005` | Firewall not active |
| `QS-006` | Hardening check failed |
| `QS-007` | Drift detected from baseline |

---

### 3.6 CHAIN OF CUSTODY

**Purpose:** Tamper-evident, append-only evidence chain.

**Boundary:** Writes records to JSONL. Reads and verifies chains.

**Record Structure:**

```
{
  "sequence":    <int>,
  "eventType":   <string>,
  "actorId":     <string>,
  "timestamp":   <ISO8601>,
  "payload":     <object>,
  "contentHash": <SHA-256 of payload>,
  "prevHash":    <SHA-256 of previous record, or "genesis">,
  "chainHash":   <SHA-256(prevHash | contentHash | sequence | timestamp)>,
  "signature":   <Ed25519(chainHash)>
}
```

**Verification (5 checks per record):**

| # | Check | Failure |
|---|-------|---------|
| 1 | Sequence is monotonically increasing | `COC-001` |
| 2 | `prevHash` matches previous record's `chainHash` | `COC-002` |
| 3 | `contentHash` matches `SHA-256(payload)` | `COC-003` |
| 4 | `chainHash` matches `SHA-256(prevHash\|contentHash\|sequence\|timestamp)` | `COC-004` |
| 5 | `signature` verifies against public key | `COC-005` |

**Any single check failure invalidates the entire chain from that point forward.**

---

### 3.7 LEGAL AUTOMATION

**Purpose:** Court document generation from structured data.

**Pipeline:**

```
CSV file → parse → validate rows → for each row:
  render HTML template → inject fields → sign content →
  render to PDF → write to output dir → store evidence record
→ write manifest
```

**Gate Conditions:**
- CSV must parse without error.
- Every required column must be present.
- Template must exist and contain expected `{{placeholders}}`.

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `LA-001` | CSV parse error |
| `LA-002` | Missing required column |
| `LA-003` | Template not found |
| `LA-004` | Template missing required placeholder |
| `LA-005` | PDF render failed |
| `LA-006` | Evidence storage failed |

---

### 3.8 CERT-MASTER

**Purpose:** Exam certificate generation with strict pass policy.

**Pass Policy V1:** `score == max_score`. No rounding. No curves. 100% or fail.

**Pipeline:** Same as Legal Automation, with pass gate inserted before render.

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `CM-001` | CSV parse error |
| `CM-002` | Candidate did not meet pass policy |
| `CM-003` | PDF render failed |
| `CM-004` | Evidence storage failed |

---

### 3.9 AI ORCHESTRATOR

**Purpose:** LLM-assisted workflows. Optional subsystem.

**Boundary:** Sends prompts to external LLM API. Returns text. Never executes
LLM output as code. Never stores API keys in output.

**Constraint: AI output is DRAFT. Never final. Always carries disclaimer.**

**Available Functions:**

| Function | Model Tier | Purpose |
|----------|-----------|---------|
| `draftLegalDoc` | Primary | Legal document drafting |
| `summariseEvidence` | Primary | Evidence bundle summarisation |
| `planAutomationChange` | Secondary | DevSecOps change planning |
| `query` | Configurable | General-purpose |

**Gate Conditions:**
- `GENESIS_LLM_API_KEY` must be set. If absent, all AI functions return error.
- Every AI call is audited with `AGENT_ACTION` event.
- AI output must never be passed to `eval()`, `exec()`, `Function()`, or shell.

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `AI-001` | LLM API key not configured |
| `AI-002` | LLM API call failed |
| `AI-003` | LLM returned empty response |

---

### 3.10 CERTIFICATE MANAGER

**Purpose:** SSL/TLS validation for outbound HTTPS connections.

**Boundary:** Validates certificate chains. Monitors expiry. Pins certificates.
Never modifies system CA store.

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `TLS-001` | Certificate chain validation failed |
| `TLS-002` | Certificate expired |
| `TLS-003` | Certificate expiring within threshold |
| `TLS-004` | Certificate pin mismatch |
| `TLS-005` | Connection timeout |

---

### 3.11 TOLKIENIAN KEY

**Purpose:** Multi-factor key derivation and integrity beacon chain.

**Boundary:** Derives master key from multiple strands. Issues activation tokens.
Maintains beacon chain. Zeroizes on destroy.

**Constraint: Minimum 2 strands. Single-strand derivation is forbidden.**

**Failure Codes:**

| Code | Meaning |
|------|---------|
| `TK-001` | Fewer than 2 strands provided |
| `TK-002` | Activation attempted before weaving |
| `TK-003` | Token verification failed |
| `TK-004` | Beacon chain integrity broken |

---

## 4. TRUST BOUNDARIES

```
┌─────────────────────────────────────────────────────────┐
│                    EXTERNAL BOUNDARY                     │
│  (Internet, LLM APIs, FleetDM, court portals, users)    │
└──────────────────────┬──────────────────────────────────┘
                       │ TLS only. Certificate validated.
                       │ JWT required for all non-/health.
┌──────────────────────▼──────────────────────────────────┐
│                      GATE (src/index.ts)                 │
│  Single entry. Env enforced. CLI dispatch.               │
└──────────────────────┬──────────────────────────────────┘
                       │ Every operation → Wheel.spin()
┌──────────────────────▼──────────────────────────────────┐
│                      WHEEL                               │
│  State machine. Evaluator gate. Deadline. Audit seal.    │
└───┬───────┬───────┬───────┬───────┬───────┬─────────────┘
    │       │       │       │       │       │
    ▼       ▼       ▼       ▼       ▼       ▼
 Signer   SSO   Shield  Legal   Cert    AI
    │       │       │       │       │       │
    ▼       ▼       ▼       │       │       ▼
  Keystore JWT    OS cmds   │       │    LLM API
  (disk,   Secret (read    ├───────┘    (external,
   600)    (env)   only)   ▼             TLS)
                        Evidence
                        Store
                     (memory or
                      PostgreSQL)
```

**Boundary rules:**
- Nothing crosses the external boundary without TLS validation.
- Nothing enters the GATE without environment enforcement.
- Nothing passes the Wheel without Evaluator approval.
- Nothing leaves the system unsigned (Axiom A4).
- Nothing touches disk without audit (Axiom A3).

---

## 5. DIRECTORY TOPOLOGY

```
genesis/
├── src/
│   ├── index.ts              ← GATE
│   ├── server.ts             ← HTTP interface
│   ├── wheel/
│   │   └── wheel-orchestrator.ts
│   ├── core/
│   │   ├── evaluator.ts      ← PDP
│   │   └── doctrine.ts       ← Rule definitions
│   ├── audit/
│   │   ├── audit-service.ts
│   │   └── chain-of-custody.ts
│   ├── pep/                  ← Policy Enforcement Points
│   ├── ci/                   ← CI pipeline integration
│   ├── firmware/             ← Firmware validation
│   ├── agents/               ← Autonomous agents
│   └── override/             ← Owner override (ABSOLUTE trust only)
├── identity/
│   ├── ed25519_signer.ts
│   └── sso_master.ts
├── security/
│   ├── quantum_shield_core.ts
│   ├── tolkien_key.ts
│   ├── certificate_manager.py
│   └── fleetdm_client.ts
├── legal/
│   └── legal_automation.ts
├── cert_master/
│   └── cert_master.ts
├── ai/
│   └── ai_orchestrator.ts
├── orchestration/
│   └── grandmaster_orchestrator.ts
├── db/
│   ├── genesis_platform.sql
│   └── genesis_db.ts
├── config/
│   ├── config_loader.ts
│   └── genesis_infrastructure.yml
├── deploy/
│   └── genesis-deploy.sh
├── spec/
│   └── (specification documents)
├── verify/
│   └── (verification scripts)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 6. FAILURE SEMANTICS

**Global failure rules (apply to all subsystems):**

| Condition | Response |
|-----------|----------|
| Unknown state | Kill operation. Log `UNKNOWN_STATE`. Axiom A1. |
| Audit write fails | Halt operation. Do not proceed. Axiom A3. |
| Key material inaccessible | Halt. Cannot sign = cannot output. Axiom A4. |
| Environment variable missing | GATE refuses to start. Axiom A6. |
| Unhandled exception in spoke | Spoke → DEAD. Wheel logs. System continues. |
| Chain hash mismatch | LOCKDOWN. No further writes. Alert. Axiom A5. |

**LOCKDOWN state:** When chain integrity is violated, the system enters
LOCKDOWN. In LOCKDOWN:
- No new evidence records may be written.
- No new documents may be generated.
- Health checks continue (read-only).
- Audit logging continues (to a new, separate chain).
- Only `owner` identity class may exit LOCKDOWN after manual investigation.

---

## 7. VERIFICATION MATRIX

Every subsystem must satisfy these verification criteria before the system
is considered operational.

| Subsystem | Verification | Method |
|-----------|-------------|--------|
| Wheel | Illegal transition → DEAD | Unit test: attempt BORN→EXECUTING |
| Wheel | Deadline exceeded → DEAD | Unit test: sleep past deadline |
| Evaluator | No matching rule → DENY | Unit test: unknown resource |
| Signer | Sign + verify round-trip | Unit test: sign bytes, verify |
| Signer | Key permissions = 600 | Integration test: stat key file |
| SSO | Expired token → reject | Unit test: issue with -1s expiry |
| SSO | Tampered token → reject | Unit test: flip bit in signature |
| Shield | Disk > 90% → warning | Mock: stub df output |
| Chain of Custody | Tampered record → fail verify | Unit test: modify payload after write |
| Chain of Custody | Missing record → fail verify | Unit test: delete middle record |
| Legal | Missing column → LA-002 | Unit test: CSV without required field |
| Cert-Master | 99% score → fail | Unit test: score=99, max=100 |
| AI | No API key → AI-001 | Unit test: unset env var |
| GATE | Missing env → exit(1) | Integration test: unset required var |
| TLS | Expired cert → TLS-002 | Unit test: connect to expired.badssl.com |

---

## 8. CONFIGURATION CONTRACT

All configuration enters through environment variables. No config files
are required for core operation (config files are optional overrides).

**Required (system will not start without these):**

| Variable | Purpose |
|----------|---------|
| `GENESIS_KEY_DIR` | Directory for Ed25519 keypairs |
| `GENESIS_AUDIT_DIR` | Directory for audit logs |
| `GENESIS_EVIDENCE_DIR` | Directory for evidence artifacts |
| `GENESIS_JWT_SECRET` | HMAC secret for JWT signing |

**Optional (degrade gracefully if absent):**

| Variable | Default | Purpose |
|----------|---------|---------|
| `GENESIS_PDP_PORT` | `8080` | HTTP server port |
| `GENESIS_OWNER_ID` | `owner` | Default principal for CLI operations |
| `GENESIS_JURISDICTION` | `general` | Legal jurisdiction context |
| `GENESIS_LLM_API_KEY` | (none) | Enables AI features |
| `GENESIS_LLM_MODEL` | `gpt-4o` | Primary LLM model |
| `GENESIS_LLM_MODEL_LIGHT` | `gpt-4o-mini` | Secondary LLM model |
| `GENESIS_DATABASE_URL` | (none) | PostgreSQL connection string |
| `GENESIS_FLEET_API_URL` | (none) | FleetDM server URL |
| `GENESIS_FLEET_API_KEY` | (none) | FleetDM API key |
| `GENESIS_BROWSER_WS` | (none) | Puppeteer WebSocket for PDF |
| `GENESIS_DATA_DIR` | `./data` | Root data directory |
| `GENESIS_OUTPUT_DIR` | `./data/output` | Generated document output |
| `GENESIS_TEMPLATE_DIR` | (none) | Custom HTML templates |

---

## END OF CHARTER

This document is the authority. Code implements it. Tests verify it.
Divergence is a defect. There are no exceptions.
