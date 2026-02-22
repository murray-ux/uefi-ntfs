# ============================================================================
# NEXUS Auth Portal - Production Dockerfile
# ============================================================================
# Multi-stage build for optimal image size and security

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache sqlite tini

# Create non-root user
RUN addgroup -g 1001 -S authportal && \
    adduser -S authportal -u 1001 -G authportal

# Copy built artifacts
COPY --from=builder --chown=authportal:authportal /app/dist ./dist
COPY --from=builder --chown=authportal:authportal /app/node_modules ./node_modules
COPY --from=builder --chown=authportal:authportal /app/package.json ./

# Copy public assets and i18n
COPY --chown=authportal:authportal public ./public
COPY --chown=authportal:authportal i18n ./i18n

# Create data directory for SQLite
RUN mkdir -p data && chown authportal:authportal data

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Switch to non-root user
USER authportal

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start server
CMD ["node", "dist/server.js"]
