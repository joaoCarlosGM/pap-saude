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

printf '\n'
printf '========================================\n'
printf ' F03.5 FINAL OBSTETRIC DATA AUDIT\n'
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
    "ObstetricData model exists":
        "model ObstetricData {" in schema,

    "encounter link unique":
        "encounterId     String     @unique"
        in schema,

    "uterine height exists":
        "uterineHeightCm Decimal?"
        in schema,

    "fetal heart rate exists":
        "fetalHeartRate  Int?"
        in schema,

    "fetal movement exists":
        "fetalMovement   Boolean?"
        in schema,

    "edema enum exists":
        "edema           EdemaGrade"
        in schema,

    "bleeding exists":
        "bleeding        Boolean?"
        in schema,

    "weight exists":
        "weightKg        Decimal?"
        in schema,

    "complaints exists":
        "complaints      String?"
        in schema,

    "notes exists":
        "notes           String?"
        in schema,

    "recordedAt exists":
        "recordedAt      DateTime"
        in schema,

    "createdAt exists":
        "createdAt       DateTime"
        in schema,

    "updatedAt exists":
        "updatedAt       DateTime"
        in schema,

    "recordedAt index exists":
        "@@index([recordedAt])"
        in schema,

    "encounter relation restricts delete":
        "Encounter @relation(fields: [encounterId], references: [id], onDelete: Restrict)"
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
    "20261003050000_foundation_03_obstetric_data_core/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "Obstetric data migration missing"
    )

sql = path.read_text()

required = [
    'ADD COLUMN "recordedAt"',
    'ADD COLUMN "createdAt"',
    'ADD COLUMN "updatedAt"',
    'ON DELETE RESTRICT',
    'obstetric_data_uterine_height_check',
    'obstetric_data_fetal_heart_rate_check',
    'obstetric_data_weight_check',
    'obstetric_data_recordedAt_idx',
]

for item in required:
    if item not in sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "obstetric_data"',
    'DROP TABLE obstetric_data',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive operation found: {forbidden}"
        )

print("PASS  migration incremental")
print("PASS  DB safeguards present")
print("PASS  encounter history protected")
PY
then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> domain invariants\n'

if python3 - <<'PY'
from pathlib import Path

service = Path(
    "src/server/obstetric-data/obstetric-data.service.ts"
).read_text()

consistency = Path(
    "src/server/obstetric-data/obstetric-data-consistency.ts"
).read_text()

access = Path(
    "src/server/obstetric-data/obstetric-data-access.service.ts"
).read_text()

validation = Path(
    "src/server/obstetric-data/obstetric-data.validation.ts"
).read_text()

checks = {
    "create service exists":
        "createObstetricData"
        in service,

    "read service exists":
        "getObstetricDataByEncounter"
        in service,

    "update service exists":
        "updateObstetricData"
        in service,

    "no delete API":
        "deleteObstetricData"
        not in service,

    "encounter consistency exists":
        "requireObstetricEncounter"
        in consistency,

    "finalized encounter guard exists":
        "assertEncounterAllowsObstetricData"
        in consistency,

    "timeline guard exists":
        "assertObstetricTimeline"
        in consistency,

    "uterine validation exists":
        "normalizeNonNegativeDecimal"
        in validation,

    "fetal heart validation exists":
        "normalizePositiveInteger"
        in validation,

    "weight validation exists":
        "normalizePositiveDecimal"
        in validation,

    "patient organization access exists":
        "hasActivePatientOrganizationLink"
        in access,

    "create access exists":
        "requireObstetricDataCreateAccess"
        in access,

    "read access exists":
        "requireObstetricDataReadAccess"
        in access,

    "update access exists":
        "requireObstetricDataUpdateAccess"
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
        "Domain failures: "
        + ", ".join(failed)
    )
PY
then
  pass "domain invariants"
else
  fail "domain invariants"
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
    'OBSTETRIC_DATA_READ: "obstetric_data.read"',
    'OBSTETRIC_DATA_CREATE: "obstetric_data.create"',
    'OBSTETRIC_DATA_UPDATE: "obstetric_data.update"',
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
    "PERMISSIONS.OBSTETRIC_DATA_READ",
    "PERMISSIONS.OBSTETRIC_DATA_CREATE",
    "PERMISSIONS.OBSTETRIC_DATA_UPDATE",
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
    "PERMISSIONS.OBSTETRIC_DATA_READ",
    "PERMISSIONS.OBSTETRIC_DATA_CREATE",
    "PERMISSIONS.OBSTETRIC_DATA_UPDATE",
]:
    if permission in pap:
        raise SystemExit(
            f"PAP admin unexpectedly has {permission}"
        )

print("PASS  obstetric permissions exist")
print("PASS  professional receives permissions")
print("PASS  PAP admin has no default obstetric access")
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
  "Obstetric data harness" \
  npm run test:f03:obstetric-data

run_gate \
  "Vital signs regression" \
  npm run test:f03:vital-signs

run_gate \
  "Encounter regression" \
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
printf ' F03.5 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.5 FINAL AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03.5 FINAL AUDIT: PASS\n'
