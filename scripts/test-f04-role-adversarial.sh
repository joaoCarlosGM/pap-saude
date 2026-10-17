#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f04_role_adversarial_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/${DB_NAME}?schema=public"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n=== F04.4 H ROLE ADVERSARIAL GATE ===\n'
cleanup

printf '\n==> isolated DB: %s\n' "$DB_NAME"
docker exec "$DB_CONTAINER" \
  psql -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${DB_NAME};"

printf '\n==> fresh migrations\n'
DATABASE_URL="$TEST_URL" npx prisma migrate deploy

CURRENT_DB="$(docker exec "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -Atc 'SELECT current_database();')"
if [[ "$CURRENT_DB" != "$DB_NAME" ]]; then
  printf 'SAFETY FAILURE: %s\n' "$CURRENT_DB"
  exit 1
fi

# Legacy suites clear audit rows between cases; bypass only within allowlisted throwaway DBs.
bash scripts/testing/allow-audit-test-cleanup.sh "$DB_CONTAINER" "$DB_USER" "$DB_NAME"


printf '\n==> H tests\n'
DATABASE_URL="$TEST_URL" AUTH_ALLOWED_ORIGINS='http://localhost:3000' \
  npx tsx --test tests/admin/role-adversarial.integration.test.ts

printf '\nF04.4 H ROLE ADVERSARIAL: PASS\n'
