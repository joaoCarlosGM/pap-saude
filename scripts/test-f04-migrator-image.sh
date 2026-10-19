#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:-pap-saude-migrator:f0410-isolated}"

NET="pap-f0410-net-$$-$RANDOM"
PG="pap-f0410-pg-$$-$RANDOM"
DB="pap_f0410_migration_verify"
DB_USER="f0410_test"
DB_PASSWORD="f0410_disposable_only"

DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${PG}:5432/${DB}?schema=public"

cleanup() {
  docker rm -f "$PG" >/dev/null 2>&1 || true
  rm -f /tmp/"$PG".dump /tmp/"$PG".log
  docker network rm "$NET" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "=== F04.10 MIGRATOR FUNCTIONAL CI GATE ==="

docker image inspect "$IMAGE" >/dev/null

docker network create "$NET" >/dev/null

docker run --rm -d \
  --name "$PG" \
  --network "$NET" \
  -e "POSTGRES_USER=$DB_USER" \
  -e "POSTGRES_PASSWORD=$DB_PASSWORD" \
  -e "POSTGRES_DB=$DB" \
  postgres:16-alpine >/dev/null

READY=0

for attempt in $(seq 1 60); do
  if docker exec "$PG" \
    pg_isready -h 127.0.0.1 -U "$DB_USER" -d "$DB" \
    >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done

test "$READY" -eq 1

EXPECTED="$(
  find prisma/migrations \
    -mindepth 2 -maxdepth 2 \
    -type f -name migration.sql |
    wc -l | tr -d '[:space:]'
)"

test "$EXPECTED" -ge 27

# Build the exact legacy source with SQL and Prisma's recorded checksum.
INITIAL=20260909150044_init_clinical_schema
docker exec -i "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 < "prisma/migrations/$INITIAL/migration.sql"
docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" --entrypoint /app/node_modules/.bin/prisma "$IMAGE" migrate resolve --applied "$INITIAL"
# Independent populated scenarios must all abort with history/data unchanged.
for scenario in patient admission evaluation; do
  docker exec -i "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO patients (id, cpf, "fullName", "birthDate", "updatedAt", "medicalRecordNo") VALUES ('synthetic', '00000000000', 'SYNTHETIC ONLY', '2000-01-01', now(), 'legacy-preserve');
SQL
  if [[ "$scenario" == admission ]]; then
    docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -c "INSERT INTO admissions (id, \"patientId\", \"chiefComplaint\") VALUES ('synthetic', 'synthetic', 'SYNTHETIC');"
  elif [[ "$scenario" == evaluation ]]; then
    docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -c "INSERT INTO clinical_evaluations (id, \"patientId\", \"respiratoryRate\", \"oxygenSaturation\", temperature, \"systolicBp\", \"diastolicBp\", \"heartRate\", \"meowsScore\", \"alertLevel\") VALUES ('synthetic','synthetic',16,99,36.5,120,80,70,0,'GREEN');"
  fi
  BEFORE="$(docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -Atqc 'SELECT md5(row_to_json(p)::text) FROM patients p')"
  docker exec "$PG" pg_dump -U "$DB_USER" -d "$DB" -Fc > /tmp/"$PG".dump
  docker exec "$PG" createdb -U "$DB_USER" "restore_$scenario"
  docker exec -i "$PG" pg_restore -U "$DB_USER" -d "restore_$scenario" --exit-on-error < /tmp/"$PG".dump
  rm /tmp/"$PG".dump
  RESTORED="$(docker exec "$PG" psql -X -U "$DB_USER" -d "restore_$scenario" -Atqc 'SELECT md5(row_to_json(p)::text) FROM patients p')"
  test "$BEFORE" = "$RESTORED"
  if docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" "$IMAGE" > /tmp/"$PG".log 2>&1; then
    echo 'FAIL populated legacy migration accepted' >&2; exit 1
  fi
  grep -q 'MIGRATOR_ABORTED LEGACY_DATA_BLOCKED' /tmp/"$PG".log
  test "$(docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -Atqc 'SELECT count(*) FROM _prisma_migrations')" = 1
  test "$(docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -Atqc 'SELECT count(*) FROM patients')" = 1
  AFTER="$(docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -Atqc 'SELECT md5(row_to_json(p)::text) FROM patients p')"
  test "$BEFORE" = "$AFTER"
  # Cleanup only synthetic records in this container created by this script.
  docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -c "DELETE FROM patients WHERE id='synthetic';"
  echo "PASS legacy $scenario preserved and migration aborted"
done

if docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" "$IMAGE" > /tmp/"$PG".log 2>&1; then
  echo 'FAIL legacy migration without maintenance confirmation' >&2; exit 1
