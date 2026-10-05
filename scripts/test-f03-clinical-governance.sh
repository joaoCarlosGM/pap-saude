#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_clinical_governance_test"

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
printf ' F03.8 + F03.9 CLINICAL GOVERNANCE\n'
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

printf '\n==> revision validation\n'

npx tsx --test \
  tests/clinical/clinical-revision-validation.test.ts

printf '\n==> governance integration\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/clinical-governance.integration.test.ts

printf '\n==> cleanup verification\n'

AUDIT_EVENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM audit_events;'
)"

PATIENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patients;'
)"

if [[ \
  "$AUDIT_EVENTS" != "0" || \
  "$PATIENTS" != "0" \
 ]]; then
  printf \
    'TEST FAILURE: audit_events=%s patients=%s\n' \
    "$AUDIT_EVENTS" \
    "$PATIENTS"
  exit 1
fi

printf \
  'audit_events=0 patients=0\n'

printf '\n'
printf '========================================\n'
printf ' F03.8 + F03.9 GOVERNANCE: PASS\n'
printf '========================================\n'
