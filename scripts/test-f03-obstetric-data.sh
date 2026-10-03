#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_obstetric_data_test"

TEST_URL="postgresql://pap_user:pap_password@localhost:5432/${DB_NAME}?schema=public"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf '\n========================================\n'
printf ' F03.5 OBSTETRIC DATA CORE HARNESS\n'
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

printf '\n==> obstetric data validation\n'

npx tsx --test \
  tests/clinical/obstetric-data-validation.test.ts

printf '\n==> obstetric data lifecycle\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/obstetric-data-lifecycle.integration.test.ts

printf '\n==> obstetric data authorization\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/obstetric-data-access.integration.test.ts

printf '\n==> fixture cleanup verification\n'

OBSTETRIC_DATA="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM obstetric_data;'
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
  "$OBSTETRIC_DATA" != "0" || \
  "$ENCOUNTERS" != "0" || \
  "$PATIENTS" != "0" \
 ]]; then
  printf \
    'TEST FAILURE: obstetric_data=%s encounters=%s patients=%s\n' \
    "$OBSTETRIC_DATA" \
    "$ENCOUNTERS" \
    "$PATIENTS"
  exit 1
fi

printf \
  'obstetric_data=0 encounters=0 patients=0\n'

printf '\n========================================\n'
printf ' F03.5 OBSTETRIC DATA CORE: PASS\n'
printf '========================================\n'
