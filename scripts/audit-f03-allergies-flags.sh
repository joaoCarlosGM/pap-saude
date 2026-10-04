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
printf ' F03.6 FINAL ALLERGIES + FLAGS AUDIT\n'
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
    "Allergy model exists":
        "model Allergy {" in schema,

    "Allergy status exists":
        "status    AllergyStatus"
        in schema,

    "Allergy endedAt exists":
        "endedAt   DateTime?"
        in schema,

    "Allergy patient relation restricts delete":
        "patient Patient @relation(fields: [patientId], references: [id], onDelete: Restrict)"
        in schema,

    "ClinicalFlagStatus enum exists":
        "enum ClinicalFlagStatus {"
        in schema,

    "ClinicalFlag model exists":
        "model ClinicalFlag {"
        in schema,

    "Clinical flag active slot exists":
        "activeSlot Int?"
        in schema,

    "Clinical flag unique active guard exists":
        "@@unique([patientId, code, activeSlot])"
        in schema,

    "Clinical flag patient relation restricts delete":
        schema.count(
            "patient Patient @relation(fields: [patientId], references: [id], onDelete: Restrict)"
        ) >= 2,

    "Patient clinicalFlags relation exists":
        "clinicalFlags       ClinicalFlag[]"
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
    "20261003060000_foundation_03_allergies_clinical_flags/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "F03.6 migration missing"
    )

sql = path.read_text()

required = [
    'CREATE TYPE "ClinicalFlagStatus"',
    'ADD COLUMN "endedAt"',
    'ADD COLUMN "createdAt"',
    'allergies_status_ended_at_check',
    'CREATE TABLE "clinical_flags"',
    'clinical_flags_status_slot_check',
    'clinical_flags_code_format_check',
    'clinical_flags_patientId_code_activeSlot_key',
    'ON DELETE RESTRICT',
]

for item in required:
    if item not in sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "allergies"',
    'DROP TABLE allergies',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive operation found: {forbidden}"
        )

print("PASS  migration incremental")
print("PASS  allergy lifecycle DB guard present")
print("PASS  clinical flag active uniqueness DB guard present")
print("PASS  clinical history deletion restricted")
PY
then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> domain invariants\n'

if python3 - <<'PY'
from pathlib import Path

allergy_service = Path(
    "src/server/allergies/allergy.service.ts"
).read_text()

allergy_access = Path(
    "src/server/allergies/allergy-access.service.ts"
).read_text()

flag_service = Path(
    "src/server/clinical-flags/clinical-flag.service.ts"
).read_text()

flag_access = Path(
    "src/server/clinical-flags/clinical-flag-access.service.ts"
).read_text()

checks = {
    "createAllergy exists":
        "createAllergy" in allergy_service,

    "updateAllergy exists":
        "updateAllergy" in allergy_service,

    "endAllergy exists":
        "endAllergy" in allergy_service,

    "allergy history list exists":
        "listPatientAllergies"
        in allergy_service,

    "active allergy list exists":
        "listActivePatientAllergies"
        in allergy_service,

    "no deleteAllergy API":
        "deleteAllergy"
        not in allergy_service,

    "allergy active-link access exists":
        "hasActivePatientOrganizationLink"
        in allergy_access,

    "createClinicalFlag exists":
        "createClinicalFlag"
        in flag_service,

    "updateClinicalFlag exists":
        "updateClinicalFlag"
        in flag_service,

    "endClinicalFlag exists":
        "endClinicalFlag"
        in flag_service,

    "clinical flag history exists":
        "listPatientClinicalFlags"
        in flag_service,

    "active clinical flag list exists":
        "listActivePatientClinicalFlags"
        in flag_service,

    "no deleteClinicalFlag API":
        "deleteClinicalFlag"
        not in flag_service,

    "duplicate active clinical flag handled":
        "ClinicalFlagAlreadyActiveError"
        in flag_service,

    "clinical flag active-link access exists":
        "hasActivePatientOrganizationLink"
        in flag_access,
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
    'ALLERGY_READ: "allergy.read"',
    'ALLERGY_CREATE: "allergy.create"',
    'ALLERGY_UPDATE: "allergy.update"',
    'CLINICAL_FLAG_READ: "clinical_flag.read"',
    'CLINICAL_FLAG_CREATE: "clinical_flag.create"',
    'CLINICAL_FLAG_UPDATE: "clinical_flag.update"',
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
    "PERMISSIONS.ALLERGY_READ",
    "PERMISSIONS.ALLERGY_CREATE",
    "PERMISSIONS.ALLERGY_UPDATE",
    "PERMISSIONS.CLINICAL_FLAG_READ",
    "PERMISSIONS.CLINICAL_FLAG_CREATE",
    "PERMISSIONS.CLINICAL_FLAG_UPDATE",
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
    "PERMISSIONS.ALLERGY_READ",
    "PERMISSIONS.ALLERGY_CREATE",
    "PERMISSIONS.ALLERGY_UPDATE",
    "PERMISSIONS.CLINICAL_FLAG_READ",
    "PERMISSIONS.CLINICAL_FLAG_CREATE",
    "PERMISSIONS.CLINICAL_FLAG_UPDATE",
]:
    if permission in pap:
        raise SystemExit(
            f"PAP admin unexpectedly has {permission}"
        )

print("PASS  allergy permissions exist")
print("PASS  clinical flag permissions exist")
print("PASS  professional receives clinical permissions")
print("PASS  PAP admin has no default access")
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
  "F03.6 harness" \
  npm run test:f03:allergies-flags

run_gate \
  "Obstetric data regression" \
  npm run test:f03:obstetric-data

run_gate \
  "Vital signs regression" \
  npm run test:f03:vital-signs

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
printf ' F03.6 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.6 FINAL AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03.6 FINAL AUDIT: PASS\n'
