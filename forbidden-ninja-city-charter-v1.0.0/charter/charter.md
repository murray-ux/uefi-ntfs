# Master Charter of Forbidden Ninja City

**Preamble**

We, the architects, custodians, and guardians of Forbidden Ninja City, do hereby establish this Master Charter to codify the immutable principles and irrevocable structures upon which our City is founded. This Charter supersedes all habits, customs, undocumented tools, and temporary bypasses. No demon, script, agent, or human may override these Articles except through the solemn amendment process defined herein.

---

## Article I: Sovereignty and Supremacy

**Section 1.1 – The City's Nature**

Forbidden Ninja City is a self‑governing technical dominion: a layered ecosystem of infrastructure, monitoring, flow control, social organization, policy enforcement, and substrate resilience. It exists as both metaphor and machine, aligning human intent with computational reality.

**Section 1.2 – Charter Supremacy**

This Charter is the highest law of the City. Any script, policy, or practice in conflict with this Charter is void. No agent or administrator may invoke "legacy behavior" or "undocumented precedent" to circumvent these Articles.

**Section 1.3 – Continuous Operation**

The City operates continuously. Maintenance, migrations, and upgrades shall be executed under the Charter's governance framework, ensuring zero tolerance for uncontrolled outages or data loss.

---

## Article II: The Six Layers of the City

The City is structured in six immutable layers. Each layer has distinct responsibilities, ownership, and governance rules.

**Section 2.1 – Layer Definitions**

1. **Matter Layer** – Physical and logical infrastructure: compute nodes, storage volumes, network devices, power systems, cooling, and hardware lifecycle management.

2. **Biota Layer** – Monitoring, telemetry, observability, and sensor networks. All vital signs of the City flow through this layer.

3. **Flow Layer** – Data movement and communication: RPC protocols, message queues, event buses, tunnels, and inter‑service data paths.

4. **Social Layer** – Identity, access, roles, clans (teams), permissions, and human‑machine interaction protocols.

5. **Control Layer** – Policy enforcement, automation demons, rule engines, compliance checks, and operational orchestration.

6. **Substrate Layer** – Backup systems, disaster recovery, vaults, archives, cryptographic seeds, and the deep storage of secrets and credentials.

**Section 2.2 – Layer Integrity**

Each layer must maintain clear boundaries. Cross‑layer dependencies must be documented and approved by the Council of Hidden Roofs. No layer may bypass another layer's controls.

---

## Article III: Governance Bodies

**Section 3.1 – The Council of Hidden Roofs**

The Council of Hidden Roofs is the supreme governing body of the City. It consists of five seats:

1. **Infra**
2. **Security**
3. **Data**
4. **Product**
5. **Archives**

The Council oversees all demon‑grade systems, approves Charter amendments, ratifies major migrations, and arbitrates disputes between layers or clans.

**Section 3.2 – ADMIN_MASTER**

The ADMIN_MASTER is the Grand‑Master of Forbidden Ninja City, holding ultimate executive authority. The current ADMIN_MASTER is **CAPUT Admin**.

The ADMIN_MASTER:
- Convenes the Council
- Executes emergency overrides (with mandatory post‑incident review)
- Holds final authority over MASTER NINJA PUFF rituals
- Maintains the Vault of Ultimate Recovery

**Section 3.3 – Clans (Teams)**

Clans are self‑organizing groups aligned to specific layers or systems. Each clan has a designated Lead and operates under Council oversight.

---

## Article IV: Demons and Automation

**Section 4.1 – Definition of Demons**

A **demon** is any autonomous process, agent, or script that operates continuously or on schedule, performing critical functions without direct human intervention.

**Section 4.2 – Demon‑Grade Systems**

Systems classified as demon‑grade must:
- Have a written specification
- Be code‑reviewed and approved by the Council
- Be monitored by the Biota Layer
- Have rollback and kill‑switch procedures
- Log all actions to an immutable audit trail

**Section 4.3 – Prohibition on Undocumented Demons**

No demon may run in production without Council approval. Undocumented or rogue demons are subject to immediate termination and forensic investigation.

---

## Article V: The Ward of Still Waters (Jails and Quarantine)

**Section 5.1 – Purpose**

The Ward of Still Waters is the City's quarantine and jail system. It isolates:
- Compromised nodes or services
- Unsafe or untested code
- Suspicious traffic or actors
- Failed experiments pending investigation

**Section 5.2 – Entry and Exit**