fi
grep -q 'MIGRATOR_ABORTED MAINTENANCE_REQUIRED' /tmp/"$PG".log
echo 'PASS maintenance confirmation required'

# Reject a tampered applied checksum before any new DDL is attempted.
ORIGINAL_CHECKSUM="$(sha256sum "prisma/migrations/$INITIAL/migration.sql" | cut -d ' ' -f 1)"
docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -c "UPDATE _prisma_migrations SET checksum='SYNTHETIC_INVALID';"
if docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" -e F04_LEGACY_MAINTENANCE=writers-stopped "$IMAGE" > /tmp/"$PG".log 2>&1; then
 echo 'FAIL invalid historical checksum accepted' >&2; exit 1
fi
grep -q 'MIGRATOR_ABORTED MIGRATION_HISTORY_INVALID' /tmp/"$PG".log
test "$(docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -Atqc 'SELECT count(*) FROM _prisma_migrations')" = 1
test "$(docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -Atqc "SELECT to_regclass('public.admissions') IS NOT NULL")" = t
docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -c "UPDATE _prisma_migrations SET checksum='$ORIGINAL_CHECKSUM';"
echo 'PASS tampered historical checksum blocked before new migrations'

for run in 1 2; do
  echo "==> Migration execution $run"

  docker run --rm \
    --network "$NET" \
    -e "DATABASE_URL=$DB_URL" \
    -e F04_LEGACY_MAINTENANCE=writers-stopped \
    "$IMAGE"

  COUNT="$(
    docker exec "$PG" \
      psql -U "$DB_USER" -d "$DB" \
      -Atqc '
        SELECT COUNT(*)
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
          AND rolled_back_at IS NULL;
      '
  )"

  echo "Applied migrations: $COUNT / $EXPECTED"
  test "$COUNT" = "$EXPECTED"
  docker exec -i "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 < scripts/db/f04-invariants-test.sql
  docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" --entrypoint /app/node_modules/.bin/prisma "$IMAGE" migrate status
done

docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" --entrypoint /app/node_modules/.bin/prisma "$IMAGE" migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
docker exec -i "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 < scripts/db/f04-readonly-inventory.sql

# Inject a failed migration only into this disposable database. The contract is
# migration success && web startup; this does not validate the external VPS script.
docker exec "$PG" psql -X -U "$DB_USER" -d "$DB" -v ON_ERROR_STOP=1 -c "UPDATE _prisma_migrations SET finished_at=NULL, logs='SYNTHETIC FAILURE' WHERE migration_name='20261016210000_foundation_04_audit_integrity';"
WEB_STARTED=0
if docker run --rm --network "$NET" -e "DATABASE_URL=$DB_URL" "$IMAGE" > /tmp/"$PG".log 2>&1; then
  WEB_STARTED=1
fi
test "$WEB_STARTED" = 0
grep -q 'MIGRATOR_ABORTED MIGRATION_HISTORY_INVALID' /tmp/"$PG".log
echo 'PASS failed migration blocks web startup contract (VPS script unverified)'
# Independently provoke an actual SQL migration error in a second disposable DB.
FAIL_DB=pap_f0410_engine_failure
docker exec "$PG" createdb -U "$DB_USER" "$FAIL_DB"
docker exec -i "$PG" psql -X -U "$DB_USER" -d "$FAIL_DB" -v ON_ERROR_STOP=1 < "prisma/migrations/$INITIAL/migration.sql"
FAIL_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${PG}:5432/${FAIL_DB}?schema=public"
docker run --rm --network "$NET" -e "DATABASE_URL=$FAIL_URL" --entrypoint /app/node_modules/.bin/prisma "$IMAGE" migrate resolve --applied "$INITIAL"
docker exec "$PG" psql -X -U "$DB_USER" -d "$FAIL_DB" -v ON_ERROR_STOP=1 -c "CREATE TYPE \"OrganizationType\" AS ENUM ('SYNTHETIC_COLLISION');"
WEB_STARTED=0
if docker run --rm --network "$NET" -e "DATABASE_URL=$FAIL_URL" -e F04_LEGACY_MAINTENANCE=writers-stopped "$IMAGE" > /tmp/"$PG".log 2>&1; then WEB_STARTED=1; fi
test "$WEB_STARTED" = 0
grep -q 'MIGRATOR_ABORTED MIGRATION_FAILED' /tmp/"$PG".log
echo 'PASS actual Prisma SQL failure blocks web startup contract'
echo "F04.10 MIGRATOR FUNCTIONAL CI GATE: PASS"
