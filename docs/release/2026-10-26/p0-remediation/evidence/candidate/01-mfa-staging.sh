# PROPOSTA SOMENTE: aguardar autorização; não executado pelo Codex.
cd /workspace/p0-remediation/review || exit 1
test "$(git branch --show-current)" = "codex/p0-remediation-review-20261026" || exit 1
git add -- \
  scripts/test-p0-auth-isolated.sh \
  scripts/test-release-mfa-limit.sh \
  src/app/api/auth/mfa/verify/route.ts \
  src/components/auth/LoginSecurity.tsx \
  src/server/auth/http-auth.ts \
  src/server/auth/mfa-attempt-limit.service.ts \
  src/server/auth/mfa-login.service.ts \
  src/server/auth/mfa.errors.ts \
  src/server/http/clinical-api-response.ts \
  tests/release/auth-body-budget.test.ts \
  tests/release/clinical-error-privacy.test.ts \
  tests/release/mfa-attempt-limit.integration.test.ts \
  tests/release/mfa-block-ui.playwright.config.ts \
  tests/release/mfa-block-ui.spec.ts
