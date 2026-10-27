# PROPOSTA SOMENTE: aguardar autorização; não executado pelo Codex.
cd /workspace/p0-remediation/review || exit 1
test "$(git branch --show-current)" = "codex/p0-remediation-review-20261026" || exit 1
git add -- \
  docs/release/2026-10-26/p0-remediation/01-p0-matrix.md \
  docs/release/2026-10-26/p0-remediation/02-mfa-security.md \
  docs/release/2026-10-26/p0-remediation/03-clinical-integrity.md \
  docs/release/2026-10-26/p0-remediation/04-atomic-registration.md \
  docs/release/2026-10-26/p0-remediation/05-review-provenance.md \
  docs/release/2026-10-26/p0-remediation/06-slice-f.md \
  docs/release/2026-10-26/p0-remediation/07-integrated-validation.md \
  docs/release/2026-10-26/p0-remediation/08-go-no-go.md \
  docs/release/2026-10-26/p0-remediation/09-meows-operational-state.md \
  docs/release/2026-10-26/p0-remediation/10-controlled-composition.md \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/01-mfa-staging.sh \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/02-clinical-integrity-provenance-staging.sh \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/03-registration-staging.sh \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/04-admin-f-staging.sh \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/05-ci-p0-staging.sh \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/06-docs-staging.sh \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/all-git-paths.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/authorization.diff \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/dependency-risk.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/executed-commands.txt \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/git-diff-check.txt \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/git-diff-stat.txt \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/git-status-short.txt \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/image-archives.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/migration-structure.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/migrations.diff \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/resource-restoration.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/secret-review.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/source-manifest.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/staging-groups.json \
  docs/release/2026-10-26/p0-remediation/evidence/candidate/validation.json
