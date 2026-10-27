# PROPOSTA SOMENTE: aguardar autorização; não executado pelo Codex.
cd /workspace/p0-remediation/review || exit 1
test "$(git branch --show-current)" = "codex/p0-remediation-review-20261026" || exit 1
git add -- \
  .github/workflows/ci.yml \
  scripts/test-p0-clinical-runtime.sh \
  tests/p0-remediation/registration-runtime-acl.sql \
  tests/p0-remediation/registration-runtime.integration.test.ts \
  tests/release/p0-meows-operational-state.test.ts
