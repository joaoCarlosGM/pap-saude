-- Forward-only, exclusively in an ownership-verified disposable review database. Never Prisma.
ALTER TABLE review_meta ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
ALTER TABLE review_cards ADD COLUMN IF NOT EXISTS issued_at timestamptz;
ALTER TABLE review_cards ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS review_people_document ON review_people((identity->>'document'));
CREATE TABLE IF NOT EXISTS review_operations (
 id uuid PRIMARY KEY, kind text NOT NULL, digest text NOT NULL, subject uuid NOT NULL REFERENCES review_people(subject), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS review_card_images (
 id uuid PRIMARY KEY, hash text UNIQUE NOT NULL REFERENCES review_cards(hash), encrypted bytea NOT NULL, iv bytea NOT NULL, tag bytea NOT NULL, sha256 text NOT NULL, bytes integer NOT NULL CHECK(bytes>0 AND bytes<4000000)
);
CREATE TABLE IF NOT EXISTS review_documents (
 id uuid PRIMARY KEY, subject uuid NOT NULL REFERENCES review_people(subject), group_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), name text NOT NULL, category text NOT NULL CHECK(category IN ('EXAME_DEMONSTRATIVO','REFERENCIA_EDUCATIVA','OUTRO_SINTETICO')), bytes bytea NOT NULL CHECK(octet_length(bytes)>0 AND octet_length(bytes)<=5242880), sha256 text NOT NULL CHECK(length(sha256)=64), pages integer NOT NULL CHECK(pages BETWEEN 1 AND 50), archived boolean NOT NULL DEFAULT false, operation_id uuid UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(group_id,version)
);
CREATE TABLE IF NOT EXISTS review_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text NOT NULL, subject uuid REFERENCES review_people(subject), resource_id uuid, actor text NOT NULL, at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION review_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'REVIEW_AUDIT_APPEND_ONLY'; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='review_audit_no_change' AND tgrelid='review_audit'::regclass) THEN CREATE TRIGGER review_audit_no_change BEFORE UPDATE OR DELETE ON review_audit FOR EACH ROW EXECUTE FUNCTION review_audit_immutable(); END IF; END $$;
UPDATE review_meta SET schema_version=2;
