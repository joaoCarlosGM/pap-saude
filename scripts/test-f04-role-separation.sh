#!/usr/bin/env bash
set -Eeuo pipefail
# Own container and unique database: never accept a production URL or container.
PG="pap-f0410-roles-$$-$RANDOM"
cleanup() { docker rm -f "$PG" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$PG" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
sql() { docker exec -i "$PG" psql -X -U postgres -d pap_f0410_roles -v ON_ERROR_STOP=1 "$@"; }
# CREATE DATABASE cannot run inside a transaction block.
docker exec "$PG" psql -X -U postgres -v ON_ERROR_STOP=1 -c 'CREATE ROLE pap_migrator NOLOGIN;'
docker exec "$PG" psql -X -U postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE pap_f0410_roles OWNER pap_migrator;'
for migration in prisma/migrations/*/migration.sql; do
  { echo 'SET ROLE pap_migrator;'; cat "$migration"; } | sql >/dev/null
done
sql < scripts/db/f04-invariants-test.sql
# This SQL-only exercise validates grants, not Prisma history; the image harness covers that.
sql -c 'CREATE TABLE _prisma_migrations (id text); ALTER TABLE _prisma_migrations OWNER TO pap_migrator;' >/dev/null
for run in 1 2; do
 sql -v runtime_role=pap_runtime -v migrator_role=pap_migrator < scripts/db/f04-role-separation.sql >/dev/null
done
sql <<'SQL'
BEGIN;
DO $check$
BEGIN
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='pap_runtime' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication)) THEN RAISE EXCEPTION 'privileged runtime'; END IF;
 IF EXISTS (SELECT FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname='pap_runtime')) THEN RAISE EXCEPTION 'runtime owns objects'; END IF;
END $check$;
SET SESSION AUTHORIZATION pap_runtime;
INSERT INTO users (id,email,"displayName","updatedAt") VALUES ('synthetic','synthetic@example.invalid','SYNTHETIC',now());
UPDATE users SET "displayName"='UPDATED' WHERE id='synthetic';
SELECT id FROM users WHERE id='synthetic';
DELETE FROM users WHERE id='synthetic';
INSERT INTO audit_events (id,action,"resourceType") VALUES ('synthetic','TEST','TEST');
DO $negative$
DECLARE statement text; blocked boolean;
BEGIN
 FOREACH statement IN ARRAY ARRAY[
  'UPDATE audit_events SET action=''ALTERED''', 'DELETE FROM audit_events', 'TRUNCATE audit_events',
  'ALTER TABLE audit_events DISABLE TRIGGER ALL', 'DROP TABLE audit_events',
  'CREATE TABLE public.runtime_ddl (id int)', 'SET ROLE pap_migrator',
  'SET session_replication_role=replica', 'SELECT * FROM _prisma_migrations'
 ] LOOP
  blocked := false;
  BEGIN EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'runtime unexpectedly allowed: %', statement; END IF;
 END LOOP;
END $negative$;
RESET SESSION AUTHORIZATION;
SET ROLE pap_migrator;
CREATE TABLE migration_ddl_test (id serial PRIMARY KEY);
DROP TABLE migration_ddl_test;
ROLLBACK;
SQL
printf 'PASS role separation: idempotency, DML, audit append-only, denied DDL/escalation, migrator DDL\n'
