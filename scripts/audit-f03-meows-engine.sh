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
printf ' F03.7 FINAL MEOWS ENGINE AUDIT\n'
printf '========================================\n'

BRANCH="$(git branch --show-current)"

printf '\n==> branch\n'
printf 'branch=%s\n' "$BRANCH"

if [[ "$BRANCH" == "feature/foundation-03-meows-engine" ]]; then
  pass "correct F03.7 feature branch"
else
  fail "correct F03.7 feature branch"
fi

printf '\n==> policy invariants\n'

if python3 - <<'PY'
from pathlib import Path

policy = Path(
    "src/server/meows/meows-policy.v1-draft.ts"
).read_text()

types = Path(
    "src/server/meows/meows-policy.types.ts"
).read_text()

checks = {
    "draft status explicit":
        '"DRAFT_UNVALIDATED"' in policy,

    "clinicallyValidated false":
        "clinicallyValidated:\n    false"
        in policy,

    "missing => incomplete":
        '"INCOMPLETE"' in policy,

    "invalid => reject":
        '"REJECT"' in policy,

    "SpO2 excluded":
        "includedInFormula:\n      false"
        in policy,

    "temperature consensus":
        'confidence:\n      "CONSENSUS"'
        in policy,

    "numeric provisional exists":
        '"PROVISIONAL"'
        in policy,

    "P1 unresolved":
        "P1_ALERT_THRESHOLD"
        in policy,

    "P3 unresolved":
        "P3_OXYGEN_RULE"
        in policy,

    "P4 unresolved":
        "P4_CONSCIOUSNESS_RULE"
        in policy,

    "P5 unresolved":
        "P5_SPO2_ROLE"
        in policy,

    "policy types exist":
        "MeowsDraftPolicy"
        in types,
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
        "Policy failures: "
        + ", ".join(failed)
    )
PY
then
  pass "policy invariants"
else
  fail "policy invariants"
fi

printf '\n==> schema invariants\n'

if python3 - <<'PY'
from pathlib import Path

schema = Path(
    "prisma/schema.prisma"
).read_text()

checks = {
    "MeowsEvaluationStatus exists":
        "enum MeowsEvaluationStatus {"
        in schema,

    "ClinicalEvaluation status exists":
        "status               MeowsEvaluationStatus"
        in schema,

    "meowsScore nullable":
        "meowsScore           Int?"
        in schema,

    "alertLevel nullable":
        "alertLevel           AlertLevel?"
        in schema,

    "protocolId exists":
        "protocolId           String"
        in schema,

    "protocolVersion exists":
        "protocolVersion      String"
        in schema,

    "protocolStatus exists":
        "protocolStatus       String"
        in schema,

    "clinicallyValidated exists":
        "clinicallyValidated  Boolean"
        in schema,

    "componentScores exists":
        "componentScores      Json?"
        in schema,

    "missingParameters exists":
        "missingParameters    String[]"
        in schema,

    "unresolvedParameters exists":
        "unresolvedParameters String[]"
        in schema,

    "status index exists":
        "@@index([status, evaluatedAt])"
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
    "20261003070000_foundation_03_meows_engine/"
    "migration.sql"
)

if not path.exists():
    raise SystemExit(
        "F03.7 migration missing"
    )

sql = path.read_text()

normalized_sql = " ".join(
    sql.split()
)

required = [
    'CREATE TYPE "MeowsEvaluationStatus"',
    'ALTER COLUMN "meowsScore" DROP NOT NULL',
    'ALTER COLUMN "alertLevel" DROP NOT NULL',
    'ADD COLUMN "status"',
    'ADD COLUMN "protocolId"',
    'ADD COLUMN "protocolVersion"',
    'ADD COLUMN "protocolStatus"',
    'ADD COLUMN "clinicallyValidated"',
    'ADD COLUMN "componentScores"',
    'ADD COLUMN "missingParameters"',
    'ADD COLUMN "unresolvedParameters"',
    'clinical_evaluations_result_consistency_check',
    'clinical_evaluations_status_evaluatedAt_idx',
]

for item in required:
    if item not in normalized_sql:
        raise SystemExit(
            f"Missing migration invariant: {item}"
        )

for forbidden in [
    'DROP TABLE "clinical_evaluations"',
    'DROP TABLE clinical_evaluations',
    'TRUNCATE',
]:
    if forbidden in sql:
        raise SystemExit(
            f"Destructive operation found: {forbidden}"
        )

print("PASS  migration incremental")
print("PASS  incomplete/policy unresolved supported")
print("PASS  result consistency guard present")
PY
then
  pass "migration invariants"
else
  fail "migration invariants"
fi

printf '\n==> engine invariants\n'

if python3 - <<'PY'
from pathlib import Path

engine = Path(
    "src/server/meows/meows-engine.ts"
).read_text()

scoring = Path(
    "src/server/meows/meows-scoring.ts"
).read_text()

service = Path(
    "src/server/meows/meows.service.ts"
).read_text()

access = Path(
    "src/server/meows/meows-access.service.ts"
).read_text()

checks = {
    "pure evaluator exists":
        "evaluateMeowsDraft"
        in engine,

    "numeric scorer exists":
        "scoreNumericParameter"
        in scoring,

    "aggregate function exists":
        "sumMeowsComponentScores"
        in scoring,

    "policy unresolved status used":
        "POLICY_UNRESOLVED"
        in engine,

    "incomplete status used":
        "INCOMPLETE"
        in engine,

    "score not synthesized":
        "totalScore:\n      null"
        in engine,

    "alert level not synthesized":
        "alertLevel:\n      null"
        in engine,

    "SpO2 structural validation exists":
        "oxygenSaturation"
        in engine,

    "encounter evaluator exists":
        "evaluateEncounterMeows"
        in service,

    "persistence exists":
        "persistEncounterMeowsEvaluation"
        in service,

    "history exists":
        "listEncounterMeowsEvaluations"
        in service,

    "protocol provenance persisted":
        "protocolVersion"
        in service
        and
        "protocolStatus"
        in service,

    "active patient link enforced":
        "hasActivePatientOrganizationLink"
        in access,

    "read access exists":
        "requireMeowsReadAccess"
        in access,

    "evaluate access exists":
        "requireMeowsEvaluateAccess"
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
        "Engine failures: "
        + ", ".join(failed)
    )
PY
then
  pass "engine invariants"
else
  fail "engine invariants"
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
    'MEOWS_READ: "meows.read"',
    'MEOWS_EVALUATE: "meows.evaluate"',
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
    "PERMISSIONS.MEOWS_READ",
    "PERMISSIONS.MEOWS_EVALUATE",
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
    "PERMISSIONS.MEOWS_READ",
    "PERMISSIONS.MEOWS_EVALUATE",
]:
    if permission in pap:
        raise SystemExit(
            f"PAP admin unexpectedly has {permission}"
        )

print("PASS  MEOWS permissions exist")
print("PASS  professional receives MEOWS permissions")
print("PASS  PAP admin has no default MEOWS access")
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
  "F03.7 MEOWS harness" \
  npm run test:f03:meows-engine

run_gate \
  "Allergies + flags regression" \
  npm run test:f03:allergies-flags

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
printf ' F03.7 AUDIT SUMMARY\n'
printf '========================================\n'

printf 'passes=%s\n' "$PASS_COUNT"
printf 'failures=%s\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  printf '\nF03.7 FINAL AUDIT: FAIL\n'
  exit 1
fi

printf '\nF03.7 FINAL AUDIT: PASS\n'
