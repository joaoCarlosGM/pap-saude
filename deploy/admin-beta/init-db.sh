#!/bin/sh
set -eu
# Runs only inside the NEW Beta PostgreSQL cluster. Never imports an old database.
rp="$(cat /run/secrets/runtime_password)"
mp="$(cat /run/secrets/migrator_password)"
for value in "$rp" "$mp"; do
  case "$value" in ''|*[!A-Za-z0-9_-]*) echo 'BETA_SECRET_INVALID' >&2; exit 1;; esac
  [ "${#value}" -ge 32 ] || exit 1
done
psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE pap_beta_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$mp';
CREATE ROLE pap_beta_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$rp';
CREATE DATABASE pap_admin_beta OWNER pap_beta_migrator;
REVOKE ALL ON DATABASE pap_admin_beta FROM PUBLIC;
GRANT CONNECT ON DATABASE pap_admin_beta TO pap_beta_runtime, pap_beta_migrator;
COMMENT ON DATABASE pap_admin_beta IS 'pap-admin-beta:new:v1';
SQL
psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname pap_admin_beta <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO pap_beta_migrator;
SQL
