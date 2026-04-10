# P2: Multi-stage production Dockerfile for realtors360-newsletter.
# Builds the TypeScript → dist/ then runs with a minimal runtime image.
# Compatible with Render, Fly.io, Cloud Run, and local docker compose.

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Runtime ──────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Healthcheck for container orchestrators.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/src/index.js"]
