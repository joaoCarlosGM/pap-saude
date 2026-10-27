# PROPOSTA SOMENTE: aguardar autorização; não executado pelo Codex.
cd /workspace/p0-remediation/review || exit 1
test "$(git branch --show-current)" = "codex/p0-remediation-review-20261026" || exit 1
git add -- \
  scripts/test-p0-registration.sh \
  src/app/api/clinical/registrations/route.ts \
  src/components/registro/RegistrationWizard.tsx \
  src/lib/clinical-api/registration-preflight.ts \
  src/lib/clinical-api/registration.ts \
  src/server/clinical-registration/registration.service.ts \
  src/server/clinical-registration/registration.validation.ts \
  src/server/meows/meows.service.ts \
  src/server/patients/patient.service.ts \
  src/server/pregnancies/pregnancy.service.ts \
  tests/p0-remediation/clinical-registration-client.test.ts \
  tests/p0-remediation/clinical-registration.integration.test.ts \
  tests/p0-remediation/registration-upgrade-probe.ts \
  tests/p0-remediation/registration.playwright.config.ts \
  tests/p0-remediation/registration.spec.ts
