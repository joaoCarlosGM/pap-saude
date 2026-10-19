#!/usr/bin/env bash
set -Eeuo pipefail
# PostgreSQL's init server accepts Unix sockets but does not listen on TCP.
# Force that initialization window; a socket-only readiness probe is unsafe.
PG="pap-f0410-readiness-$$-$RANDOM"
DIR="$(mktemp -d /tmp/f0410-readiness.XXXXXX)"
cleanup() { docker rm -f "$PG" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
printf 'SELECT pg_sleep(5);\n' > "$DIR/delay.sql"
chmod 644 "$DIR/delay.sql"
docker create --name "$PG" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
docker cp "$DIR/delay.sql" "$PG:/docker-entrypoint-initdb.d/delay.sql"
docker start "$PG" >/dev/null
SOCKET_READY=0
for attempt in $(seq 1 150); do
 if docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; then SOCKET_READY=1; break; fi
 sleep 0.1
done
[[ "$SOCKET_READY" == 1 ]]
if docker exec "$PG" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
 echo 'FAIL did not observe forced temporary initialization server' >&2; exit 1
fi
READY=0
for attempt in $(seq 1 60); do
 if docker exec "$PG" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then READY=1; break; fi
 sleep 1
done
[[ "$READY" == 1 ]]
ACTUAL="$(docker exec "$PG" psql -X -U postgres -d postgres -Atqc 'SELECT 1')"
[[ "$ACTUAL" == 1 ]]
echo 'PASS temporary Unix-socket server rejected; final TCP server ready before SQL'
