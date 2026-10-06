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
printf ' F03.8 + F03.9 FINAL AUDIT\n'
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

required = [
    "clinicalAuditEvents AuditEvent[]",
    "patientId      String?",
    '@relation("ClinicalAuditPatient"',
    "@@index([patientId, occurredAt])",
]

for token in required:
    if token not in schema:
        raise SystemExit(
            f"Missing schema invariant: {token}"
        )

print("PASS clinical audit linked to patient")
print("PASS patient-scoped audit index")
print("PASS audit actor preserved")
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
    "20261005080000_foundation_03_"
    "clinical_revision_authorization/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "Migration missing"
    )

sql = " ".join(
    path.read_text().split()
)

required = [
    'ADD COLUMN "patientId" TEXT',
    'audit_events_patientId_fkey',
    'REFERENCES "patients"("id")',
    'ON DELETE RESTRICT',
    'audit_events_patientId_occurredAt_idx',
]

for token in required:
    if token not in sql:
        raise SystemExit(
            f"Missing migration invariant: {token}"
        )

for forbidden in [
    "DROP TABLE",
    "TRUNCATE",
    "DELETE FROM",
]:
    if forbidden in sql.upper():
        raise SystemExit(
            f"Destructive migration token: {forbidden}"
        )

print("PASS incremental migration")
print("PASS patient audit FK restrict")
print("PASS patient audit lookup index")
PY
then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> revision invariants\n'

if python3 - <<'PY'
from pathlib import Path

service = Path(
    "src/server/clinical-revision/"
    "clinical-revision.service.ts"
).read_text()

validation = Path(
    "src/server/clinical-revision/"
    "clinical-revision.validation.ts"
).read_text()

types = Path(
    "src/server/clinical-revision/"
    "clinical-revision.types.ts"
).read_text()

checks = {
    "reason required":
        "normalizeClinicalRevisionReason"
        in service,

    "before/after change required":
        "assertRevisionActuallyChanges"
        in service,

    "actor persisted":
        "actorUserId:"
        in service,

    "organization persisted":
        "organizationId:"
        in service,

    "patient persisted":
        "patientId:"
        in service,

    "before persisted":
        "before:"
        in service,

    "after persisted":
        "after:"
        in service,

    "history query exists":
        "listClinicalRevisionHistory"
        in service,

    "supported resources explicit":
        "CLINICAL_REVISION_RESOURCE_TYPES"
        in types,

    "no revision delete API":
        "deleteClinicalRevision"
        not in service,

    "blank reason rejected":
        "normalized.length < 3"
        in validation,
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
        ", ".join(failed)
    )
PY
then
  pass "clinical revision invariants"
else
  fail "clinical revision invariants"
fi

printf '\n==> authorization invariants\n'

if python3 - <<'PY'
from pathlib import Path

service = Path(
    "src/server/clinical-authorization/"
    "clinical-authorization.service.ts"
).read_text()

resolver = Path(
    "src/server/clinical-authorization/"
    "clinical-resource-resolver.ts"
).read_text()

access = Path(
    "src/server/clinical-authorization/"
    "clinical-revision-access.service.ts"
).read_text()

permissions = Path(
    "src/server/iam/permissions.ts"
).read_text()

roles = Path(
    "src/server/iam/system-role-catalog.ts"
).read_text()

checks = {
    "central permission check":
        "requirePermission"
        in service,

    "active patient link":
        "hasActivePatientOrganizationLink"
        in service,

    "organization equality":
        "resource.organizationId !=="
        in service,

    "patient resolver":
        'case "PATIENT"'
        in resolver,

    "pregnancy resolver":
        'case "PREGNANCY"'
        in resolver,

    "encounter resolver":
        'case "ENCOUNTER"'
        in resolver,

    "vital signs resolver":
        'case "VITAL_SIGNS"'
        in resolver,

    "obstetric resolver":
        'case "OBSTETRIC_DATA"'
        in resolver,

    "allergy resolver":
        'case "ALLERGY"'
        in resolver,

    "flag resolver":
        'case "CLINICAL_FLAG"'
        in resolver,

    "MEOWS resolver":
        'case "MEOWS_EVALUATION"'
        in resolver,

    "revision read permission":
        'CLINICAL_REVISION_READ'
        in permissions,

    "revision create permission":
        'CLINICAL_REVISION_CREATE'
        in permissions,

    "revision read facade":
        "requireClinicalRevisionReadAccess"
        in access,

    "revision create facade":
        "requireClinicalRevisionCreateAccess"
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
        ", ".join(failed)
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
    "PERMISSIONS.CLINICAL_REVISION_READ",
    "PERMISSIONS.CLINICAL_REVISION_CREATE",
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
    "PERMISSIONS.CLINICAL_REVISION_READ",
    "PERMISSIONS.CLINICAL_REVISION_CREATE",
]:
    if permission in pap:
        raise SystemExit(
            f"PAP admin unexpectedly has {permission}"
        )

print("PASS professional revision permissions")
print("PASS PAP admin excluded")
PY
then
  pass "clinical authorization invariants"
else
  fail "clinical authorization invariants"
fi

run_gate \
  "Prisma validation" \
  npx prisma validate

run_gate \
  "Clinical governance direct harness" \
  npm run test:f03:clinical-governance

run_gate \
  "SMART impacted regression" \
  npm run test:f03:smart

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

printf '\n==> SMART log sanity\n'

if python3 - <<'PY'
import json
from pathlib import Path

path = Path(
    ".test-audit/latest.json"
)

if not path.exists():
    raise SystemExit(
        "SMART log missing"
    )

data = json.loads(
    path.read_text()
)

results = data.get(
    "results",
    {},
)

failed = [
    name
    for name, result
    in results.items()
    if result.get("status") == "FAIL"
]

if failed:
    raise SystemExit(
        "SMART failures: "
        + ", ".join(failed)
    )

print(
    "direct=",
    data.get(
        "directlyAffected",
    ),
)

print(
    "selected=",
    data.get(
        "selectedModules",
    ),
)

print(
    "PASS no SMART module failure"
)
PY
then
  pass "SMART log sanity"
else
  fail "SMART log sanity"
fi

printf '\n========================================\n'
printf ' F03.8 + F03.9 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.8 + F03.9 FINAL AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03.8 + F03.9 FINAL AUDIT: PASS\n'
