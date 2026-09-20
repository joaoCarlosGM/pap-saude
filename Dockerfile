# ============================================================
# 1. BASE
# ============================================================
FROM node:22-alpine AS base

WORKDIR /app

# ============================================================
# 2. DEPENDÊNCIAS
# ============================================================
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# 3. BUILD
# ============================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ============================================================
# 4. RUNTIME / PRODUÇÃO
# ============================================================
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# ============================================================
# 5. DATABASE MIGRATOR
# ============================================================
FROM base AS migrator

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]
