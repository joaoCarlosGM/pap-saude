-- F04.10: enforce append-only audit log and PAP > municipality > health-unit hierarchy.
-- Additive migration only; no rewrite of historical migration files.
-- Preflight historical data first. Manual remediation is required if invalid records exist.
BEGIN;

DO $preflight$
DECLARE
  bad_id text;
BEGIN
  SELECT o."id" INTO bad_id
    FROM "organizations" AS o
    LEFT JOIN "organizations" AS p ON p."id" = o."parentId"
   WHERE (o."type" = 'PAP' AND o."parentId" IS NOT NULL)
      OR (o."type" = 'MUNICIPALITY' AND (o."parentId" IS NULL OR p."type" IS DISTINCT FROM 'PAP'))
      OR (o."type" = 'HEALTH_UNIT' AND (o."parentId" IS NULL OR p."type" IS DISTINCT FROM 'MUNICIPALITY'))
   LIMIT 1;
  IF bad_id IS NOT NULL THEN
    RAISE EXCEPTION 'F04.10: invalid existing organization hierarchy at id=%; review and repair manually before applying this migration', bad_id
      USING ERRCODE = '23514';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION "f0410_reject_audit_mutations"()
RETURNS trigger LANGUAGE plpgsql AS $audit$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % forbidden', TG_OP
    USING ERRCODE = '23514';
END
$audit$;

CREATE TRIGGER "f0410_audit_events_immutable_row"
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION "f0410_reject_audit_mutations"();

CREATE TRIGGER "f0410_audit_events_immutable_truncate"
  BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION "f0410_reject_audit_mutations"();

CREATE OR REPLACE FUNCTION "f0410_enforce_organization_hierarchy"()
RETURNS trigger LANGUAGE plpgsql AS $hierarchy$
DECLARE
  expected_parent_type "OrganizationType";
  actual_parent_type "OrganizationType";
  has_incompatible_children boolean;
BEGIN
  CASE NEW."type"
    WHEN 'PAP' THEN
      IF NEW."parentId" IS NOT NULL THEN
        RAISE EXCEPTION 'PAP must have no parent (id=%)', NEW."id" USING ERRCODE = '23514';
      END IF;
      expected_parent_type := NULL;
    WHEN 'MUNICIPALITY' THEN expected_parent_type := 'PAP';
    WHEN 'HEALTH_UNIT' THEN expected_parent_type := 'MUNICIPALITY';
    ELSE RAISE EXCEPTION 'Unknown organization type' USING ERRCODE = '23514';
  END CASE;

  IF expected_parent_type IS NOT NULL THEN
    IF NEW."parentId" IS NULL OR NEW."parentId" = NEW."id" THEN
      RAISE EXCEPTION 'Invalid or missing organization parent (id=%)', NEW."id" USING ERRCODE = '23514';
    END IF;
    -- FOR SHARE serializes with parent TYPE updates, preventing TOCTOU hierarchy races.
    SELECT parent."type" INTO actual_parent_type
      FROM "organizations" AS parent
     WHERE parent."id" = NEW."parentId"
     FOR SHARE;
    IF NOT FOUND OR actual_parent_type IS DISTINCT FROM expected_parent_type THEN
      RAISE EXCEPTION 'Invalid organization parent type (id=%)', NEW."id" USING ERRCODE = '23514';
    END IF;
  END IF;

  -- A parent cannot be retyped while it has children that would become invalid.
  IF TG_OP = 'UPDATE' THEN
    IF NEW."type" IS DISTINCT FROM OLD."type" THEN
    SELECT EXISTS (
      SELECT 1
        FROM "organizations" AS child
       WHERE child."parentId" = NEW."id"
         AND NOT (
           (child."type" = 'MUNICIPALITY' AND NEW."type" = 'PAP') OR
           (child."type" = 'HEALTH_UNIT' AND NEW."type" = 'MUNICIPALITY')
         )
    ) INTO has_incompatible_children;
    IF has_incompatible_children THEN
      RAISE EXCEPTION 'Organization type change would orphan incompatible children (id=%)', NEW."id"
        USING ERRCODE = '23514';
    END IF;
    END IF;
  END IF;
  RETURN NEW;
END
$hierarchy$;

CREATE TRIGGER "f0410_organizations_hierarchy_guard"
  BEFORE INSERT OR UPDATE OF "type", "parentId" ON "organizations"
  FOR EACH ROW EXECUTE FUNCTION "f0410_enforce_organization_hierarchy"();

COMMIT;
