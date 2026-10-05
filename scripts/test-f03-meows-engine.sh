#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_meows_test"

TEST_URL="postgresql://pap_user:pap_password@localhost:5432/${DB_NAME}?schema=public"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf '\n'
printf '========================================\n'
printf ' F03.7 MEOWS ENGINE HARNESS\n'
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

printf '\n==> policy\n'

npx tsx --test \
  tests/clinical/meows-policy.test.ts

printf '\n==> pure engine\n'

npx tsx --test \
  tests/clinical/meows-engine.test.ts

printf '\n==> lifecycle + persistence\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/meows-lifecycle.integration.test.ts

printf '\n==> authorization\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/meows-access.integration.test.ts

printf '\n==> fixture cleanup verification\n'

EVALUATIONS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM clinical_evaluations;'
)"

ENCOUNTERS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM encounters;'
)"

PATIENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patients;'
)"

if [[ \
  "$EVALUATIONS" != "0" || \
  "$ENCOUNTERS" != "0" || \
  "$PATIENTS" != "0" \
 ]]; then
  printf \
    'TEST FAILURE: evaluations=%s encounters=%s patients=%s\n' \
    "$EVALUATIONS" \
    "$ENCOUNTERS" \
    "$PATIENTS"
  exit 1
fi

printf \
  'evaluations=0 encounters=0 patients=0\n'

printf '\n'
printf '========================================\n'
printf ' F03.7 MEOWS ENGINE: PASS\n'
printf '========================================\n'
