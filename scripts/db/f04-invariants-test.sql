BEGIN;

DO $check$
DECLARE
  blocked boolean;
  installed integer;
BEGIN
  SELECT count(*) INTO installed FROM pg_trigger
   WHERE tgrelid IN ('audit_events'::regclass, 'organizations'::regclass)
     AND tgname IN ('f0410_audit_events_immutable_row',
                    'f0410_audit_events_immutable_truncate',
                    'f0410_organizations_hierarchy_guard')
     AND tgenabled = 'O';
  IF installed <> 3 THEN
    RAISE EXCEPTION 'FAIL expected 3 enabled triggers, got %', installed;
  END IF;

  INSERT INTO audit_events (id, action, "resourceType") VALUES
    ('f0410-integrity-event', 'AUDIT_INTEGRITY_TEST', 'TEST');

  blocked := false;
  BEGIN
    UPDATE audit_events SET action='MODIFIED' WHERE id='f0410-integrity-event';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL AUDIT_UPDATE allowed'; END IF;
  RAISE NOTICE 'PASS AUDIT_UPDATE blocked';

  blocked := false;
  BEGIN
    DELETE FROM audit_events WHERE id='f0410-integrity-event';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL AUDIT_DELETE allowed'; END IF;
  RAISE NOTICE 'PASS AUDIT_DELETE blocked';

  blocked := false;
  BEGIN
    TRUNCATE audit_events;
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL AUDIT_TRUNCATE allowed'; END IF;
  RAISE NOTICE 'PASS AUDIT_TRUNCATE blocked';

  INSERT INTO organizations (id, type, status, name, "updatedAt") VALUES
    ('f0410-pap', 'PAP', 'ACTIVE', 'F0410 PAP', now());
  INSERT INTO organizations (id, type, status, name, "parentId", "updatedAt") VALUES
    ('f0410-municipality', 'MUNICIPALITY', 'ACTIVE', 'F0410 Municipality', 'f0410-pap', now());
  INSERT INTO organizations (id, type, status, name, "parentId", "updatedAt") VALUES
    ('f0410-unit', 'HEALTH_UNIT', 'ACTIVE', 'F0410 UBS', 'f0410-municipality', now());
  RAISE NOTICE 'PASS valid PAP > MUNICIPALITY > HEALTH_UNIT';

  blocked := false;
  BEGIN
    INSERT INTO organizations (id, type, status, name, "parentId", "updatedAt") VALUES
      ('f0410-invalid-unit', 'HEALTH_UNIT', 'ACTIVE', 'Invalid direct PAP child', 'f0410-pap', now());
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL INVALID_HIERARCHY insert allowed'; END IF;
  RAISE NOTICE 'PASS INVALID_HIERARCHY insert blocked';

  blocked := false;
  BEGIN
    UPDATE organizations SET "parentId"='f0410-pap' WHERE id='f0410-unit';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL INVALID_HIERARCHY update allowed'; END IF;
  RAISE NOTICE 'PASS INVALID_HIERARCHY update blocked';

  blocked := false;
  BEGIN
    UPDATE organizations SET type='PAP', "parentId"=NULL WHERE id='f0410-municipality';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL INVALID_PARENT_RETYPE allowed'; END IF;
  RAISE NOTICE 'PASS INVALID_PARENT_RETYPE blocked';
END
$check$;

ROLLBACK;
