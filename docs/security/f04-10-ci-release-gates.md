# F04.10-H: Release pipeline and required follow-up

## Workflow scope
- Tests run on pushes to `feature/foundation-04-admin-core`, `develop`, and `prod`, plus PRs targeting `develop` or `prod`.
- The `publish` and `deploy` jobs are **both** gated to a `push` on the lowercase `prod` branch, and depend on the prior job. PRs and feature/develop pushes cannot publish images or deploy.
- CI starts **its own disposable** `pap_saude_db` PostgreSQL container, using hard-coded CI-only credentials to satisfy the existing isolated-db test harnesses. All F04 migrations are tested against newly created databases; no VPS database is touched.
- `npm run audit:f04:operations` is a required gate and includes database invariants, fresh migrations, SQL injection guard, F04 role/audit/MFA/admin/operations regressions, clinical API/UI regression, TypeScript, ESLint, and Next.js build.
- Docker builder uses a **non-secret, deliberately unreachable placeholder** database URL. Runtime URL must be passed explicitly to the application; Prisma migrator likewise expects runtime `DATABASE_URL`.

## Operational blockers requiring separate acceptance
- This pipeline change does **not** release F04. Do not merge into `prod` until F04.10 C–H approval and production database role separation are confirmed.
- The current local `pap_user` is a database superuser. Production application role must not own/alter `audit_events` or disable triggers; migration role must be separate. Inventory the VPS using read-only queries before changing permissions.
- The existing GitHub deployment runs automatically on a qualifying `prod` push after checks. Configure branch protection + require passing checks + restrict push rights; consider a protected GitHub `production` environment with required reviewers.
- `PROD` (uppercase) is the repository default branch, but `prod` (lowercase) is the deploy branch. Do not change either automatically.
- Full F03 master audit is not part of the CI gate because its existing branch guard requires `feature/foundation-03-*`; it is not safe to claim that suite runs on a detached PR ref. Final F03 scope requires independent review.
- End-to-end coverage of all tenant-owned endpoints, clinically approved PAP-MEOWS policy, telemetry (`requestErrorRate`, n8n heartbeat), and live RNDS interoperability remain distinct release readiness checks.
- The VPS deploy script is external to this repository; its behavior, health checks, rollback capability, and database credentials must be separately audited.
