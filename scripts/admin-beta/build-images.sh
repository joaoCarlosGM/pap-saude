#!/usr/bin/env bash
set -Eeuo pipefail
SHA="${1:?explicit source SHA required}"
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || exit 2
node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {assertDockerEndpoint} from "./scripts/local/policy.mjs"; assertDockerEndpoint(process.env.DOCKER_HOST||JSON.parse(execFileSync("docker",["context","inspect"],{encoding:"utf8"}))[0].Endpoints.docker.Host);'
EXTRA=()
for proxy in HTTP_PROXY HTTPS_PROXY NO_PROXY; do if [[ -n "${!proxy:-}" ]]; then EXTRA+=(--build-arg "$proxy"); fi; done
if [[ -n "${NODE_EXTRA_CA_CERTS:-}" ]]; then EXTRA+=(--secret "id=build_ca,src=${NODE_EXTRA_CA_CERTS}"); fi
LABELS=(--label "org.opencontainers.image.revision=$SHA" --label org.opencontainers.image.source=https://github.com/joaoCarlosGM/pap-saude --label pap.purpose=admin-beta)
docker build "${EXTRA[@]}" "${LABELS[@]}" --target builder -t "pap-admin-beta-builder:$SHA" .
docker build "${EXTRA[@]}" "${LABELS[@]}" --target runner -t "pap-admin-beta-web:$SHA" .
docker build "${EXTRA[@]}" "${LABELS[@]}" --target migrator -t "pap-admin-beta-migrator:$SHA" .
docker build "${LABELS[@]}" --build-arg "BETA_BUILDER_IMAGE=pap-admin-beta-builder:$SHA" -f deploy/admin-beta/Dockerfile.tools -t "pap-admin-beta-tools:$SHA" .
