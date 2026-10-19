# F04.7–F04.9 — Operations batch (candidate)

## Scope and access control

The API endpoints `/api/admin/operations/monitoring`, `/metrics`, `/integrations` require an active session and use the existing **effective IAM permissions**, scoped to an active municipality and its units or an individual unit. A global role does not imply clinical read access. For unknown, inactive, or outside-scope organization IDs, requests fail closed. Responses use `no-store`; queries have strict allowlisted parameters and at most 25 rows per page.

## F04.7 — Monitoring

Database connectivity is confirmed by executing authorized Prisma queries. RNDS integration status comes from the application database; counts of queued/retry transmissions and validation jobs are from persisted records, scoped by unit. Threshold for overdue queue/validation: **one hour**. Failed transmission window: **last 24 hours**.

**Not instrumented (do not present as healthy):** HTTP error rates, worker heartbeat, and external n8n health. Adding actual external checks, recording worker heartbeats and HTTP/trace telemetry must be handled in a later operations hardening milestone. No network calls to user-controlled URLs are made by the monitoring API.

## F04.8 — Metrics

Aggregates events from `ProductActivityEvent` only, over the previous 30 complete-or-current UTC days by default. Accepted range: at most 90 days. Unit-level metrics include direct activity; municipality metrics include direct activity and health units; PAP metrics include its municipality/health-unit descendants. Only official product event keys are exposed. Unique active-user counts under five are suppressed (`null`), and no clinical data or individual actors are returned. These counters are **usage metrics**, not clinical outcomes or verified encounter totals.

## F04.9 — Integrations

Read-only listing of RNDS onboarding state, environment, last check and last validation per authorized **HEALTH_UNIT**. No `configuration`, tokens, credentials, transmission payloads, validation evidence, or external references are emitted. `n8n` displays configuration presence only to global administrators and **does not verify connectivity**. Nothing here can approve an RNDS integration or transmit health records; those actions remain gated by official policies and future homologation.

## Test and release gates

Run `npm run audit:f04:operations` only against non-production test infrastructure. It runs isolated fresh-DB migrations, integration and multi-tenant regressions, Prisma validation, SQL guard, TypeScript, full ESLint, production build, and `git diff --check`. Declare DONE only after the full gate passes on the actual current HEAD and an operator reviews known operational monitoring gaps.

Commit and push **only** this batch's files to `feature/foundation-04-admin-core`. Do not merge into deployment before F04.10 final audit.