Entry into the Ward is automatic via policy triggers or manual by Council decree. Exit requires:
- Root‑cause analysis
- Remediation plan
- Council approval
- Successful testing in staging

**Section 5.3 – Logging**

All Ward events are logged to the Tombs Register (see Article IX).

---

## Article VI: Migrations and Major Changes

**Section 6.1 – Demon‑Grade Migrations**

Any migration affecting:
- Substrate (backups, vaults, recovery systems)
- Control Layer (policy engines, automation)
- Multi‑layer dependencies

...is classified as **demon‑grade** and must follow this process:

1. **Specification** – Written spec approved by Council
2. **Review** – Technical review by relevant clans
3. **Policy Freeze** – No policy changes during migration window
4. **Signed Migration** – Cryptographically signed by ADMIN_MASTER and Council majority
5. **Rollback Plan** – Documented and tested before execution

**Section 6.2 – Emergency Migrations**

In catastrophic scenarios, ADMIN_MASTER may invoke emergency migration authority. Post‑migration, a mandatory incident review must be conducted within 72 hours.

---

## Article VII: MASTER NINJA PUFF

**Section 7.1 – Definition**

MASTER NINJA PUFF is the City's ritual for elevating hidden or ad‑hoc work into formal, documented, and governed systems.

**Section 7.2 – The Ritual**

When undocumented "shadow work" is discovered:
1. **Acknowledge** – Publicly recognize the work and its creator
2. **Elevate** – Formalize into a spec
3. **Review** – Subject to normal governance
4. **Archive** – Original artifacts preserved in the Archives

**Section 7.3 – Zero Punishment**

MASTER NINJA PUFF operates under a no‑blame policy. The goal is integration, not punishment.

---

## Article VIII: Vault and Substrate Governance

**Section 8.1 – The Vault of Ultimate Recovery**

The Vault contains:
- Root credentials and seeds
- Disaster recovery keys
- Charter signing keys
- Offline backups of critical systems

**Section 8.2 – Access Control**

Vault access requires:
- ADMIN_MASTER authorization
- Council notification (within 24 hours)
- Audit logging
- Multi‑factor authentication

**Section 8.3 – Recovery Procedures**

All recovery procedures must be:
- Documented
- Tested quarterly
- Versioned and signed
- Stored in both the Vault and Archives

---

## Article IX: Silver_Bullet Protocols and the Tombs Register

**Section 9.1 – Purpose**

Silver_Bullet protocols govern the exile and permanent removal of artifacts (code, scripts, binaries, configurations) deemed unsafe, obsolete, or compromised.

**Section 9.2 – The Tombs Register**

The Tombs Register (`governance/tombs.log`) is an append‑only log of exiled artifacts. Each entry contains:
- Timestamp (ISO 8601 UTC)
- SHA‑256 hash of artifact
- Artifact identifier
- Owner/responsible party
- Reason for exile

**Section 9.3 – Enforcement**

All deployment systems, CI/CD pipelines, and runtime environments must check the Tombs Register before executing any artifact. Attempts to run exiled artifacts trigger `EXILED_REVENGE_ATTEMPT` alerts and are automatically blocked.

**Section 9.4 – No Return Without Rebirth**

Exiled artifacts may not be restored. If similar functionality is needed, it must be:
- Re‑implemented from scratch
- Given a new artifact ID and hash
- Subject to full governance review

---

## Article X: Charter Amendments

**Section 10.1 – Amendment Process**

This Charter may be amended by:
1. Proposal by any Council member or ADMIN_MASTER
2. Review period of minimum 7 days
3. Council vote (4 of 5 seats required)
4. ADMIN_MASTER ratification
5. Cryptographic signing and publication

**Section 10.2 – Version Control**

All Charter versions are:
- SHA‑256 hashed
- Stored in the Archives
- Referenced in all dependent systems via hash

**Section 10.3 – Immutable History**

Previous Charter versions remain accessible for audit and historical reference. No version may be deleted or altered.

---

## Final Clause

This Charter takes effect immediately upon publication and signature by ADMIN_MASTER CAPUT Admin and the Council of Hidden Roofs. All systems, demons, clans, and agents of Forbidden Ninja City are hereby bound by these Articles.

**Signed:**
ADMIN_MASTER CAPUT Admin, Grand‑Master of Forbidden Ninja City
Council of Hidden Roofs

**Date:** 2026-02-04
**Version:** 1.0.0
**Status:** ACTIVE
