# Foundation 02 — Security Audit

Date: 2026-10-02

## Result

Foundation 02 passed functional, build, TypeScript, lint, Prisma schema,
migration-on-clean-database and integration-test gates.

The following dependency advisories remain upstream in Prisma 7.10.0.

## Accepted temporary upstream findings

### deepmerge-ts

Advisory:

- GHSA-ggr8-5vv4-36mx
- affected: deepmerge-ts < 8.0.0
- severity: high

Dependency path:

prisma
→ @prisma/config
→ deepmerge-ts

The vulnerable package is reached through Prisma CLI/config tooling used for
commands such as generate, validate and migrate.

The PAP Saúde HTTP application does not directly call deepmerge-ts.

No `npm audit fix --force` is permitted because npm currently proposes a
Prisma major-version downgrade.

Removal condition:

- Prisma ships a compatible release using deepmerge-ts >= 8; or
- the dependency path disappears.

### mysql2

Current npm audit reports mysql2 through the Prisma package tree even though
PAP Saúde uses PostgreSQL through Prisma and @prisma/adapter-pg.

The PAP Saúde application does not configure or connect to MySQL.

No forced Prisma downgrade is permitted as remediation.

Removal condition:

- Prisma publishes a compatible dependency update; or
- the vulnerable mysql2 dependency disappears from the installed Prisma tree.

## Next.js remediation

Next.js was upgraded from 16.3.4 to 16.3.8 during this audit to remediate the
critical Next.js advisory reported by npm audit.

## Review policy

These temporary exceptions must be reviewed whenever Prisma is upgraded and
before production go-live.

High or critical vulnerabilities reachable through the PAP Saúde runtime or
request path are not accepted by this exception.
