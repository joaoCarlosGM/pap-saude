-- Forward-only. Never reclassify existing APPROVED/ACTIVE organizations or identities.
ALTER TYPE "OrganizationCandidateStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_ACTIVATION';
ALTER TYPE "OrganizationCandidateStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
INSERT INTO "permissions" ("id", "key", "description") VALUES
 (gen_random_uuid()::text, 'organization.activate', 'Activate health units'),
 (gen_random_uuid()::text, 'organization.deactivate', 'Deactivate health units'),
 (gen_random_uuid()::text, 'organization.delete', 'Archive health units with strong confirmation'),
 (gen_random_uuid()::text, 'organization.request.review', 'Review institutional requests without activation'),
 (gen_random_uuid()::text, 'institution.invite', 'Manage scoped institutional invitations'),
 (gen_random_uuid()::text, 'role.assign_commercial', 'Authorize Commercial only')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "roles" ("id", "key", "name", "description", "system", "updatedAt")
VALUES (gen_random_uuid()::text, 'PAP_MANAGER', 'Gerente PAP', 'Delegated institutional governance without clinical access', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE (r."key" = 'PAP_ADMIN' AND p."key" IN ('organization.activate','organization.deactivate','organization.delete','organization.request.review','institution.invite','role.assign_commercial'))
OR (r."key" = 'PAP_MANAGER' AND p."key" IN ('organization.read','organization.request.review','institution.invite','role.assign_commercial'))
ON CONFLICT DO NOTHING;
DELETE FROM "role_permissions" rp USING "roles" r, "permissions" p
WHERE rp."roleId"=r."id" AND rp."permissionId"=p."id" AND r."key"='COMMERCIAL' AND p."key"='organization.read';
