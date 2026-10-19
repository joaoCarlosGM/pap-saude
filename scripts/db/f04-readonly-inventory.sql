\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT current_database() AS database, current_user AS inspector;
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolreplication, rolcanlogin
FROM pg_roles WHERE rolname IN ('pap_prod','pap_runtime','pap_migrator');
SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back, checksum
FROM public._prisma_migrations ORDER BY migration_name;
SELECT c.relname AS object, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p','S') ORDER BY c.relname;
SELECT tgname, tgenabled FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname;
DO $counts$
DECLARE table_name text; records bigint;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['patients','admissions','clinical_evaluations'] LOOP
  IF to_regclass('public.'||table_name) IS NOT NULL THEN
   EXECUTE format('SELECT count(*) FROM public.%I',table_name) INTO records;
   RAISE NOTICE '% count=%',table_name,records;
  END IF;
 END LOOP;
END $counts$;
COMMIT;
