#!/usr/bin/env bash
# PAP Saúde Beta1 — read-only preflight; use explicitly from WSL. Does not print secrets.
set -euo pipefail
repo="$HOME/projetos/pap-saude-p0-unified-rc"
if [[ ! -d "$repo/.git" ]]; then echo "STOP: checkout da Beta1 não encontrado em $repo" >&2; exit 1; fi
cd "$repo"
echo "=== CHECKOUT ==="; pwd; git branch --show-current; git status --short; git rev-parse --short HEAD
echo "=== RUNTIME ==="; node --version; npm --version; docker context show
echo "=== RESOURCE OWNERSHIP ==="
docker inspect pap-p0-unified-rc-db --format '{{.Name}} {{index .Config.Labels "pap.local"}}' || true
docker volume inspect pap-p0-unified-rc-data --format '{{.Name}}' || true
echo "=== LISTENERS ==="
ss -ltnp '( sport = :3600 or sport = :15436 )' || true
echo "=== PRIVATE DIRECTORY PERMISSIONS (NOT CONTENTS) ==="
ls -ld .local .local/pap-p0-unified-rc || true
echo "=== DISK ==="; df -h ~
echo "Nenhum dado foi alterado. NUNCA cole a saída de arquivos privados no chat."
