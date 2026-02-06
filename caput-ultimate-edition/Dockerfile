# GENESIS 2.0 — Multi-stage hardened container
#
# Stage 1: Build Rust integrity boundary
# Stage 2: Build TypeScript (GATE, Wheel, services)
# Stage 3: Production runtime (Node 20 + Python 3)
#
# Security:
#   - Non-root user (genesis:genesis)
#   - Read-only root filesystem (mount /data for state)
#   - no-new-privileges
#   - Pinned base images
#   - Minimal attack surface (--no-install-recommends)
#
# Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

# ---- Stage 1: Rust build ----
FROM rust:1.77-slim-bookworm AS rust-builder

WORKDIR /build
COPY rust_boundary/ ./rust_boundary/

RUN cargo build --release --manifest-path rust_boundary/Cargo.toml

# ---- Stage 2: TypeScript build ----
FROM node:20-slim AS ts-builder

WORKDIR /build

# Install deps first (layer cache — only busted when package.json changes)
COPY package.json tsconfig.json ./
RUN npm ci --ignore-scripts

# Copy source directories
COPY src/ ./src/
COPY identity/ ./identity/
COPY security/ ./security/
COPY orchestration/ ./orchestration/
COPY cert_master/ ./cert_master/
COPY legal/ ./legal/
COPY ai/ ./ai/
COPY db/ ./db/
COPY config/ ./config/

# Compile
RUN npx tsc --outDir dist

# ---- Stage 3: Production runtime ----
FROM node:20-slim AS runtime

# Python 3 for core verification modules
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r genesis && useradd -r -g genesis -m genesis

WORKDIR /app

# Rust integrity binary
COPY --from=rust-builder /build/rust_boundary/target/release/genesis-verify /usr/local/bin/genesis-verify
RUN chmod 755 /usr/local/bin/genesis-verify

# Compiled TypeScript + production deps
COPY --from=ts-builder /build/dist/ ./dist/
COPY --from=ts-builder /build/node_modules/ ./node_modules/
COPY --from=ts-builder /build/package.json ./

# Python core modules (policy, audit, verifier, orchestrator)
COPY core/ ./core/

# Shell entrypoints and verification scripts
COPY entrypoint.sh ./entrypoint.sh
COPY bin/ ./bin/
COPY verify/ ./verify/
RUN chmod +x entrypoint.sh && \
    find bin/ verify/ -name '*.sh' -exec chmod +x {} +

# Config templates and charter (no secrets — Axiom A6)
COPY config/ ./config/
COPY spec/ ./spec/

# Data volume: audit logs, evidence chains, signing keys, citations
RUN mkdir -p /data/audit /data/evidence /data/evidence/custody \
             /data/evidence/citations /data/keys \
    && chown -R genesis:genesis /data

VOLUME ["/data"]

# Environment defaults — overridden at runtime via docker-compose or -e flags
ENV GENESIS_AUDIT_DIR=/data/audit \
    GENESIS_EVIDENCE_DIR=/data/evidence \
    GENESIS_KEY_DIR=/data/keys \
    GENESIS_DATA_DIR=/data \
    NODE_ENV=production

# Switch to non-root before exposing anything
USER genesis

# Health check via GATE health command (no HTTP server required)
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD node dist/src/index.js health 2>/dev/null | grep -q SEALED || exit 1

# Default: run the GATE (Charter §4: Single entry point)
ENTRYPOINT ["node", "dist/src/index.js"]
CMD ["--help"]
