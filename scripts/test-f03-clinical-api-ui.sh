#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f03_clinical_api_ui_test"

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
printf ' F03.10 + F03.11 CLINICAL API + UI\n'
printf '========================================\n'

printf '\n==> static integration guards\n'

if /usr/bin/grep -R \
  -n \
  -E 'mock-pacientes|mock-atendimentos' \
  'src/app/(dashboard)/pacientes' \
  'src/app/(dashboard)/atendimentos'
then
  printf 'FAIL clinical pages still use mocks\n'
  exit 1
fi

printf 'PASS clinical page mocks retired\n'

if /usr/bin/grep -R \
  -n \
  'calculateMeows' \
  src/components/registro
then
  printf 'FAIL registration performs client-side MEOWS calculation\n'
  exit 1
fi

printf 'PASS backend is sole registration MEOWS source\n'

/usr/bin/grep -q \
  'x-organization-id' \
  src/lib/clinical-api/client.ts

printf 'PASS organization header propagated by clinical client\n'

cleanup

printf '\n==> create isolated test database\n'

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

printf '\n==> clinical HTTP integration\n'

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/clinical/clinical-api-ui.integration.test.ts

printf '\n==> cleanup verification\n'

PATIENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM patients;'
)"

ENCOUNTERS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM encounters;'
)"

SESSIONS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM sessions;'
)"

if [[ \
  "$PATIENTS" != "0" || \
  "$ENCOUNTERS" != "0" || \
  "$SESSIONS" != "0" \
 ]]; then
  printf \
    'TEST FAILURE: patients=%s encounters=%s sessions=%s\n' \
    "$PATIENTS" \
    "$ENCOUNTERS" \
    "$SESSIONS"
  exit 1
fi

printf 'patients=0 encounters=0 sessions=0\n'

printf '\n'
printf '========================================\n'
printf ' F03.10 + F03.11 API/UI TEST: PASS\n'
printf '========================================\n'
