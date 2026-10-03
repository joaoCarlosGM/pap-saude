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
printf ' F03.3 FINAL ENCOUNTER AUDIT\n'
printf '========================================\n'

BRANCH="$(git branch --show-current)"

printf '\n==> branch\n'
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
    "Encounter model exists":
        "model Encounter {" in schema,

    "Encounter has patient":
        "patientId" in schema,

    "Encounter has optional pregnancy":
        "pregnancyId" in schema,

    "Encounter has organization":
        "organizationId" in schema,

    "Encounter has lifecycle status":
        "EncounterStatus" in schema,

    "Encounter has startedAt":
        "startedAt" in schema,

    "Encounter has completedAt":
        "completedAt" in schema,

    "Encounter has cancelledAt":
        "cancelledAt" in schema,

    "Encounter has cancellation reason":
        "cancellationReason" in schema,

    "Patient deletion restricted":
        "Patient              @relation(fields: [patientId], references: [id], onDelete: Restrict)"
        in schema,

    "Pregnancy deletion restricted":
        "Pregnancy?           @relation(fields: [pregnancyId], references: [id], onDelete: Restrict)"
        in schema,

    "Organization deletion restricted":
        "Organization         @relation(fields: [organizationId], references: [id], onDelete: Restrict)"
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
    "20261003030000_foundation_03_encounter_core/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "Encounter migration missing"
    )

sql = path.read_text()

required = [
    'ADD COLUMN "startedAt"',
    'ADD COLUMN "cancelledAt"',
    'ADD COLUMN "cancellationReason"',
    'encounters_lifecycle_consistency_check',
    'encounters_started_after_occurrence_check',
    'encounters_completed_after_occurrence_check',
    'encounters_cancelled_after_occurrence_check',
]

for item in required:
    if item not in sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "encounters"',
    'DROP TABLE encounters',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive operation found: {forbidden}"
        )

print("PASS  encounter migration incremental")
print("PASS  lifecycle DB constraints present")
print("PASS  encounter history is preserved")
PY
then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> service invariants\n'

if python3 - <<'PY'
from pathlib import Path

service = Path(
    "src/server/encounters/encounter.service.ts"
).read_text()

consistency = Path(
    "src/server/encounters/encounter-consistency.ts"
).read_text()

organization = Path(
    "src/server/encounters/encounter-organization.service.ts"
).read_text()

access = Path(
    "src/server/encounters/encounter-access.service.ts"
).read_text()

checks = {
    "createEncounter exists":
        "createEncounter" in service,

    "startEncounter exists":
        "startEncounter" in service,

    "completeEncounter exists":
        "completeEncounter" in service,

    "cancelEncounter exists":
        "cancelEncounter" in service,

    "no deleteEncounter API":
        "deleteEncounter" not in service,

    "no physical encounter deletion":
        "encounter.delete(" not in service
        and "encounter.deleteMany(" not in service,

    "pregnancy consistency exists":
        "validateEncounterPregnancy"
        in consistency,

    "organization binding exists":
        "requireEncounterOrganizationContext"
        in organization,

    "patient organization link required":
        "hasActivePatientOrganizationLink"
        in organization
        or "hasActivePatientOrganizationLink"
        in access,

    "create access exists":
        "requireEncounterCreateAccess"
        in access,

    "read access exists":
        "requireEncounterReadAccess"
        in access,

    "update access exists":
        "requireEncounterUpdateAccess"
        in access,
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
        "Encounter invariant failures: "
        + ", ".join(failed)
    )
PY
then
  pass "service invariants"
else
  fail "service invariants"
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

for permission in [
    'ENCOUNTER_READ: "encounter.read"',
    'ENCOUNTER_CREATE: "encounter.create"',
    'ENCOUNTER_UPDATE: "encounter.update"',
]:
    if permission not in permissions:
        raise SystemExit(
            f"Missing permission: {permission}"
        )

professional_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.PROFESSIONAL"
)

commercial_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.COMMERCIAL"
)

professional = roles[
    professional_start:commercial_start
]

for permission in [
    "PERMISSIONS.ENCOUNTER_READ",
    "PERMISSIONS.ENCOUNTER_CREATE",
    "PERMISSIONS.ENCOUNTER_UPDATE",
]:
    if permission not in professional:
        raise SystemExit(
            f"Professional missing {permission}"
        )

pap_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.PAP_ADMIN"
)

municipal_start = roles.index(
    "key: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN"
)

pap = roles[
    pap_start:municipal_start
]

for permission in [
    "PERMISSIONS.ENCOUNTER_READ",
    "PERMISSIONS.ENCOUNTER_CREATE",
    "PERMISSIONS.ENCOUNTER_UPDATE",
]:
    if permission in pap:
        raise SystemExit(
            f"PAP admin unexpectedly has {permission}"
        )

print("PASS  encounter permissions exist")
print("PASS  professional receives encounter access")
print("PASS  PAP admin has no default encounter access")
PY
then
  pass "IAM invariants"
else
  fail "IAM invariants"
fi

run_gate \
  "Prisma validation" \
  npx prisma validate

run_gate \
  "Encounter harness" \
  npm run test:f03:encounter

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
printf ' F03.3 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.3 FINAL AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03.3 FINAL AUDIT: PASS\n'
