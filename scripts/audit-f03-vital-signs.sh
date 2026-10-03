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
printf ' F03.4 FINAL VITAL SIGNS AUDIT\n'
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
    "VitalSigns model exists":
        "model VitalSigns {" in schema,

    "Encounter link is unique":
        "encounterId      String             @unique"
        in schema,

    "systolic pressure exists":
        "systolicBp       Int" in schema,

    "diastolic pressure exists":
        "diastolicBp      Int" in schema,

    "heart rate exists":
        "heartRate        Int" in schema,

    "respiratory rate exists":
        "respiratoryRate  Int" in schema,

    "temperature decimal exists":
        "temperature      Decimal?"
        in schema,

    "oxygen saturation exists":
        "oxygenSaturation Int?"
        in schema,

    "consciousness enum exists":
        "consciousness    ConsciousnessState"
        in schema,

    "urine output exists":
        "urineOutputMl    Int?"
        in schema,

    "proteinuria exists":
        "proteinuria      ProteinuriaResult"
        in schema,

    "createdAt exists":
        "createdAt        DateTime"
        in schema,

    "updatedAt exists":
        "updatedAt        DateTime"
        in schema,

    "recordedAt index exists":
        "@@index([recordedAt])"
        in schema,

    "encounter deletion restricted":
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
    "20261003040000_foundation_03_vital_signs_core/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "Vital signs migration missing"
    )

sql = path.read_text()

required = [
    'ADD COLUMN "createdAt"',
    'ADD COLUMN "updatedAt"',
    'ON DELETE RESTRICT',
    'vital_signs_systolic_positive_check',
    'vital_signs_diastolic_positive_check',
    'vital_signs_heart_rate_positive_check',
    'vital_signs_respiratory_rate_positive_check',
    'vital_signs_oxygen_saturation_check',
    'vital_signs_urine_output_check',
    'vital_signs_recordedAt_idx',
]

for item in required:
    if item not in sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "vital_signs"',
    'DROP TABLE vital_signs',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive operation found: {forbidden}"
        )

print("PASS  vital signs migration incremental")
print("PASS  DB structural guards present")
print("PASS  encounter history protected")
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
    "src/server/vital-signs/vital-signs.service.ts"
).read_text()

consistency = Path(
    "src/server/vital-signs/vital-signs-consistency.ts"
).read_text()

access = Path(
    "src/server/vital-signs/vital-signs-access.service.ts"
).read_text()

validation = Path(
    "src/server/vital-signs/vital-signs.validation.ts"
).read_text()

checks = {
    "createVitalSigns exists":
        "createVitalSigns" in service,

    "getVitalSignsByEncounter exists":
        "getVitalSignsByEncounter"
        in service,

    "updateVitalSigns exists":
        "updateVitalSigns" in service,

    "no deleteVitalSigns API":
        "deleteVitalSigns" not in service,

    "encounter consistency exists":
        "requireVitalSignsEncounter"
        in consistency,

    "finalized encounter guard exists":
        "assertEncounterAllowsVitalSigns"
        in consistency,

    "timeline guard exists":
        "assertVitalSignsTimeline"
        in consistency,

    "oxygen saturation validation exists":
        "normalizeOxygenSaturation"
        in validation,

    "proteinuria validation exists":
        "normalizeProteinuria"
        in validation,

    "create access exists":
        "requireVitalSignsCreateAccess"
        in access,

    "read access exists":
        "requireVitalSignsReadAccess"
        in access,

    "update access exists":
        "requireVitalSignsUpdateAccess"
        in access,

    "patient organization link required":
        "hasActivePatientOrganizationLink"
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
        "Service invariant failures: "
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
    'VITAL_SIGNS_READ: "vital_signs.read"',
    'VITAL_SIGNS_CREATE: "vital_signs.create"',
    'VITAL_SIGNS_UPDATE: "vital_signs.update"',
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
    "PERMISSIONS.VITAL_SIGNS_READ",
    "PERMISSIONS.VITAL_SIGNS_CREATE",
    "PERMISSIONS.VITAL_SIGNS_UPDATE",
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
    "PERMISSIONS.VITAL_SIGNS_READ",
    "PERMISSIONS.VITAL_SIGNS_CREATE",
    "PERMISSIONS.VITAL_SIGNS_UPDATE",
]:
    if permission in pap:
        raise SystemExit(
            f"PAP admin unexpectedly has {permission}"
        )

print("PASS  vital signs permissions exist")
print("PASS  professional receives vital signs access")
print("PASS  PAP admin has no default vital signs access")
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
  "Vital signs harness" \
  npm run test:f03:vital-signs

run_gate \
  "Encounter regression" \
  npm run test:f03:encounter

run_gate \
  "Pregnancy regression" \
  npm run test:f03:pregnancy

run_gate \
  "Patient regression" \
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
printf ' F03.4 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.4 FINAL AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03.4 FINAL AUDIT: PASS\n'
