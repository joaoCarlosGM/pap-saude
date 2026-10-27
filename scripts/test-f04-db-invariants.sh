#!/usr/bin/env bash
set -Eeuo pipefail

DB_CONTAINER="pap_saude_db"
DB_USER="pap_user"
DB_NAME="pap_saude_f04_final_invariants_test"
TEST_URL="postgresql://pap_user:pap_password@localhost:5432/${DB_NAME}?schema=public"
CREATED=0

cleanup() {
  if [[ "$CREATED" == "1" ]]; then
    docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
      || printf 'WARNING: cleanup failed; inspect %s manually\n' "$DB_NAME" >&2
  fi
}
trap cleanup EXIT

printf '\n=== F04.10 A/B/E — DATABASE INTEGRITY REGRESSIONS ===\n'
# Local runs are allowlisted to the reviewed F04/Beta mission branches. In GitHub Actions,
# PR merge refs have detached HEAD, so use the event and trusted repo context.
if [[ "${GITHUB_ACTIONS:-}" == 'true' && "${GITHUB_REPOSITORY:-}" == 'joaoCarlosGM/pap-saude' ]]; then
  case "${GITHUB_EVENT_NAME:-}:${GITHUB_REF:-}:${GITHUB_BASE_REF:-}" in
    push:refs/heads/prod:*|push:refs/heads/develop:*|push:refs/heads/feature/foundation-04-admin-core:*|push:refs/heads/codex/f04-10-release-hardening:*|push:refs/heads/codex/pap-admin-beta1:*|push:refs/heads/codex/p0-remediation-review-20261026:*|\
    pull_request:refs/pull/*:develop|pull_request:refs/pull/*:prod)
      printf 'PASS: verified GitHub Actions branch context\n' ;;
    *) printf 'FAIL: unexpected GitHub Actions context\n' >&2; exit 1 ;;
  esac
else
  [[ "$(git branch --show-current)" == 'feature/foundation-04-admin-core' || "$(git branch --show-current)" == 'codex/f04-10-release-hardening' || "$(git branch --show-current)" == 'codex/pap-admin-beta1' || "$(git branch --show-current)" == 'codex/onboarding-primeiro-acesso-mfa' || "$(git branch --show-current)" == 'feature/ux-iam-convites-vitrine-email' || "$(git branch --show-current)" == 'codex/p0-remediation-review-20261026' ]] || {
    printf 'FAIL: wrong local branch\n' >&2; exit 1;
  }
fi
EXISTING="$(docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d postgres -Atqc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';")"
[[ "$EXISTING" != 1 ]] || { printf 'FAIL: test database exists, refusing to overwrite\n' >&2; exit 1; }
docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE ${DB_NAME};"
CREATED=1
DATABASE_URL="$TEST_URL" npx prisma migrate deploy
ACTUAL="$(docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d "$DB_NAME" -Atqc 'SELECT current_database();')"
[[ "$ACTUAL" == "$DB_NAME" ]] || { printf 'FAIL: database identity\n' >&2; exit 1; }

# Leave every trigger enabled here: this test proves actual production-style integrity.
docker exec -i "$DB_CONTAINER" psql -X -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -P pager=off < scripts/db/f04-invariants-test.sql

printf '\nF04.10 DATABASE INVARIANTS: PASS\n'
