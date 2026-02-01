# GENESIS 2.0 — Multi-stage hardened container
#
# Stage 1: Build Rust integrity boundary
# Stage 2: Build TypeScript
# Stage 3: Production runtime (Node 20 + Python 3)
#
# Security:
#   - Non-root user
#   - Read-only filesystem (mount /data for audit logs)
#   - No privileged mode
#   - Pinned base images
#
# Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

# ---- Stage 1: Rust build ----
FROM rust:1.77-slim-bookworm AS rust-builder

WORKDIR /build
COPY rust_boundary/ ./rust_boundary/

RUN cargo build --release --manifest-path rust_boundary/Cargo.toml \
    && cargo test --manifest-path rust_boundary/Cargo.toml

# ---- Stage 2: TypeScript build ----
FROM node:20-slim AS ts-builder

WORKDIR /build
COPY package.json tsconfig.json ./
RUN npm install

COPY src/ ./src/
COPY identity/ ./identity/
COPY security/ ./security/
COPY orchestration/ ./orchestration/
COPY cert_master/ ./cert_master/
COPY legal/ ./legal/

RUN npx tsc

# ---- Stage 3: Production runtime ----
FROM node:20-slim AS runtime

# Install Python 3 for the Python modules
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r genesis && useradd -r -g genesis -m genesis

WORKDIR /app

# Copy Rust binary
COPY --from=rust-builder /build/rust_boundary/target/release/genesis-verify /usr/local/bin/genesis-verify
RUN chmod 755 /usr/local/bin/genesis-verify

# Copy compiled TypeScript
COPY --from=ts-builder /build/dist/ ./dist/
COPY --from=ts-builder /build/node_modules/ ./node_modules/

# Copy Python modules
COPY core/ ./core/

# Copy shell scripts
COPY entrypoint.sh ./entrypoint.sh
COPY bin/ ./bin/
COPY verify/ ./verify/
RUN chmod +x entrypoint.sh bin/*.sh verify/*.sh

# Copy config and specs (no secrets — env vars only)
COPY config/ ./config/
COPY spec/ ./spec/

# Copy dashboard
COPY ../genesis-security-dashboard.html ./static/index.html

# Copy package.json for npm scripts
COPY package.json ./

# Data volume for audit logs, evidence chains, keys
RUN mkdir -p /data/audit /data/evidence /data/keys \
    && chown -R genesis:genesis /data

VOLUME ["/data"]

# Environment
ENV GENESIS_AUDIT_DIR=/data/audit \
    GENESIS_EVIDENCE_DIR=/data/evidence \
    GENESIS_KEY_DIR=/data/keys \
    GENESIS_PDP_PORT=8080 \
    GENESIS_DASHBOARD_PORT=3000 \
    NODE_ENV=production

# Switch to non-root
USER genesis

EXPOSE 8080 3000

# Health check — hits the PDP health endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "dist/server.js"]
