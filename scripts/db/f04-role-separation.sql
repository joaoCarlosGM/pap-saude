\set ON_ERROR_STOP on
-- Run as database owner/admin, connected ONLY to the intended PAP database.
-- Parameters: runtime_role and migrator_role. No passwords accepted here.
BEGIN;
SELECT set_config('pap.runtime_role', :'runtime_role', true);
SELECT set_config('pap.migrator_role', :'migrator_role', true);
DO $guard$
DECLARE r text := current_setting('pap.runtime_role'); m text := current_setting('pap.migrator_role');
BEGIN
 IF r = m OR r = current_user OR r !~ '^pap_[a-z_]+$' OR m !~ '^pap_[a-z_]+$' THEN
  RAISE EXCEPTION 'Unsafe or identical role parameters';
 END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname=m) THEN
  EXECUTE format('CREATE ROLE %I NOLOGIN',m);
 END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname=r) THEN
  EXECUTE format('CREATE ROLE %I NOLOGIN',r);
 END IF;
 -- Refuse reused privileged/member/owner roles rather than affecting other services.
 IF EXISTS (SELECT FROM pg_roles WHERE rolname IN (r,m) AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication))
 OR EXISTS (SELECT FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN (r,m)))
 OR EXISTS (SELECT FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname=r))
 OR EXISTS (SELECT FROM pg_database WHERE datdba=(SELECT oid FROM pg_roles WHERE rolname=r))
 OR EXISTS (SELECT FROM pg_namespace WHERE nspowner=(SELECT oid FROM pg_roles WHERE rolname=r))
 OR EXISTS (SELECT FROM pg_proc WHERE proowner=(SELECT oid FROM pg_roles WHERE rolname=r)) THEN
  RAISE EXCEPTION 'Role is privileged, member or runtime object owner; manual inventory required';
 END IF;
END $guard$;
-- public schema grants affect this database only; inventory other users first.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO :"runtime_role", :"migrator_role";
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT USAGE, CREATE ON SCHEMA public TO :"migrator_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_role";
REVOKE ALL ON public._prisma_migrations FROM :"runtime_role";
REVOKE ALL ON public.audit_events FROM :"runtime_role";
GRANT SELECT, INSERT ON public.audit_events TO :"runtime_role";
-- Clinical snapshots live in a separate append-only ledger, never the admin log.
DO $clinical_ledger$
BEGIN
 IF to_regclass('public.clinical_provenance_events') IS NOT NULL THEN
  EXECUTE format('REVOKE ALL ON public.clinical_provenance_events FROM %I', current_setting('pap.runtime_role'));
  EXECUTE format('GRANT SELECT, INSERT ON public.clinical_provenance_events TO %I', current_setting('pap.runtime_role'));
 END IF;
END $clinical_ledger$;
-- Registration may complete a pending claim, but cannot rewrite its identity
-- or remove a terminal idempotency/cancellation barrier.
DO $registration_operations$
BEGIN
 IF to_regclass('public.clinical_registration_operations') IS NOT NULL THEN
  EXECUTE format('REVOKE ALL ON public.clinical_registration_operations FROM %I', current_setting('pap.runtime_role'));
  EXECUTE format('GRANT SELECT, INSERT ON public.clinical_registration_operations TO %I', current_setting('pap.runtime_role'));
  EXECUTE format('GRANT UPDATE ("status", "patientId", "pregnancyId", "encounterId", "evaluationId", "completedAt") ON public.clinical_registration_operations TO %I', current_setting('pap.runtime_role'));
 END IF;
END $registration_operations$;
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_role" IN SCHEMA public
 GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_role" IN SCHEMA public
 GRANT USAGE, SELECT ON SEQUENCES TO :"runtime_role";
COMMIT;
-- Existing object ownership must already be migrator-owned (or transferred after
-- reviewed inventory). Never REASSIGN OWNED globally: it could affect n8n.
