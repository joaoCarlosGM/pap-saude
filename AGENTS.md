<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:pap-saude-project-rules -->

## PAP Saúde — project engineering and release constraints

- Read repository documentation and existing architecture before editing; preserve the Next.js-specific rules above and consult the installed Next.js docs.
- Reuse current F01–F04 modules and existing Prisma migrations; do not recreate or rewrite historical migration files.
- Strict multitenancy: PAP -> MUNICIPALITY -> HEALTH_UNIT; User identity is global, Membership and RoleAssignment are scoped, and PAP_ADMIN has no implicit clinical-record access.
- Security controls are mandatory: server-side RBAC, tenant isolation, MFA where required, one-time hashed invitation tokens, and append-only audited events. Never weaken checks to make tests pass.
- For the F04.10 hardening work, all database and Docker execution must be against isolated, disposable local/CI systems. Do not connect to, migrate, alter, restart, or deploy to the real VPS or production database.
- Do not merge or push to prod, PROD, or develop without explicit human authorization. A push to lowercase prod may publish images and deploy automatically; uppercase PROD is a different branch.
- Do not disclose or commit secrets, production environment files, raw database contents, patient information, or tokens. Use only fake CI credentials and synthetic data.
- Keep commits small; run relevant tests, TypeScript, lint, migration checks, container checks and security regressions. Every PASS needs execution evidence; otherwise label NOT RUN or BLOCKED.
- Never claim migration rollback reverses database changes. Require tested backup restoration / roll-forward and human GO/NO-GO before production release.
- For the current mission, follow docs/codex/MISSAO-01-F04-10.md. Later missions must use their own task documents.

<!-- END:pap-saude-project-rules -->
