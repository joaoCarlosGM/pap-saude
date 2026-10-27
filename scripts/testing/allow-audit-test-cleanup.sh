#!/usr/bin/env bash
set -Eeuo pipefail
# Called only AFTER the test script has created/migrated and verified its disposable DB.
# It temporarily disables the row mutation guard in *explicitly named* isolated test DBs,
# preserving the legacy test suites' deleteMany() cleanup. Never invoke in production.
[[ $# -eq 3 ]] || { printf 'Usage: %s CONTAINER USER DB_NAME\n' "$0" >&2; exit 2; }
CONTAINER="$1" USER="$2" DATABASE="$3"
case "$DATABASE" in
  pap_saude_f02b_test|pap_saude_f03_clinical_governance_test|pap_saude_f03_clinical_api_ui_test|\
  pap_saude_f03_vital_signs_test|pap_saude_f03_obstetric_data_test|pap_saude_f03_meows_test|\
  pap_saude_f04_admin_core_test|pap_saude_f04_role_governance_test|pap_saude_f04_role_adversarial_test|\
  pap_saude_f04_access_trust_test|pap_saude_f04_audit_idor_test|pap_saude_f04_operations_test)
    ;;
  *) printf 'SAFETY FAILURE: not an allowlisted ephemeral DB: %s\n' "$DATABASE" >&2; exit 1 ;;
esac

ACTUAL="$(docker exec "$CONTAINER" psql -X -U "$USER" -d "$DATABASE" -Atqc 'SELECT current_database();')"
[[ "$ACTUAL" == "$DATABASE" ]] || { printf 'SAFETY FAILURE: unexpected database\n' >&2; exit 1; }
# Insist the trigger is installed, enabled and of the expected type before disabling.
READY="$(docker exec "$CONTAINER" psql -X -U "$USER" -d "$DATABASE" -Atqc "SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'audit_events'::regclass AND tgname='f0410_audit_events_immutable_row' AND tgenabled='O';")"
[[ "$READY" == 1 ]] || { printf 'SAFETY FAILURE: expected audit trigger not enabled\n' >&2; exit 1; }

docker exec "$CONTAINER" psql -X -U "$USER" -d "$DATABASE" -v ON_ERROR_STOP=1 \
  -c 'ALTER TABLE "audit_events" DISABLE TRIGGER "f0410_audit_events_immutable_row";'
printf 'TEST CLEANUP MODE: ephemeral %s only; audit immutability is tested in separate protected database\n' "$DATABASE"

# The same explicit ephemeral allowlist governs the clinical ledger. This helper
# is never called by production migrations or runtime application code.
LEDGER="$(docker exec "$CONTAINER" psql -X -U "$USER" -d "$DATABASE" -Atqc "SELECT to_regclass('public.clinical_provenance_events') IS NOT NULL;")"
if [[ "$LEDGER" == t ]]; then
  READY="$(docker exec "$CONTAINER" psql -X -U "$USER" -d "$DATABASE" -Atqc "SELECT COUNT(*) FROM pg_trigger WHERE tgrelid='clinical_provenance_events'::regclass AND tgname='p0_clinical_provenance_immutable_row' AND tgenabled='O';")"
  [[ "$READY" == 1 ]] || { printf 'SAFETY FAILURE: expected clinical provenance trigger not enabled\n' >&2; exit 1; }
  docker exec "$CONTAINER" psql -X -U "$USER" -d "$DATABASE" -v ON_ERROR_STOP=1 -c 'ALTER TABLE "clinical_provenance_events" DISABLE TRIGGER "p0_clinical_provenance_immutable_row";'
fi
