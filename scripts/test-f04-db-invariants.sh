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
# Local runs remain locked to the F04 feature branch. In GitHub Actions,
# PR merge refs have detached HEAD, so use the event and trusted repo context.
if [[ "${GITHUB_ACTIONS:-}" == 'true' && "${GITHUB_REPOSITORY:-}" == 'joaoCarlosGM/pap-saude' ]]; then
  case "${GITHUB_EVENT_NAME:-}:${GITHUB_REF:-}:${GITHUB_BASE_REF:-}" in
    push:refs/heads/prod:*|push:refs/heads/develop:*|push:refs/heads/feature/foundation-04-admin-core:*|\
    pull_request:refs/pull/*:develop|pull_request:refs/pull/*:prod)
      printf 'PASS: verified GitHub Actions branch context\n' ;;
    *) printf 'FAIL: unexpected GitHub Actions context\n' >&2; exit 1 ;;
  esac
else
  [[ "$(git branch --show-current)" == 'feature/foundation-04-admin-core' ]] || {
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
  -v ON_ERROR_STOP=1 -P pager=off <<'SQL'
BEGIN;

DO $check$
DECLARE
  blocked boolean;
  installed integer;
BEGIN
  SELECT count(*) INTO installed FROM pg_trigger
   WHERE tgrelid IN ('audit_events'::regclass, 'organizations'::regclass)
     AND tgname IN ('f0410_audit_events_immutable_row',
                    'f0410_audit_events_immutable_truncate',
                    'f0410_organizations_hierarchy_guard')
     AND tgenabled = 'O';
  IF installed <> 3 THEN
    RAISE EXCEPTION 'FAIL expected 3 enabled triggers, got %', installed;
  END IF;

  INSERT INTO audit_events (id, action, "resourceType") VALUES
    ('f0410-integrity-event', 'AUDIT_INTEGRITY_TEST', 'TEST');

  blocked := false;
  BEGIN
    UPDATE audit_events SET action='MODIFIED' WHERE id='f0410-integrity-event';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL AUDIT_UPDATE allowed'; END IF;
  RAISE NOTICE 'PASS AUDIT_UPDATE blocked';

  blocked := false;
  BEGIN
    DELETE FROM audit_events WHERE id='f0410-integrity-event';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL AUDIT_DELETE allowed'; END IF;
  RAISE NOTICE 'PASS AUDIT_DELETE blocked';

  blocked := false;
  BEGIN
    TRUNCATE audit_events;
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL AUDIT_TRUNCATE allowed'; END IF;
  RAISE NOTICE 'PASS AUDIT_TRUNCATE blocked';

  INSERT INTO organizations (id, type, status, name, "updatedAt") VALUES
    ('f0410-pap', 'PAP', 'ACTIVE', 'F0410 PAP', now());
  INSERT INTO organizations (id, type, status, name, "parentId", "updatedAt") VALUES
    ('f0410-municipality', 'MUNICIPALITY', 'ACTIVE', 'F0410 Municipality', 'f0410-pap', now());
  INSERT INTO organizations (id, type, status, name, "parentId", "updatedAt") VALUES
    ('f0410-unit', 'HEALTH_UNIT', 'ACTIVE', 'F0410 UBS', 'f0410-municipality', now());
  RAISE NOTICE 'PASS valid PAP > MUNICIPALITY > HEALTH_UNIT';

  blocked := false;
  BEGIN
    INSERT INTO organizations (id, type, status, name, "parentId", "updatedAt") VALUES
      ('f0410-invalid-unit', 'HEALTH_UNIT', 'ACTIVE', 'Invalid direct PAP child', 'f0410-pap', now());
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL INVALID_HIERARCHY insert allowed'; END IF;
  RAISE NOTICE 'PASS INVALID_HIERARCHY insert blocked';

  blocked := false;
  BEGIN
    UPDATE organizations SET "parentId"='f0410-pap' WHERE id='f0410-unit';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL INVALID_HIERARCHY update allowed'; END IF;
  RAISE NOTICE 'PASS INVALID_HIERARCHY update blocked';

  blocked := false;
  BEGIN
    UPDATE organizations SET type='PAP', "parentId"=NULL WHERE id='f0410-municipality';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL INVALID_PARENT_RETYPE allowed'; END IF;
  RAISE NOTICE 'PASS INVALID_PARENT_RETYPE blocked';
END
$check$;

ROLLBACK;
SQL

printf '\nF04.10 DATABASE INVARIANTS: PASS\n'
