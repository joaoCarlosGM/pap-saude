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

  printf '\n==> %s\n' "$label"

  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

printf '\n========================================\n'
printf ' F03.2 FINAL PREGNANCY AUDIT\n'
printf '========================================\n'

printf '\n==> branch\n'

BRANCH="$(git branch --show-current)"

printf 'branch=%s\n' "$BRANCH"

case "$BRANCH" in
  feature/foundation-03-*)
    pass "correct F03 feature branch"
    ;;
  *)
    fail "correct F03 feature branch"
    ;;
esac

printf '\n==> schema invariants\n'

if python3 - <<'PY'
from pathlib import Path

schema = Path(
    "prisma/schema.prisma"
).read_text()

checks = {
    "Pregnancy model exists":
        "model Pregnancy {" in schema,

    "Pregnancy has endedAt":
        "endedAt" in schema,

    "Pregnancy has activeSlot":
        "activeSlot" in schema,

    "One active slot unique guard exists":
        "@@unique([patientId, activeSlot])"
        in schema,

    "Patient status index exists":
        "@@index([patientId, status])"
        in schema,

    "Pregnancy status index exists":
        "@@index([status])"
        in schema,

    "Pregnancy patient relation restricts delete":
        "Patient     @relation(fields: [patientId], references: [id], onDelete: Restrict)"
        in schema,
}

failed = []

for label, result in checks.items():
    print(
        f"{'PASS' if result else 'FAIL'}  {label}"
    )

    if not result:
        failed.append(label)

if failed:
    raise SystemExit(
        "Schema failures: "
        + ", ".join(failed)
    )
PY
then
  pass "schema invariants"
else
  fail "schema invariants"
fi

printf '\n==> migration invariants\n'

if python3 - <<'PY'
from pathlib import Path

path = Path(
    "prisma/migrations/"
    "20261003020000_foundation_03_pregnancy_core/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "Pregnancy migration missing"
    )

sql = path.read_text()

required = [
    'ADD COLUMN "endedAt"',
    'ADD COLUMN "activeSlot"',
    'pregnancies_patientId_activeSlot_key',
    'pregnancies_active_slot_consistency_check',
    'pregnancies_gravida_nonnegative_check',
    'pregnancies_parity_nonnegative_check',
]

for item in required:
    if item not in sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "pregnancies"',
    'DROP TABLE pregnancies',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive migration operation: {forbidden}"
        )

print("PASS  pregnancy migration incremental")
print("PASS  active pregnancy DB guard present")
print("PASS  obstetric count safeguards present")
PY
then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> lifecycle invariants\n'

if python3 - <<'PY'
from pathlib import Path

service = Path(
    "src/server/pregnancies/pregnancy.service.ts"
).read_text()

dating = Path(
    "src/server/pregnancies/gestational-dating.ts"
).read_text()

consistency = Path(
    "src/server/pregnancies/pregnancy-consistency.ts"
).read_text()

checks = {
    "createPregnancy exists":
        "createPregnancy" in service,

    "completePregnancy exists":
        "completePregnancy" in service,

    "interruptPregnancy exists":
        "interruptPregnancy" in service,

    "no deletePregnancy API":
        "deletePregnancy" not in service,

    "no pregnancy physical deletion":
        "pregnancy.delete(" not in service
        and "pregnancy.deleteMany(" not in service,

    "active slot released on end":
        "activeSlot:" in service
        and "null" in service,

    "280 day dating constant":
        "STANDARD_GESTATION_DAYS"
        in dating
        and "280" in dating,

    "gestational age is calculated":
        "calculateGestationalAge"
        in dating,

    "timeline consistency exists":
        "validatePregnancyTimeline"
        in consistency,
}

failed = []

for label, result in checks.items():
    print(
        f"{'PASS' if result else 'FAIL'}  {label}"
    )

    if not result:
        failed.append(label)

if failed:
    raise SystemExit(
        "Lifecycle invariant failures: "
        + ", ".join(failed)
    )
