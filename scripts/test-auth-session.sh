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

echo "========================================"
echo " F02.2B SESSION INTEGRATION"
echo "========================================"

cleanup

docker exec "$DB_CONTAINER" \
  psql -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${DB_NAME};"

echo
echo "==> migrations"

DATABASE_URL="$TEST_URL" \
  npx prisma migrate deploy

echo
echo "==> database safety"

CURRENT_DB="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT current_database();'
)"

if [[ "$CURRENT_DB" != "$DB_NAME" ]]; then
  echo "SAFETY FAILURE: $CURRENT_DB"
  exit 1
fi

HAS_SESSIONS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc "
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name='sessions';
    "
)"

if [[ "$HAS_SESSIONS" != "1" ]]; then
  echo "SAFETY FAILURE: sessions table missing"
  exit 1
fi

echo "database=$CURRENT_DB"

echo
echo "==> integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/session-service.integration.test.ts

echo
echo "==> fixture cleanup"

USERS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM users;'
)"

SESSIONS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM sessions;'
)"

if [[ "$USERS" != "0" || "$SESSIONS" != "0" ]]; then
  echo "TEST FAILURE: users=$USERS sessions=$SESSIONS"
  exit 1
fi

echo "users=0 sessions=0"

echo
echo "========================================"
echo " F02.2B SESSION SERVICE: PASS"
echo "========================================"
