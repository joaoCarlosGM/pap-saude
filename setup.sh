#!/usr/bin/env bash
set -e

echo "==> [1/4] Subindo PostgreSQL via Docker..."
docker compose up -d

echo "==> [2/4] Instalando dependências..."
npm install

echo "==> [3/4] Sincronizando banco com o Prisma..."
npx prisma migrate deploy

echo "==> [4/4] Iniciando aplicação Next.js..."
npm run dev