PY
then
  pass "lifecycle invariants"
else
  fail "lifecycle invariants"
fi

printf '\n==> IAM invariants\n'

if python3 - <<'PY'
from pathlib import Path

permissions = Path(
    "src/server/iam/permissions.ts"
).read_text()

roles = Path(
    "src/server/iam/system-role-catalog.ts"
).read_text()

access = Path(
    "src/server/pregnancies/pregnancy-access.service.ts"
).read_text()

required_permissions = [
    'PREGNANCY_READ: "pregnancy.read"',
    'PREGNANCY_CREATE: "pregnancy.create"',
    'PREGNANCY_UPDATE: "pregnancy.update"',
]

for item in required_permissions:
    if item not in permissions:
        raise SystemExit(
            f"Missing permission: {item}"
        )

professional_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.PROFESSIONAL"
)

commercial_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.COMMERCIAL"
)

professional_block = roles[
    professional_start:commercial_start
]

for permission in [
    "PERMISSIONS.PREGNANCY_READ",
    "PERMISSIONS.PREGNANCY_CREATE",
    "PERMISSIONS.PREGNANCY_UPDATE",
]:
    if permission not in professional_block:
        raise SystemExit(
            f"Professional missing {permission}"
        )

pap_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.PAP_ADMIN"
)

municipal_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN"
)

pap_block = roles[
    pap_start:municipal_start
]

for permission in [
    "PERMISSIONS.PREGNANCY_READ",
    "PERMISSIONS.PREGNANCY_CREATE",
    "PERMISSIONS.PREGNANCY_UPDATE",
]:
    if permission in pap_block:
        raise SystemExit(
            "PAP_ADMIN unexpectedly has "
            + permission
        )

required_access = [
    "requirePregnancyCreateAccess",
    "requirePregnancyReadAccess",
    "requirePregnancyUpdateAccess",
    "hasActivePatientOrganizationLink",
]

for item in required_access:
    if item not in access:
        raise SystemExit(
            f"Missing pregnancy access invariant: {item}"
        )

print("PASS  pregnancy permissions exist")
print("PASS  professional receives pregnancy permissions")
print("PASS  PAP admin has no default pregnancy access")
print("PASS  pregnancy access depends on active patient link")
PY
then
  pass "IAM invariants"
else
  fail "IAM invariants"
fi

printf '\n==> integration coverage invariants\n'

if python3 - <<'PY'
from pathlib import Path

test = Path(
    "tests/clinical/"
    "pregnancy-integration.integration.test.ts"
)

if not test.exists():
    raise SystemExit(
        "Pregnancy integration test missing"
    )

content = test.read_text()

required = [
    "complete clinical pregnancy flow works end to end",
    "completed pregnancy remains historical and next episode can start",
    "unlinking patient immediately revokes pregnancy access",
    "cross-unit pregnancy access is denied",
    "completed pregnancy cannot be modified through lifecycle service",
]

for item in required:
    if item not in content:
        raise SystemExit(
            f"Missing integration scenario: {item}"
        )

print("PASS  lifecycle integration covered")
print("PASS  historical pregnancy preservation covered")
print("PASS  unlink revocation covered")
print("PASS  cross-unit isolation covered")
print("PASS  completed episode immutability covered")
PY
then
  pass "integration coverage invariants"
else
  fail "integration coverage invariants"
fi

run_gate \
  "Prisma schema validation" \
  npx prisma validate

run_gate \
  "Prisma client generation" \
  npx prisma generate

run_gate \
  "F03.2 pregnancy harness" \
  npm run test:f03:pregnancy

run_gate \
  "F03.1 patient regression" \
  npm run test:f03:patient

run_gate \
  "F02 auth regression" \
  npm run test:auth

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

printf '\n========================================\n'
printf ' F03.2 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.2 FINAL AUDIT: FAIL\n'
  false
fi

printf '\nF03.2 FINAL AUDIT: PASS\n'
