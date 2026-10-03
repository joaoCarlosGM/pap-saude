#!/usr/bin/env bash
set -Eeuo pipefail

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  printf 'PASS  %s\n' "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  printf 'FAIL  %s\n' "$1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

run_gate() {
  local label="$1"
  shift

  printf '\n========================================\n'
  printf ' %s\n' "$label"
  printf '========================================\n'

  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

printf '\n'
printf '========================================\n'
printf ' PAP SAUDE — F03 MASTER AUDIT\n'
printf '========================================\n'

run_gate \
  "F03 branch safety" \
  bash scripts/guard-f03-branch.sh

printf '\n==> repository state\n'

BRANCH="$(git branch --show-current)"
HEAD_SHA="$(git rev-parse --short HEAD)"

printf 'branch=%s\n' "$BRANCH"
printf 'commit=%s\n' "$HEAD_SHA"

printf '\n==> forbidden deployment branch check\n'

case "$BRANCH" in
  develop|main|master|prod|production)
    fail "deployment branch isolation"
    ;;
  *)
    pass "deployment branch isolation"
    ;;
esac

run_gate \
  "Prisma schema validation" \
  npx prisma validate

run_gate \
  "Prisma client generation" \
  npx prisma generate

printf '\n==> migration inventory\n'

MIGRATION_COUNT="$(
  find prisma/migrations \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    | wc -l \
    | tr -d ' '
)"

printf 'migrations=%s\n' "$MIGRATION_COUNT"

if [[ "$MIGRATION_COUNT" -gt 0 ]]; then
  pass "migration inventory"
else
  fail "migration inventory"
fi

printf '\n==> migration hygiene\n'

if python3 - <<'PY'
from pathlib import Path

root = Path("prisma/migrations")

failures = []

for migration in sorted(root.iterdir()):
    if not migration.is_dir():
        continue

    sql = migration / "migration.sql"

    if not sql.exists():
        failures.append(
            f"{migration.name}: migration.sql missing"
        )
        continue

    text = sql.read_text()

    dangerous = [
        "DROP DATABASE",
        "DROP SCHEMA public",
    ]

    for token in dangerous:
        if token in text.upper():
            failures.append(
                f"{migration.name}: forbidden operation {token}"
            )

if failures:
    for failure in failures:
        print("FAIL ", failure)

    raise SystemExit(1)

print("PASS  migration files structurally valid")
PY
then
  pass "migration hygiene"
else
  fail "migration hygiene"
fi

printf '\n==> F03 feature discovery\n'

FEATURES="$(
  node - <<'NODE'
const pkg = require("./package.json")

const scripts = Object.keys(
  pkg.scripts || {},
)

const features = scripts
  .filter((name) =>
    /^test:f03:[a-z0-9-]+$/.test(name)
  )
  .sort()

for (const feature of features) {
  console.log(feature)
}
NODE
)"

if [[ -z "$FEATURES" ]]; then
  fail "F03 feature discovery"
else
  printf '%s\n' "$FEATURES"
  pass "F03 feature discovery"
fi

while IFS= read -r FEATURE; do
  if [[ -z "$FEATURE" ]]; then
    continue
  fi

  run_gate \
    "$FEATURE" \
    npm run "$FEATURE"
done <<< "$FEATURES"

printf '\n==> dedicated feature audits\n'

AUDITS="$(
  node - <<'NODE'
const pkg = require("./package.json")

const scripts = Object.keys(
  pkg.scripts || {},
)

const audits = scripts
  .filter((name) =>
    /^audit:f03:[a-z0-9-]+$/.test(name)
  )
  .sort()

for (const audit of audits) {
  console.log(audit)
}
NODE
)"

if [[ -n "$AUDITS" ]]; then
  printf '%s\n' "$AUDITS"

  while IFS= read -r AUDIT; do
    if [[ -z "$AUDIT" ]]; then
      continue
    fi

    run_gate \
      "$AUDIT" \
      npm run "$AUDIT"
  done <<< "$AUDITS"
else
  printf 'No dedicated feature audit scripts discovered.\n'
fi

run_gate \
  "TypeScript" \
  npx tsc --noEmit

run_gate \
  "ESLint" \
  npm run lint

run_gate \
  "Production build" \
  npm run build

run_gate \
  "Git whitespace validation" \
  git diff --check

printf '\n==> forbidden DB configuration scan\n'

if python3 - <<'PY'
from pathlib import Path

files = [
    Path("scripts"),
    Path("package.json"),
]

forbidden = [
    "pap_" + "saude_" + "prod",
]

found = []

for target in files:
    if target.is_file():
        candidates = [target]
    elif target.exists():
        candidates = [
            p
            for p in target.rglob("*")
            if p.is_file()
        ]
    else:
        candidates = []

    for candidate in candidates:
        try:
            text = candidate.read_text()
        except UnicodeDecodeError:
            continue

        for token in forbidden:
            if token in text:
                found.append(
                    f"{candidate}: {token}"
                )

if found:
    for item in found:
        print("FAIL ", item)

    raise SystemExit(1)

print("PASS  no production database hardcoded in test infrastructure")
PY
then
  pass "production DB isolation"
else
  fail "production DB isolation"
fi

printf '\n==> git worktree\n'
git status --short

printf '\n========================================\n'
printf ' F03 MASTER AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03 MASTER AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03 MASTER AUDIT: PASS\n'
