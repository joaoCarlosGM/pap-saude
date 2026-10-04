#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_allergies_flags_test"

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
printf ' F03.6 ALLERGIES + CLINICAL FLAGS\n'
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

printf '\n==> validation\n'

npx tsx --test \
  tests/clinical/allergies-clinical-flags-validation.test.ts

printf '\n==> lifecycle\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/allergies-clinical-flags-lifecycle.integration.test.ts

printf '\n==> authorization\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/allergies-clinical-flags-access.integration.test.ts

printf '\n==> fixture cleanup verification\n'

ALLERGIES="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM allergies;'
)"

FLAGS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM clinical_flags;'
)"

PATIENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patients;'
)"

if [[ \
  "$ALLERGIES" != "0" || \
  "$FLAGS" != "0" || \
  "$PATIENTS" != "0" \
 ]]; then
  printf \
    'TEST FAILURE: allergies=%s clinical_flags=%s patients=%s\n' \
    "$ALLERGIES" \
    "$FLAGS" \
    "$PATIENTS"
  exit 1
fi

printf \
  'allergies=0 clinical_flags=0 patients=0\n'

printf '\n'
printf '========================================\n'
printf ' F03.6 ALLERGIES + FLAGS: PASS\n'
printf '========================================\n'
