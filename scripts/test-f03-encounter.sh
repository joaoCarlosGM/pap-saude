#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_encounter_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f03_encounter_test?schema=public"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf '\n========================================\n'
printf ' F03.3 ENCOUNTER CORE HARNESS\n'
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

printf '\n==> encounter validation\n'

npx tsx --test \
  tests/clinical/encounter-validation.test.ts

printf '\n==> encounter lifecycle and consistency\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/encounter-lifecycle.integration.test.ts

printf '\n==> encounter authorization\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/encounter-access.integration.test.ts

printf '\n==> encounter end-to-end integration\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/encounter-integration.integration.test.ts

printf '\n==> fixture cleanup verification\n'

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

PREGNANCIES="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM pregnancies;'
)"

if [[ "$ENCOUNTERS" != "0" || "$PATIENTS" != "0" || "$PREGNANCIES" != "0" ]]; then
  printf 'TEST FAILURE: encounters=%s patients=%s pregnancies=%s\n' \
    "$ENCOUNTERS" \
    "$PATIENTS" \
    "$PREGNANCIES"
  exit 1
fi

printf 'encounters=0 patients=0 pregnancies=0\n'

printf '\n========================================\n'
printf ' F03.3 ENCOUNTER CORE: PASS\n'
printf '========================================\n'
