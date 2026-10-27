\set ON_ERROR_STOP on
-- Run only in an owned disposable database after applying role separation.
BEGIN;
SET LOCAL ROLE pap_pzero_runtime;
DO $acl$
DECLARE col text; statement text; denied boolean;
BEGIN
 IF NOT has_table_privilege(current_user,'clinical_registration_operations','SELECT')
  OR NOT has_table_privilege(current_user,'clinical_registration_operations','INSERT') THEN
  RAISE EXCEPTION 'runtime needs operation SELECT/INSERT';
 END IF;
 IF has_table_privilege(current_user,'clinical_registration_operations','UPDATE')
  OR has_table_privilege(current_user,'clinical_registration_operations','DELETE')
  OR has_table_privilege(current_user,'clinical_registration_operations','TRUNCATE') THEN
  RAISE EXCEPTION 'overbroad operation table ACL';
 END IF;
 FOREACH col IN ARRAY ARRAY['status','patientId','pregnancyId','encounterId','evaluationId','completedAt'] LOOP
  IF NOT has_column_privilege(current_user,'clinical_registration_operations',col,'UPDATE') THEN
   RAISE EXCEPTION 'missing transition column %',col;
  END IF;
 END LOOP;
 FOREACH col IN ARRAY ARRAY['id','actorUserId','organizationId','keyHash','requestFingerprint','createdAt'] LOOP
  IF has_column_privilege(current_user,'clinical_registration_operations',col,'UPDATE') THEN
   RAISE EXCEPTION 'mutable operation identity %',col;
  END IF;
 END LOOP;
 FOREACH statement IN ARRAY ARRAY[
  'UPDATE clinical_registration_operations SET "actorUserId"="actorUserId" WHERE false',
  'UPDATE clinical_registration_operations SET "keyHash"="keyHash" WHERE false',
  'UPDATE clinical_registration_operations SET "requestFingerprint"="requestFingerprint" WHERE false',
  'DELETE FROM clinical_registration_operations WHERE false',
  'TRUNCATE clinical_registration_operations',
  'ALTER TABLE clinical_registration_operations DISABLE TRIGGER ALL',
  'UPDATE clinical_provenance_events SET "id"="id" WHERE false',
  'DELETE FROM clinical_provenance_events WHERE false',
  'TRUNCATE clinical_provenance_events',
  'SELECT * FROM _prisma_migrations',
  'CREATE TABLE public.pzero_forbidden (id int)'
 ] LOOP
  denied := false;
  BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unexpected runtime capability: %',statement; END IF;
 END LOOP;
 -- Allowed transition columns are checked by both column grants and immutable/state triggers.
 UPDATE clinical_registration_operations SET status='COMPLETED',"completedAt"=now() WHERE false;
END $acl$;
ROLLBACK;
\echo PASS runtime operation ACL: immutable identity, transition columns, ledger and DDL isolation
