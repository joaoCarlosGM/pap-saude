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
printf ' F03.1 FINAL PATIENT REGISTRY AUDIT\n'
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

python3 - <<'PY'
from pathlib import Path

schema = Path("prisma/schema.prisma").read_text()

checks = {
    "Patient model exists":
        "model Patient {" in schema,

    "PatientOrganization model exists":
        "model PatientOrganization {" in schema,

    "CPF remains globally unique":
        "cpf        String?  @unique" in schema
        or "cpf       String?  @unique" in schema,

    "CNS remains globally unique":
        "cns        String?  @unique" in schema
        or "cns       String?  @unique" in schema,

    "Patient has isActive":
        "isActive   Boolean" in schema,

    "Patient has socialName":
        "socialName String?" in schema,

    "Patient has email":
        "email      String?" in schema
        or "email       String?" in schema,

    "Patient has city":
        "city       String?" in schema
        or "city        String?" in schema,

    "Patient has state":
        "state      String?" in schema
        or "state       String?" in schema,

    "Patient organization composite unique exists":
        "@@unique([patientId, organizationId])" in schema,

    "Organization medical record unique exists":
        "@@unique([organizationId, medicalRecordNo])" in schema,

    "Patient relations use Restrict":
        'patient      Patient      @relation(fields: [patientId], references: [id], onDelete: Restrict)'
        in schema,

    "Organization relations use Restrict":
        'organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)'
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
        "Schema invariant failures: "
        + ", ".join(failed)
    )
PY

if [[ "$?" == "0" ]]; then
  pass "schema invariants"
else
  fail "schema invariants"
fi

printf '\n==> migration invariants\n'

python3 - <<'PY'
from pathlib import Path

path = Path(
    "prisma/migrations/"
    "20261003010000_foundation_03_patient_registry_core/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "F03 patient migration missing"
    )

sql = path.read_text()

required = [
    'ADD COLUMN "socialName"',
    'ADD COLUMN "email"',
    'ADD COLUMN "city"',
    'ADD COLUMN "state"',
    'ADD COLUMN "isActive"',
    'patients_cpf_format_check',
    'patients_cns_format_check',
    'patients_full_name_not_blank_check',
    'patients_state_format_check',
    'patients_birth_date_not_future_check',
]

for item in required:
    if item not in sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "patients"',
    'DROP TABLE patients',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive migration found: {forbidden}"
        )

print("PASS  migration is incremental")
print("PASS  patient safeguards are present")
print("PASS  no destructive patient operation found")
PY

if [[ "$?" == "0" ]]; then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> domain invariants\n'

python3 - <<'PY'
from pathlib import Path

patient_service = Path(
    "src/server/patients/patient.service.ts"
).read_text()

dedup = Path(
    "src/server/patients/patient.deduplication.ts"
).read_text()

organization = Path(
    "src/server/patients/patient-organization.service.ts"
).read_text()

access = Path(
    "src/server/patients/patient-access.service.ts"
).read_text()

checks = {
    "Patient supports soft disable":
        "disablePatient" in patient_service
        and "isActive: false" in patient_service,

    "Patient supports reactivation":
        "reactivatePatient" in patient_service
        and "isActive: true" in patient_service,

    "Patient service has no deletePatient API":
        "deletePatient" not in patient_service,

    "Deduplication exists":
        "findPossiblePatientDuplicates" in dedup,

    "Deduplication does not auto merge":
        "mergePatient" not in dedup
        and "deleteMany" not in dedup,

    "Organization unlink preserves history":
        "unlinkedAt" in organization,

    "Organization link requires health unit":
        "OrganizationType.HEALTH_UNIT"
        in organization,

    "Inactive patient cannot be linked":
        "InactivePatientOrganizationLinkError"
        in organization,

    "Patient read requires permission":
        "PERMISSIONS.PATIENT_READ"
        in access,

    "Patient update requires permission":
        "PERMISSIONS.PATIENT_UPDATE_DEMOGRAPHICS"
        in access,

    "Patient access requires active organization link":
        "requireActivePatientLink"
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
        "Domain invariant failures: "
        + ", ".join(failed)
    )
PY

if [[ "$?" == "0" ]]; then
  pass "domain invariants"
else
  fail "domain invariants"
fi

printf '\n==> IAM invariants\n'

python3 - <<'PY'
from pathlib import Path

permissions = Path(
    "src/server/iam/permissions.ts"
).read_text()

roles = Path(
    "src/server/iam/system-role-catalog.ts"
).read_text()

required_permissions = [
    'PATIENT_READ: "patient.read"',
    'PATIENT_CREATE: "patient.create"',
    'PATIENT_UPDATE_DEMOGRAPHICS: "patient.update_demographics"',
]

for item in required_permissions:
    if item not in permissions:
        raise SystemExit(
            f"Missing IAM permission: {item}"
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
    "PERMISSIONS.PATIENT_READ",
    "PERMISSIONS.PATIENT_CREATE",
    "PERMISSIONS.PATIENT_UPDATE_DEMOGRAPHICS",
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
    "PERMISSIONS.PATIENT_READ",
    "PERMISSIONS.PATIENT_CREATE",
    "PERMISSIONS.PATIENT_UPDATE_DEMOGRAPHICS",
]:
    if permission in pap_block:
        raise SystemExit(
            "PAP_ADMIN unexpectedly received "
            + permission
        )

print("PASS  clinical patient permissions exist")
print("PASS  PROFESSIONAL receives patient permissions")
print("PASS  PAP_ADMIN has no default clinical patient access")
PY

if [[ "$?" == "0" ]]; then
  pass "IAM invariants"
else
  fail "IAM invariants"
fi

run_gate \
  "Prisma schema validation" \
  npx prisma validate

run_gate \
  "Prisma client generation" \
  npx prisma generate

run_gate \
  "F03.1 patient harness" \
  npm run test:f03:patient

run_gate \
  "F02 regression harness" \
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
printf ' F03.1 AUDIT SUMMARY\n'
printf '========================================\n'
printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.1 FINAL AUDIT: FAIL\n'
  false
fi

printf '\nF03.1 FINAL AUDIT: PASS\n'
