#!/usr/bin/env bash
# OPTIONAL: a single guarded, non-destructive logical PostgreSQL backup.
# Run only manually within the operator's existing Beta1 checkout, after reviewing this script.
set -euo pipefail
umask 077
repo="$HOME/projetos/pap-saude-p0-unified-rc"
[[ "$(realpath -e .)" == "$(realpath -e "$repo")" ]] || { echo 'STOP: execute na raiz correta'; exit 1; }
context="$(docker context show)"
[[ "$context" == 'default' || "$context" == 'desktop-linux' ]] || { echo 'STOP: Docker context inesperado'; exit 1; }
container='pap-p0-unified-rc-db'
label="$(docker inspect "$container" --format '{{index .Config.Labels "pap.local"}}')"
[[ "$label" == 'p0-unified-rc' ]] || { echo 'STOP: container sem label esperado'; exit 1; }
[[ "$(docker inspect "$container" --format '{{.State.Running}}')" == 'true' ]] || { echo 'STOP: PostgreSQL não está ativo'; exit 1; }
docker volume inspect pap-p0-unified-rc-data >/dev/null
[[ -d .local/pap-p0-unified-rc && ! -L .local/pap-p0-unified-rc ]] || { echo 'STOP: perfil privado ausente'; exit 1; }
backupdir='.local/pap-p0-unified-rc/backups'
mkdir -p "$backupdir"; chmod 700 "$backupdir"
filename="pap3600-$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.dump"
tmp="$(mktemp "$backupdir/.pending.XXXXXXXX")"; trap 'rm -f "$tmp"' EXIT
# Database username/password are read inside the verified local container only;
# no credentials are printed to terminal, arguments or artifacts.
docker exec "$container" sh -euc 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "$tmp"
[[ $(wc -c < "$tmp") -gt 256 ]] || { echo 'STOP: dump muito pequeno'; exit 1; }
docker exec -i "$container" pg_restore --list < "$tmp" > /dev/null
mv -- "$tmp" "$backupdir/$filename"
chmod 600 "$backupdir/$filename"
trap - EXIT
sha256sum "$backupdir/$filename"
echo "Backup lógico criado em $backupdir/$filename (privado). Ainda é obrigatório testar restore em DB descartável antes de migrar."
