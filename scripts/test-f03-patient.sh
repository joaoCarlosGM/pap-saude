#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f02b_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f02b_test?schema=public"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf '\n========================================\n'
printf ' F03.1 PATIENT REGISTRY HARNESS\n'
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

printf '\n==> patient validation\n'

npx tsx --test \
  tests/clinical/patient-validation.test.ts

printf '\n==> patient registry service\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/patient-registry.integration.test.ts

printf '\n==> patient deduplication\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/patient-deduplication.integration.test.ts

printf '\n==> patient organization linkage\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/patient-organization.integration.test.ts

printf '\n==> patient authorization\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/patient-access.integration.test.ts

printf '\n==> fixture cleanup verification\n'

PATIENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patients;'
)"

PATIENT_ORGANIZATIONS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patient_organizations;'
)"

if [[ "$PATIENTS" != "0" || "$PATIENT_ORGANIZATIONS" != "0" ]]; then
  printf 'TEST FAILURE: patients=%s patient_organizations=%s\n' \
    "$PATIENTS" \
    "$PATIENT_ORGANIZATIONS"
  exit 1
fi

printf 'patients=0 patient_organizations=0\n'

printf '\n========================================\n'
printf ' F03.1 PATIENT REGISTRY: PASS\n'
printf '========================================\n'
