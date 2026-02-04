# Cryptographic Policy

## Hash Algorithm
- **SHA-256** (canonical, non-negotiable)
- Format: `sha256:<hex_string>` (as stored in build/hashes/)

## Signing
- **Ed25519** for evidence and document signing
- Optional X.509 if required by external policy

## Key Rotation
- By rebuild only (new key introduced, old keys preserved for audit trail)

## Downgrade Prevention
- Algorithms are fixed by policy
- Runtime negotiation is prohibited
- No fallback to weaker algorithms
