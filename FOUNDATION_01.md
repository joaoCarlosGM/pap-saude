# PAP Saúde — Foundation 01

## Scope

This package establishes the first server/domain foundation without implementing authentication, MFA, PAP Admin UI, or production RNDS transmission.

### Included
- Modular server boundary under `src/server`
- Multi-organization data model
- User/membership/RBAC foundation
- Clinical foundation
- Audit event foundation
- RNDS enablement per health unit
- RNDS validation-run evidence model
- Per-resource integration policy model
- RNDS activation event constant

### Deliberately excluded
- Passwords/credentials
- Sessions
- MFA
- PAP Admin screens
- Real RNDS credentials
- RNDS production payloads
- n8n workflows
- migrations against production

## Safety rule

Do not run `prisma migrate dev` or `prisma migrate deploy` against the production database while validating Foundation 01.

Use `npx prisma format` and `npx prisma validate` first, then create a dedicated development database before generating the first migration.

## RNDS rule

Integration status is stored in PAP/PostgreSQL and scoped to a `HEALTH_UNIT`.
n8n is orchestration only. The official RNDS specification in force during homologation will define actual mapping, terminology, authentication, eligibility and transmission rules.
