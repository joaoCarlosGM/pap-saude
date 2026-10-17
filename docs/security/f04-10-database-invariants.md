# F04.10 — Database integrity findings and correction (candidate)

## Confirmed on clean PostgreSQL database before remediation
- `AUDIT_UPDATE` allowed: HIGH.
- `AUDIT_DELETE` allowed: HIGH.
- `INVALID_HIERARCHY` (HEALTH_UNIT immediately below PAP) allowed: HIGH.
- No custom trigger existed on `audit_events`.

## Remediation
Migration `20261016210000_foundation_04_audit_integrity` is additive. Its preflight blocks migration if historical organization rows violate the hierarchy; **do not fix production data automatically**. Triggers prevent `UPDATE`, `DELETE`, and `TRUNCATE` of `audit_events` and enforce the three-level hierarchy on insert and parent/type changes, including attempts to retype a parent with incompatible children.

`npm run test:f04:db-integrity` uses a new database, checks the three triggers in their enabled state, and asserts denials for update/delete/truncate, invalid insert, invalid reparent, and invalid parent retype. The entire probe is rolled back and the test database is removed.

## Legacy integration test cleanup
Earlier F02/F03/F04 tests call `auditEvent.deleteMany()` between tests. Their **isolated disposable** DB harnesses verify the exact DB identity and use `scripts/testing/allow-audit-test-cleanup.sh` to disable only the audit-row trigger in an explicit allowlist of ephemeral databases. This is a test-only compatibility mode, not a production setting. The TRUNCATE trigger and organization hierarchy guard remain enabled. The dedicated integrity test **never disables** any trigger. No service source code can disable these triggers.

## Operational release blockers (not solved here)
- Database runtime role **must not** own audit tables or possess schema-altering powers; migration and application roles should be separated in production. Triggers alone do not constrain the table owner or superuser.
- Existing `AuditEvent.actorUserId` has `ON DELETE SET NULL`. A physical user delete may now be blocked because it would mutate history. Define a retention/de-identification policy and favor deactivation rather than destructive user deletion.
- Any existing hierarchy drift blocks migration by design; perform read-only inventory and controlled correction before release.
- CI/CD branch selection and security checks, HTTP/worker/n8n instrumentation, RNDS homologation, and other F04.10 items remain pending.

No commit, deploy, or production migration is authorized by this candidate alone.
