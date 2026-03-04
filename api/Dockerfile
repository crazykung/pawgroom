# ─────────────────────────────────────────────────────────────────────────────
# PawGroom API — Multi-stage Dockerfile (NestJS + Prisma)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (including devDeps for build)
RUN npm ci --prefer-offline

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl wget

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only what's needed
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Thai fonts for PDF rendering (Playwright)
COPY --chown=nestjs:nodejs fonts/ ./fonts/

# Playwright Chromium for PDF export
RUN npx playwright install --with-deps chromium 2>/dev/null || true

USER nestjs

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
