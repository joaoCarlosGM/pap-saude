# PROPOSTA SOMENTE: aguardar autorização; não executado pelo Codex.
cd /workspace/p0-remediation/review || exit 1
test "$(git branch --show-current)" = "codex/p0-remediation-review-20261026" || exit 1
git add -- \
  scripts/test-release-admin.sh \
  src/app/api/admin/beta/invitations/route.ts \
  src/app/api/admin/beta/metrics/route.ts \
  src/app/api/admin/invitations/route.ts \
  src/app/api/admin/security/route.ts \
  src/components/admin/BetaDashboardClient.tsx \
  src/components/admin/GovernanceSummaryCards.tsx \
  src/lib/admin/governance-metrics.ts \
  src/server/admin-beta/governance-metrics.service.ts \
  src/server/admin-beta/invitations.service.ts \
  src/server/admin-beta/metrics.service.ts \
  src/server/admin/admin-security.service.ts \
  src/server/admin/operations-metrics.service.ts \
  src/server/auth/mfa-reset.service.ts \
  src/server/invitations/invitation.service.ts \
  tests/admin/f04-audit-idor.integration.test.ts \
  tests/first-access/browser.spec.ts \
  tests/local/provision.integration.test.ts \
  tests/mission04-b/governance.test.ts \
  tests/mission04-c/invitations.test.ts \
  tests/mission04-d/email.test.ts \
  tests/release/admin-invitation-authority.integration.test.ts \
  tests/release/governance-metrics.integration.test.ts \
  tests/release/governance-readonly-child.ts \
  tests/release/governance.playwright.config.ts \
  tests/release/governance.spec.ts
