-- Exclusively applied to an ownership-verified synthetic review database.
CREATE TABLE IF NOT EXISTS review_chart_events (
 id uuid PRIMARY KEY,
 subject uuid NOT NULL REFERENCES review_people(subject),
 entity_id uuid NOT NULL,
 kind text NOT NULL CHECK (kind IN ('pedido','resultado','vacina','contato','identidade','medicacao','alergia','comorbidade','historico','agenda','consulta','soap')),
 version integer NOT NULL CHECK (version > 0),
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'kind' = kind),
 actions text[] NOT NULL,
 fields text[] NOT NULL,
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor text NOT NULL,
 source text NOT NULL,
 reason text,
 digest text NOT NULL,
 UNIQUE (entity_id, version)
);
CREATE INDEX IF NOT EXISTS review_chart_subject_order ON review_chart_events (subject, recorded_at DESC, id);
CREATE INDEX IF NOT EXISTS review_chart_subject_kind ON review_chart_events (subject, kind, entity_id, version DESC);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='review_chart_no_change' AND tgrelid='review_chart_events'::regclass) THEN
  CREATE TRIGGER review_chart_no_change BEFORE UPDATE OR DELETE ON review_chart_events
   FOR EACH ROW EXECUTE FUNCTION review_audit_immutable();
 END IF;
END $$;
UPDATE review_meta SET schema_version=GREATEST(schema_version, 3);
