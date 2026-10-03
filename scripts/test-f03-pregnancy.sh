#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_pregnancy_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f03_pregnancy_test?schema=public"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf '\n========================================\n'
printf ' F03.2 PREGNANCY CORE HARNESS\n'
printf '========================================\n'

cleanup

printf '\n==> create test database\n'

docker exec "$DB_CONTAINER" \
  psql -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${DB_NAME};"

printf '\n==> migrations\n'

DATABASE_URL="$TEST_URL" \
  npx prisma migrate deploy

printf '\n==> database safety\n'

CURRENT_DB="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT current_database();'
)"

if [[ "$CURRENT_DB" != "$DB_NAME" ]]; then
  printf 'SAFETY FAILURE: %s\n' "$CURRENT_DB"
  exit 1
fi

printf 'database=%s\n' "$CURRENT_DB"

printf '\n==> pregnancy validation\n'

npx tsx --test \
  tests/clinical/pregnancy-validation.test.ts

printf '\n==> pregnancy lifecycle\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/pregnancy-lifecycle.integration.test.ts

printf '\n==> fixture cleanup verification\n'

PREGNANCIES="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM pregnancies;'
)"

PATIENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patients;'
)"

if [[ "$PREGNANCIES" != "0" || "$PATIENTS" != "0" ]]; then
  printf 'TEST FAILURE: pregnancies=%s patients=%s\n' \
    "$PREGNANCIES" \
    "$PATIENTS"
  exit 1
fi

printf 'pregnancies=0 patients=0\n'

printf '\n========================================\n'
printf ' F03.2 PREGNANCY CORE: PASS\n'
printf '========================================\n'
