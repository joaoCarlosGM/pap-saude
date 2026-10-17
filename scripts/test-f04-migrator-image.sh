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
    pg_isready -U "$DB_USER" -d "$DB" \
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

test "$EXPECTED" -gt 0

for run in 1 2; do
  echo "==> Migration execution $run"

  docker run --rm \
    --network "$NET" \
    -e "DATABASE_URL=$DB_URL" \
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
done

echo "F04.10 MIGRATOR FUNCTIONAL CI GATE: PASS"
