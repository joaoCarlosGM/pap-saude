# PROPOSTA SOMENTE: aguardar autorização; não executado pelo Codex.
cd /workspace/p0-remediation/review || exit 1
test "$(git branch --show-current)" = "codex/p0-remediation-review-20261026" || exit 1
git add -- \
  prisma/migrations/20261026193000_p0_clinical_provenance/migration.sql \
  prisma/migrations/20261026194000_p0_clinical_registration_operation/migration.sql \
  prisma/schema.prisma \
  scripts/db/f04-role-separation.sql \
  scripts/test-f03-meows-engine.sh \
  scripts/test-f03-obstetric-data.sh \
  scripts/test-f03-vital-signs.sh \
  scripts/test-p0-provenance.sh \
  scripts/testing/allow-audit-test-cleanup.sh \
  src/server/clinical-revision/clinical-provenance.service.ts \
  src/server/clinical-revision/clinical-revision.errors.ts \
  src/server/clinical-revision/clinical-revision.service.ts \
  src/server/clinical-revision/clinical-revision.types.ts \
  src/server/clinical-revision/clinical-revision.validation.ts \
  src/server/encounters/clinical-write-transaction.ts \
  src/server/encounters/encounter-consistency.ts \
  src/server/encounters/encounter-organization.service.ts \
  src/server/encounters/encounter.service.ts \
  src/server/http/clinical-api.ts \
  src/server/obstetric-data/obstetric-data-consistency.ts \
  src/server/obstetric-data/obstetric-data.service.ts \
  src/server/obstetric-data/obstetric-data.types.ts \
  src/server/patients/patient-organization.service.ts \
  src/server/vital-signs/vital-signs-consistency.ts \
  src/server/vital-signs/vital-signs.service.ts \
  src/server/vital-signs/vital-signs.types.ts \
  tests/clinical/allergies-clinical-flags-access.integration.test.ts \
  tests/clinical/allergies-clinical-flags-lifecycle.integration.test.ts \
  tests/clinical/clinical-api-ui.integration.test.ts \
  tests/clinical/clinical-governance.integration.test.ts \
  tests/clinical/encounter-access.integration.test.ts \
  tests/clinical/encounter-integration.integration.test.ts \
  tests/clinical/encounter-lifecycle.integration.test.ts \
  tests/clinical/meows-access.integration.test.ts \
  tests/clinical/meows-lifecycle.integration.test.ts \
  tests/clinical/obstetric-data-access.integration.test.ts \
  tests/clinical/obstetric-data-lifecycle.integration.test.ts \
  tests/clinical/patient-access.integration.test.ts \
  tests/clinical/patient-deduplication.integration.test.ts \
  tests/clinical/patient-organization.integration.test.ts \
  tests/clinical/patient-registry.integration.test.ts \
  tests/clinical/pregnancy-access.integration.test.ts \
  tests/clinical/pregnancy-integration.integration.test.ts \
  tests/clinical/pregnancy-lifecycle.integration.test.ts \
  tests/clinical/vital-signs-access.integration.test.ts \
  tests/clinical/vital-signs-lifecycle.integration.test.ts \
  tests/helpers/attributed-obstetric-data.ts \
  tests/helpers/attributed-vital-signs.ts \
  tests/helpers/clinical-fixture-actor.ts \
  tests/p0-remediation/clinical-finalization-race.integration.test.ts \
  tests/release/p0-provenance.integration.test.ts
