# Forbidden Ninja City Charter

Version: 1.0.0
Status: ACTIVE
Admin Master: CAPUT Admin

- `charter/` – Charter text, metadata, hash
- `governance/` – Verification, Tombs, governance tools
- `tests/` – Structural checks
- `scripts/` – Hardened runners (CERT-MASTER)
- `diagrams/` – Governance map
- `.github/workflows/` – CI enforcement

Quick checks:

```bash
chmod +x governance/verify.sh tests/test_charter_structure.sh
./tests/test_charter_structure.sh
./governance/verify.sh
```
