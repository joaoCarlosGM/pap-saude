#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f02b_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/pap_saude_f02b_test?schema=public"

export MFA_SECRET_ENCRYPTION_KEY="$(
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))'
)"
export MFA_SECRET_ENCRYPTION_KEY_ID="f02-integration"

cleanup() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "========================================"
echo " F02 AUTH INTEGRATION HARNESS"
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

HAS_PASSWORDS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc "
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name='password_credentials';
    "
)"

if [[ "$HAS_SESSIONS" != "1" ]]; then
  echo "SAFETY FAILURE: sessions table missing"
  exit 1
fi

if [[ "$HAS_PASSWORDS" != "1" ]]; then
  echo "SAFETY FAILURE: password_credentials table missing"
  exit 1
fi

echo "database=$CURRENT_DB"

echo
echo "==> session integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/session-service.integration.test.ts

echo
echo "==> password authentication integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/password-authentication.integration.test.ts

echo
echo "==> login abuse integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/login-abuse.integration.test.ts

echo
echo "==> HTTP authentication integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/http-auth.integration.test.ts

echo
echo "==> TOTP enrollment integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/totp-enrollment.integration.test.ts

echo
echo "==> MFA login challenge integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/mfa-login.integration.test.ts

echo
echo "==> HTTP MFA integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/http-mfa.integration.test.ts

echo
echo "==> recovery code integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/recovery-code.integration.test.ts

echo
echo "==> MFA reset integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/mfa-reset.integration.test.ts

echo
echo "==> organization lifecycle integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/organization-lifecycle.integration.test.ts

echo
echo "==> organization membership and discovery integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/organization-membership-discovery.integration.test.ts

echo
echo "==> IAM roles and permissions integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/iam-roles-permissions.integration.test.ts

echo
echo "==> authorization and organization scope integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/authorization-scope.integration.test.ts

echo
echo "==> product activity integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/product-activity.integration.test.ts

echo
echo "==> organization metrics integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/organization-metrics.integration.test.ts

echo
echo "==> product feedback integration tests"

DATABASE_URL="$TEST_URL" \
  npx tsx --test \
  tests/auth/product-feedback.integration.test.ts

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

PASSWORDS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM password_credentials;'
)"

LOGIN_ATTEMPTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM login_attempts;'
)"

AUDIT_EVENTS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM audit_events;'
)"

MFA_FACTORS="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM mfa_factors;'
)"

MFA_CHALLENGES="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM mfa_challenges;'
)"

MFA_RECOVERY_CODES="$(
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -Atc 'SELECT COUNT(*) FROM mfa_recovery_codes;'
)"

if [[ "$USERS" != "0" || "$SESSIONS" != "0" || "$PASSWORDS" != "0" || "$LOGIN_ATTEMPTS" != "0" || "$AUDIT_EVENTS" != "0" || "$MFA_FACTORS" != "0" || "$MFA_CHALLENGES" != "0" || "$MFA_RECOVERY_CODES" != "0" ]]; then
  echo "TEST FAILURE:"
  echo "users=$USERS sessions=$SESSIONS passwords=$PASSWORDS login_attempts=$LOGIN_ATTEMPTS audit_events=$AUDIT_EVENTS mfa_factors=$MFA_FACTORS mfa_challenges=$MFA_CHALLENGES mfa_recovery_codes=$MFA_RECOVERY_CODES"
  exit 1
fi

echo "users=0 sessions=0 passwords=0 login_attempts=0 audit_events=0 mfa_factors=0 mfa_challenges=0 mfa_recovery_codes=0"

echo
echo "========================================"
echo " F02 AUTH INTEGRATION: PASS"
echo "========================================"
