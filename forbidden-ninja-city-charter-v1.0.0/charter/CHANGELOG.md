# Charter Changelog

All notable changes to the Master Charter of Forbidden Ninja City will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-02-03

### Added
- **Doctrine of the Observer** (`doctrine-observer.md`)
  - Article I: On Conceptual Integrity - validates metaphorical framework
  - Article II: On Architectural Soundness - Layer Litmus Test
  - Article III: On Silver_Bullet Excellence - Rebirth Protocol
  - Article IV: On MASTER NINJA PUFF Genius - The PUFF Guarantee
  - Article V: On Cryptographic Integrity - Hash Regeneration Protocol
  - Article VI: On Amendment Tracking - CHANGELOG requirement
  - Article VII: On Integration with GENESIS - Supremacy Chain
  - Article VIII: On Cultural Adoption - Three-Read Test
- `CHANGELOG.md` for tracking amendments per Doctrine Article VI
- Doctrines array in `charter.meta.json`

### Fixed
- **Charter hash mismatch** - Regenerated `charter.sha256` and updated `charter.meta.json` to reflect actual file hash (`ab470b4b41d441c556eeddfda6ac9ce1ae5ee24ebf90e891436ee32e9134af83`)

### Security
- Cryptographic integrity now verified - hash binding restored

---

## [1.0.0] - 2026-02-04

### Added
- **Master Charter** (`charter.md`) - Initial ratification
  - Article I: Sovereignty and Supremacy
  - Article II: The Six Layers of the City
  - Article III: Governance Bodies
  - Article IV: Demons and Automation
  - Article V: The Ward of Still Waters
  - Article VI: Migrations and Major Changes
  - Article VII: MASTER NINJA PUFF
  - Article VIII: Vault and Substrate Governance
  - Article IX: Silver_Bullet Protocols and the Tombs Register
  - Article X: Charter Amendments
- **Charter Metadata** (`charter.meta.json`)
- **Charter Hash** (`charter.sha256`)
- **Governance Tools**
  - `verify.sh` - POSIX shell verification
  - `verify.js` - Node.js ES module verification
  - `verify.py` - Python verification
  - `cert_governance_report.py` - CERT governance reporting
- **Silver_Bullet / Tombs System**
  - `tombs.log` - Append-only exile register
  - `tombs.meta.json` - Tombs policy
  - `tombs_exile.sh` - Artifact exile tool
  - `tombs_check.sh` - EXILED_REVENGE_ATTEMPT detection
- **Tests**
  - `test_charter_structure.sh` - Structural validation
- **Scripts**
  - `cert_master_run.sh` - Hardened CERT-MASTER runner
- **CI/CD Workflows**
  - `charter-check.yml` - Charter integrity enforcement
  - `cert-master.yml` - CERT-MASTER pipeline
- **Diagrams**
  - `governance-map.mmd` - Mermaid governance visualization

### Governance
- ADMIN_MASTER: Murray Bembrick
- Council of Hidden Roofs: 5 seats (Infra, Security, Data, Product, Archives)

---

## Amendment Process Reference

Per Charter Article X, amendments require:

1. Proposal by Council member or ADMIN_MASTER
2. Minimum 7-day review period
3. Council vote (4 of 5 seats)
4. ADMIN_MASTER ratification
5. Cryptographic signing and publication

All versions remain accessible for audit per Section 10.3 (Immutable History).
