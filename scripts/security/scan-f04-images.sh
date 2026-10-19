#!/usr/bin/env bash
set -Eeuo pipefail
[[ $# -eq 2 ]] || { echo 'Usage: scan-f04-images.sh WEB_IMAGE MIGRATOR_IMAGE' >&2; exit 2; }
SCANNER='aquasec/trivy:0.76.0@sha256:2416d1f74045b57274df1a340eee6b510cacd73c66a6ccb8da092b117eb7d222'
DIR="$(mktemp -d /tmp/f0410-scan.XXXXXX)"
CACHE="pap-f0410-trivy-$$-$RANDOM"
CONTAINER="pap-f0410-scan-$$-$RANDOM"
cleanup() {
 docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
 docker volume rm "$CACHE" >/dev/null 2>&1 || true
 rm -rf "$DIR"
}
trap cleanup EXIT
docker volume create "$CACHE" >/dev/null
EXTRA=()
if [[ -n "${F04_DOCKER_PROXY_HOST:-}" && -n "${F04_DOCKER_PROXY_IP:-}" ]]; then
 EXTRA+=(--add-host "${F04_DOCKER_PROXY_HOST}:${F04_DOCKER_PROXY_IP}")
fi
CERT=()
if [[ -n "${NODE_EXTRA_CA_CERTS:-}" ]]; then CERT+=(-e SSL_CERT_FILE=/tmp/ca.crt); fi
FAILED=0
for IMAGE in "$@"; do
 docker save -o "$DIR/image.tar" "$IMAGE"
 docker create --name "$CONTAINER" "${EXTRA[@]}" --entrypoint trivy \
  -e HTTP_PROXY -e HTTPS_PROXY "${CERT[@]}" -v "$CACHE:/root/.cache/trivy" "$SCANNER" \
  image --input /tmp/image.tar --db-repository ghcr.io/aquasecurity/trivy-db:2 \
  --scanners vuln --severity HIGH,CRITICAL --exit-code 1 --no-progress >/dev/null
 docker cp "$DIR/image.tar" "$CONTAINER:/tmp/image.tar"
 if [[ -n "${NODE_EXTRA_CA_CERTS:-}" ]]; then docker cp "$NODE_EXTRA_CA_CERTS" "$CONTAINER:/tmp/ca.crt"; fi
 docker start -a "$CONTAINER" || true
 # Preserve the scanner outcome, not just docker start's attachment status.
 RESULT="$(docker inspect --format '{{.State.ExitCode}}' "$CONTAINER")"
 echo "Scanner exit for $IMAGE: $RESULT"
 [[ "$RESULT" == 0 ]] || FAILED=1
 docker rm "$CONTAINER" >/dev/null
done
exit "$FAILED"
