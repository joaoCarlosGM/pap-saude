-- Foundation 02.4C
-- Prevent duplicate global role assignments.
--
-- PostgreSQL UNIQUE constraints treat NULL values as distinct, therefore
-- @@unique([userId, roleId, organizationId]) does not prevent multiple rows
-- with the same userId/roleId when organizationId IS NULL.

CREATE UNIQUE INDEX "role_assignments_global_user_role_key"
ON "role_assignments" ("userId", "roleId")
WHERE "organizationId" IS NULL;
