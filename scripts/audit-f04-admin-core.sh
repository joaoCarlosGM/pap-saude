#!/usr/bin/env bash
set -Eeuo pipefail

printf '\n'
printf '========================================\n'
printf ' F04 BATCH A — ADMIN CORE AUDIT\n'
printf '========================================\n'

printf '\n==> branch\n'

BRANCH="$(
  git branch --show-current
)"

printf 'branch=%s\n' "$BRANCH"

case "$BRANCH" in
  feature/foundation-04-*|develop)
    ;;
  *)
    printf 'FAIL unexpected branch: %s\n' "$BRANCH"
    exit 1
    ;;
esac

printf '\n==> prisma schema\n'

npx prisma validate

printf '\n==> SQL safety\n'

npm run guard:sql-injection

printf '\n==> F04 admin integration\n'

npm run test:f04:admin-core

printf '\n==> TypeScript\n'

npx tsc --noEmit

printf '\n==> ESLint\n'

npm run lint

printf '\n==> production build\n'

npm run build

printf '\n==> diff hygiene\n'

git diff --check

printf '\n'
printf '========================================\n'
printf ' F04 BATCH A AUDIT: PASS\n'
printf '========================================\n'
