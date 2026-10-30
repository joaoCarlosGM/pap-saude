-- AlterTable
ALTER TABLE "user_notifications" ADD COLUMN     "courseEnrollmentId" TEXT,
ADD COLUMN     "coursePublicationId" TEXT,
ALTER COLUMN "invitationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "courses" (
    "creationKey" TEXT,
    "creationHash" TEXT,
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_versions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INTRODUCTORY',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "thumbnail" TEXT NOT NULL DEFAULT 'pre-natal',
    "estimatedMinutes" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "immutableContentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "contentBlocks" JSONB NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assets" (
    "id" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assessments" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "requiredForCompletion" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "course_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_questions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,

    CONSTRAINT "course_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_publications" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "course_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_audiences" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "releasedBy" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "course_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalUserId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "obligation" TEXT NOT NULL DEFAULT 'RECOMMENDED',
    "deadlineAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "learnerUserId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastLessonId" TEXT,
    "seenAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "checkpointDigest" TEXT,

    CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_attempts" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "scoreValidated" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answersDigest" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_creatorUserId_createdAt_idx" ON "courses"("creatorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_versions_courseId_versionNo_key" ON "course_versions"("courseId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "course_modules_courseVersionId_sortOrder_key" ON "course_modules"("courseVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "course_lessons_moduleId_sortOrder_key" ON "course_lessons"("moduleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "course_assets_storageKey_key" ON "course_assets"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "course_assessments_courseVersionId_key" ON "course_assessments"("courseVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "course_questions_assessmentId_sortOrder_key" ON "course_questions"("assessmentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "course_publications_courseVersionId_key" ON "course_publications"("courseVersionId");

-- CreateIndex
CREATE INDEX "course_audiences_organizationId_revokedAt_idx" ON "course_audiences"("organizationId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_audiences_publicationId_organizationId_key" ON "course_audiences"("publicationId", "organizationId");

-- CreateIndex
CREATE INDEX "course_assignments_organizationId_deadlineAt_idx" ON "course_assignments"("organizationId", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_publicationId_organizationId_professiona_key" ON "course_assignments"("publicationId", "organizationId", "professionalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_assignmentId_key" ON "course_enrollments"("assignmentId");

-- CreateIndex
CREATE INDEX "course_enrollments_learnerUserId_completedAt_idx" ON "course_enrollments"("learnerUserId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_progress_enrollmentId_lessonId_key" ON "course_progress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "course_attempts_enrollmentId_requestKey_key" ON "course_attempts"("enrollmentId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "course_attempts_enrollmentId_assessmentId_attemptNo_key" ON "course_attempts"("enrollmentId", "assessmentId", "attemptNo");

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_courseEnrollmentId_fkey" FOREIGN KEY ("courseEnrollmentId") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_coursePublicationId_fkey" FOREIGN KEY ("coursePublicationId") REFERENCES "course_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_versions" ADD CONSTRAINT "course_versions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "course_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assets" ADD CONSTRAINT "course_assets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assessments" ADD CONSTRAINT "course_assessments_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "course_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "course_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_publications" ADD CONSTRAINT "course_publications_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "course_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_publications" ADD CONSTRAINT "course_publications_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_audiences" ADD CONSTRAINT "course_audiences_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "course_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_audiences" ADD CONSTRAINT "course_audiences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_audiences" ADD CONSTRAINT "course_audiences_releasedBy_fkey" FOREIGN KEY ("releasedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "course_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_professionalUserId_fkey" FOREIGN KEY ("professionalUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "course_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_learnerUserId_fkey" FOREIGN KEY ("learnerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "course_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_attempts" ADD CONSTRAINT "course_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_attempts" ADD CONSTRAINT "course_attempts_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "course_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Dedicated LMS grants only. No credentials, role assignments or clinical grants are changed.
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.read','System permission: course.read') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.edit','System permission: course.edit') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.publish','System permission: course.publish') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.distribute','System permission: course.distribute') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.distribute.municipality','System permission: course.distribute.municipality') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.assign','System permission: course.assign') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.progress.own.read','System permission: course.progress.own.read') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.progress.own.write','System permission: course.progress.own.write') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.progress.unit.read','System permission: course.progress.unit.read') ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'course.progress.municipality.read','System permission: course.progress.municipality.read') ON CONFLICT (key) DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_ADMIN' AND r.system=true AND p.key='course.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_ADMIN' AND r.system=true AND p.key='course.edit' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_ADMIN' AND r.system=true AND p.key='course.publish' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_ADMIN' AND r.system=true AND p.key='course.distribute' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_MANAGER' AND r.system=true AND p.key='course.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_MANAGER' AND r.system=true AND p.key='course.edit' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_MANAGER' AND r.system=true AND p.key='course.publish' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PAP_MANAGER' AND r.system=true AND p.key='course.distribute' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='MUNICIPAL_ADMIN' AND r.system=true AND p.key='course.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='MUNICIPAL_ADMIN' AND r.system=true AND p.key='course.distribute.municipality' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='MUNICIPAL_ADMIN' AND r.system=true AND p.key='course.progress.municipality.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='HEALTH_UNIT_ADMIN' AND r.system=true AND p.key='course.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='HEALTH_UNIT_ADMIN' AND r.system=true AND p.key='course.assign' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='HEALTH_UNIT_ADMIN' AND r.system=true AND p.key='course.progress.unit.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PROFESSIONAL' AND r.system=true AND p.key='course.progress.own.read' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='PROFESSIONAL' AND r.system=true AND p.key='course.progress.own.write' ON CONFLICT DO NOTHING;

-- Published educational content is immutable even for runtime SQL writes.
CREATE FUNCTION pap_course_content_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id text; published timestamptz;
BEGIN
 IF TG_TABLE_NAME='course_versions' THEN
  IF OLD."publishedAt" IS NOT NULL THEN RAISE EXCEPTION 'COURSE_PUBLISHED_IMMUTABLE'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_TABLE_NAME='course_modules' THEN
  IF TG_OP<>'INSERT' THEN version_id=OLD."courseVersionId"; SELECT "publishedAt" INTO published FROM course_versions WHERE id=version_id FOR SHARE; IF published IS NOT NULL THEN RAISE EXCEPTION 'COURSE_PUBLISHED_IMMUTABLE'; END IF; END IF;
  IF TG_OP<>'DELETE' THEN version_id=NEW."courseVersionId"; END IF;
 ELSIF TG_TABLE_NAME='course_lessons' THEN
  IF TG_OP<>'INSERT' THEN SELECT "courseVersionId" INTO version_id FROM course_modules WHERE id=OLD."moduleId"; SELECT "publishedAt" INTO published FROM course_versions WHERE id=version_id FOR SHARE; IF published IS NOT NULL THEN RAISE EXCEPTION 'COURSE_PUBLISHED_IMMUTABLE'; END IF; END IF;
  IF TG_OP<>'DELETE' THEN SELECT "courseVersionId" INTO version_id FROM course_modules WHERE id=NEW."moduleId"; END IF;
 ELSIF TG_TABLE_NAME='course_assessments' THEN
  IF TG_OP<>'INSERT' THEN version_id=OLD."courseVersionId"; SELECT "publishedAt" INTO published FROM course_versions WHERE id=version_id FOR SHARE; IF published IS NOT NULL THEN RAISE EXCEPTION 'COURSE_PUBLISHED_IMMUTABLE'; END IF; END IF;
  IF TG_OP<>'DELETE' THEN version_id=NEW."courseVersionId"; END IF;
 ELSIF TG_TABLE_NAME='course_questions' THEN
  IF TG_OP<>'INSERT' THEN SELECT "courseVersionId" INTO version_id FROM course_assessments WHERE id=OLD."assessmentId"; SELECT "publishedAt" INTO published FROM course_versions WHERE id=version_id FOR SHARE; IF published IS NOT NULL THEN RAISE EXCEPTION 'COURSE_PUBLISHED_IMMUTABLE'; END IF; END IF;
  IF TG_OP<>'DELETE' THEN SELECT "courseVersionId" INTO version_id FROM course_assessments WHERE id=NEW."assessmentId"; END IF;
 END IF;
 SELECT "publishedAt" INTO published FROM course_versions WHERE id=version_id FOR SHARE;
 IF published IS NOT NULL THEN RAISE EXCEPTION 'COURSE_PUBLISHED_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER course_versions_immutable BEFORE UPDATE OR DELETE ON course_versions FOR EACH ROW EXECUTE FUNCTION pap_course_content_immutable();
CREATE TRIGGER course_modules_immutable BEFORE INSERT OR UPDATE OR DELETE ON course_modules FOR EACH ROW EXECUTE FUNCTION pap_course_content_immutable();
CREATE TRIGGER course_lessons_immutable BEFORE INSERT OR UPDATE OR DELETE ON course_lessons FOR EACH ROW EXECUTE FUNCTION pap_course_content_immutable();
CREATE TRIGGER course_assessments_immutable BEFORE INSERT OR UPDATE OR DELETE ON course_assessments FOR EACH ROW EXECUTE FUNCTION pap_course_content_immutable();
CREATE TRIGGER course_questions_immutable BEFORE INSERT OR UPDATE OR DELETE ON course_questions FOR EACH ROW EXECUTE FUNCTION pap_course_content_immutable();
ALTER TABLE course_versions ADD CONSTRAINT course_versions_number CHECK ("versionNo">0 AND revision>0 AND "schemaVersion"=1 AND "estimatedMinutes">0);
ALTER TABLE course_assignments ADD CONSTRAINT course_assignments_obligation CHECK (obligation IN ('REQUIRED','RECOMMENDED','OPTIONAL'));
ALTER TABLE course_assessments ADD CONSTRAINT course_assessments_policy CHECK ("passingScore" BETWEEN 0 AND 100 AND "maxAttempts" BETWEEN 1 AND 5);
ALTER TABLE course_attempts ADD CONSTRAINT course_attempts_score CHECK ("scoreValidated" BETWEEN 0 AND 100 AND "attemptNo">0);

-- Extend the invitation-only constraint without relaxing any invitation payload.
ALTER TABLE user_notifications DROP CONSTRAINT access_notification_kind;
ALTER TABLE user_notifications ADD CONSTRAINT access_notification_kind CHECK (
 (kind IN ('ACCESS_APPROVED','ACCESS_REVOKED','ACCESS_PENDING_DECISION') AND "invitationId" IS NOT NULL AND "courseEnrollmentId" IS NULL AND "coursePublicationId" IS NULL)
 OR (kind='COURSE_RELEASED_TO_UNIT' AND "invitationId" IS NULL AND "courseEnrollmentId" IS NULL AND "coursePublicationId" IS NOT NULL)
 OR (kind IN ('COURSE_ASSIGNED_TO_USER','COURSE_COMPLETED','COURSE_ASSIGNMENT_REVOKED','COURSE_DEADLINE_APPROACHING','COURSE_OVERDUE') AND "invitationId" IS NULL AND "courseEnrollmentId" IS NOT NULL AND "coursePublicationId" IS NULL)
);

ALTER TABLE course_versions ADD CONSTRAINT course_published_hash CHECK (("publishedAt" IS NULL AND "immutableContentHash" IS NULL) OR ("publishedAt" IS NOT NULL AND "immutableContentHash" IS NOT NULL AND "immutableContentHash" ~ '^[a-f0-9]{64}$'));

CREATE UNIQUE INDEX "courses_creationKey_key" ON courses("creationKey");
ALTER TABLE courses ADD CONSTRAINT courses_creation_hash CHECK (("creationKey" IS NULL AND "creationHash" IS NULL) OR ("creationKey" IS NOT NULL AND "creationHash" IS NOT NULL AND "creationHash" ~ '^[a-f0-9]{64}$'));

ALTER TABLE course_versions ADD CONSTRAINT course_versions_locale CHECK (level IN ('INTRODUCTORY','INTERMEDIATE','ADVANCED') AND language='pt-BR');

-- Explicit narrow delegated creation. No activation/manage/delete or clinical grant.
INSERT INTO permissions (id,key,description) VALUES (gen_random_uuid()::text,'organization.municipality.create','Create pending municipalities under an active PAP parent') ON CONFLICT (key) DO NOTHING;
INSERT INTO role_permissions ("roleId","permissionId") SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('PAP_ADMIN','PAP_MANAGER') AND r.system=true AND p.key='organization.municipality.create' ON CONFLICT DO NOTHING;
