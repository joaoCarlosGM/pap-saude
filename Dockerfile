# ============================================================
# 1. BASE
# ============================================================
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS base

WORKDIR /app

# ============================================================
# 2. DEPENDÊNCIAS
# ============================================================
FROM base AS deps

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci

# ============================================================
# 3. BUILD
# ============================================================
FROM base AS builder

# Fake, non-secret URL used only during image compilation. It must never
# reach the runtime image; runtime DATABASE_URL is provided at deployment.
ENV DATABASE_URL="postgresql://ci_no_connect:ci_no_connect@127.0.0.1:5432/pap_saude_build_only?schema=public"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    if [ -f /run/secrets/build_ca ]; then cat /run/secrets/build_ca >> /etc/ssl/cert.pem; fi; \
    npx prisma generate && npm run build

# ============================================================
# 4. RUNTIME / PRODUÇÃO
# ============================================================
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

# ============================================================
# 5. DATABASE MIGRATOR
# ============================================================
FROM base AS migrator-deps

COPY docker/migrator/package.json docker/migrator/package-lock.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund

FROM base AS migrator

ENV NODE_ENV=production

COPY --chown=node:node --from=migrator-deps /app/node_modules ./node_modules
COPY --chown=node:node docker/migrator/package.json docker/migrator/package-lock.json ./
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node docker/migrator/migrate.mjs ./migrate.mjs

USER node

CMD ["node", "/app/migrate.mjs"]
