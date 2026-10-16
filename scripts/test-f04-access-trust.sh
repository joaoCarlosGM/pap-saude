#!/usr/bin/env bash
set -Eeuo pipefail
DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f04_access_trust_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/${DB_NAME}?schema=public"
cleanup(){ docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" >/dev/null 2>&1 || true; }
trap cleanup EXIT
printf '\n=== F04.5 A-H: INTEGRATION ===\n'
cleanup
printf '\n==> fresh database\n'
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};"
printf '\n==> migrations\n'
DATABASE_URL="$TEST_URL" npx prisma migrate deploy
DATABASE_URL="$TEST_URL" npx prisma generate
CURRENT_DB="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc 'SELECT current_database();')"
if [[ "$CURRENT_DB" != "$DB_NAME" ]]; then printf 'SAFETY FAILURE: %s\n' "$CURRENT_DB"; exit 1; fi
printf '\n==> integration suite\n'
DATABASE_URL="$TEST_URL" AUTH_ALLOWED_ORIGINS='http://localhost:3000' npx tsx --test tests/auth/f04-access-trust.integration.test.ts
printf '\nF04.5 INTEGRATION: PASS\n'
