# SECURITY_DESIGN_V1

All certificates are:

1. Rendered to PDF via Puppeteer (headless Chromium).
2. Hashed with SHA-256.
3. Signed with Ed25519 using the operator's private key.
4. Stored in the `evidence.bundle` table with full metadata.
5. Immutable once written; no update or delete path exists.
