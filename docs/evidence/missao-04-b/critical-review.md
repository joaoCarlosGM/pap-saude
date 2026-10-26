# Diffs sensíveis atuais — complemento final

Base efdbbad14f508139b12abd1a4867c4f97ad1488e. Nenhum hunk omitido. Espaços finais em cercas Markdown normalizados; patch bruto integral em `.test-audit/missao04-b-review.patch`.

### prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql

```diff
diff --git a/prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql b/prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql
new file mode 100644
index 0000000..7cc9c53
--- /dev/null
+++ b/prisma/migrations/20261022040000_mission04_delegated_governance/migration.sql
@@ -0,0 +1,21 @@
+-- Forward-only. Never reclassify existing APPROVED/ACTIVE organizations or identities.
+ALTER TYPE "OrganizationCandidateStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_ACTIVATION';
+ALTER TYPE "OrganizationCandidateStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
+INSERT INTO "permissions" ("id", "key", "description") VALUES
+ (gen_random_uuid()::text, 'organization.activate', 'Activate health units'),
+ (gen_random_uuid()::text, 'organization.deactivate', 'Deactivate health units'),
+ (gen_random_uuid()::text, 'organization.delete', 'Archive health units with strong confirmation'),
+ (gen_random_uuid()::text, 'organization.request.review', 'Review institutional requests without activation'),
+ (gen_random_uuid()::text, 'institution.invite', 'Manage scoped institutional invitations'),
+ (gen_random_uuid()::text, 'role.assign_commercial', 'Authorize Commercial only')
+ON CONFLICT ("key") DO NOTHING;
+INSERT INTO "roles" ("id", "key", "name", "description", "system", "updatedAt")
+VALUES (gen_random_uuid()::text, 'PAP_MANAGER', 'Gerente PAP', 'Delegated institutional governance without clinical access', true, CURRENT_TIMESTAMP)
+ON CONFLICT ("key") DO NOTHING;
+INSERT INTO "role_permissions" ("roleId", "permissionId")
+SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
+WHERE (r."key" = 'PAP_ADMIN' AND p."key" IN ('organization.activate','organization.deactivate','organization.delete','organization.request.review','institution.invite','role.assign_commercial'))
+OR (r."key" = 'PAP_MANAGER' AND p."key" IN ('organization.read','organization.request.review','institution.invite','role.assign_commercial'))
+ON CONFLICT DO NOTHING;
+DELETE FROM "role_permissions" rp USING "roles" r, "permissions" p
+WHERE rp."roleId"=r."id" AND rp."permissionId"=p."id" AND r."key"='COMMERCIAL' AND p."key"='organization.read';
```

### prisma/schema.prisma

```diff
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index abe285e..db465f0 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -60,6 +60,8 @@ enum OnboardingStatus {
 }

 enum OrganizationCandidateStatus {
+  READY_FOR_ACTIVATION
+  CHANGES_REQUESTED
   NEW
   QUALIFYING
   CONTACTED
```

### src/server/iam/permissions.ts

```diff
diff --git a/src/server/iam/permissions.ts b/src/server/iam/permissions.ts
index a94af58..854fb6f 100644
--- a/src/server/iam/permissions.ts
+++ b/src/server/iam/permissions.ts
@@ -2,6 +2,12 @@ export const PERMISSIONS = {
   // Organizations
   ORGANIZATION_READ: "organization.read",
   ORGANIZATION_MANAGE: "organization.manage",
+  ORGANIZATION_ACTIVATE: "organization.activate",
+  ORGANIZATION_DEACTIVATE: "organization.deactivate",
+  ORGANIZATION_DELETE: "organization.delete",
+  ORGANIZATION_REQUEST_REVIEW: "organization.request.review",
+  INSTITUTION_INVITE: "institution.invite",
+  ROLE_ASSIGN_COMMERCIAL: "role.assign_commercial",

   // Memberships
   MEMBERSHIP_READ: "membership.read",
```

### src/server/iam/system-role-catalog.ts

```diff
diff --git a/src/server/iam/system-role-catalog.ts b/src/server/iam/system-role-catalog.ts
index 9fd3a60..a7a624d 100644
--- a/src/server/iam/system-role-catalog.ts
+++ b/src/server/iam/system-role-catalog.ts
@@ -5,6 +5,7 @@ import {

 export const SYSTEM_ROLE_KEYS = {
   PAP_ADMIN: "PAP_ADMIN",
+  PAP_MANAGER: "PAP_MANAGER",
   MUNICIPAL_ADMIN: "MUNICIPAL_ADMIN",
   HEALTH_UNIT_ADMIN: "HEALTH_UNIT_ADMIN",
   PROFESSIONAL: "PROFESSIONAL",
@@ -32,6 +33,12 @@ export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
     permissions: [
       PERMISSIONS.ORGANIZATION_READ,
       PERMISSIONS.ORGANIZATION_MANAGE,
+      PERMISSIONS.ORGANIZATION_ACTIVATE,
+      PERMISSIONS.ORGANIZATION_DEACTIVATE,
+      PERMISSIONS.ORGANIZATION_DELETE,
+      PERMISSIONS.ORGANIZATION_REQUEST_REVIEW,
+      PERMISSIONS.INSTITUTION_INVITE,
+      PERMISSIONS.ROLE_ASSIGN_COMMERCIAL,
       PERMISSIONS.MEMBERSHIP_READ,
       PERMISSIONS.MEMBERSHIP_MANAGE,
       PERMISSIONS.USER_READ,
@@ -54,6 +61,18 @@ export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
     ],
   },

+  {
+    key: SYSTEM_ROLE_KEYS.PAP_MANAGER,
+    name: "Gerente PAP",
+    description: "Institutional review and delegated commercial authorization; no clinical or organization lifecycle access.",
+    scope: "GLOBAL",
+    permissions: [
+      PERMISSIONS.ORGANIZATION_READ,
+      PERMISSIONS.ORGANIZATION_REQUEST_REVIEW,
+      PERMISSIONS.INSTITUTION_INVITE,
+      PERMISSIONS.ROLE_ASSIGN_COMMERCIAL,
+    ],
+  },
   {
     key: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
     name: "Municipal Administrator",
@@ -139,7 +158,6 @@ export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
       "Global PAP commercial role without clinical access.",
     scope: "GLOBAL",
     permissions: [
-      PERMISSIONS.ORGANIZATION_READ,
       PERMISSIONS.COMMERCIAL_READ,
       PERMISSIONS.COMMERCIAL_MANAGE,
     ],
```

### src/server/iam/bootstrap.service.ts
**UNCHANGED**: git diff sem saída; bytes idênticos ao HEAD, SHA-256 `205f51e18d27fb6048fd9f95c6c94633d68511eff224488135857a6910771c14`. Bootstrap consome o catálogo modificado e sincroniza grants, sem provisionar conta/senha/MFA. Conteúdo integral:

```ts
import { db } from "@/server/db/client"

import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "./permissions"

import {
  SYSTEM_ROLES,
} from "./system-role-catalog"

function permissionDescription(
  key: PermissionKey,
) {
  return `System permission: ${key}`
}

export async function bootstrapSystemIam() {
  return db.$transaction(async (tx) => {
    for (const key of ALL_PERMISSION_KEYS) {
      await tx.permission.upsert({
        where: { key },
        create: {
          key,
          description: permissionDescription(key),
        },
        update: {
          description: permissionDescription(key),
        },
      })
    }

    for (const definition of SYSTEM_ROLES) {
      const role = await tx.role.upsert({
        where: {
          key: definition.key,
        },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          system: true,
        },
        update: {
          name: definition.name,
          description: definition.description,
          system: true,
        },
      })

      const desiredPermissions =
        await tx.permission.findMany({
          where: {
            key: {
              in: [...definition.permissions],
            },
          },
          select: {
            id: true,
            key: true,
          },
        })

      if (
        desiredPermissions.length !==
        definition.permissions.length
      ) {
        throw new Error(
          `IAM bootstrap failed for role ${definition.key}: permission catalog mismatch`,
        )
      }

      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: {
            notIn: desiredPermissions.map(
              (permission) => permission.id,
            ),
          },
        },
      })

      await tx.rolePermission.createMany({
        data: desiredPermissions.map(
          (permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          }),
        ),
        skipDuplicates: true,
      })
    }

    return {
      permissions: ALL_PERMISSION_KEYS.length,
      roles: SYSTEM_ROLES.length,
    }
  })
}
```

### src/server/iam/role-assignment.service.ts

```diff
diff --git a/src/server/iam/role-assignment.service.ts b/src/server/iam/role-assignment.service.ts
index 47ff840..033d170 100644
--- a/src/server/iam/role-assignment.service.ts
+++ b/src/server/iam/role-assignment.service.ts
@@ -21,6 +21,7 @@ import {

 const GLOBAL_ROLES = new Set<SystemRoleKey>([
   SYSTEM_ROLE_KEYS.PAP_ADMIN,
+  SYSTEM_ROLE_KEYS.PAP_MANAGER,
   SYSTEM_ROLE_KEYS.COMMERCIAL,
 ])

```

### src/server/admin/admin-roles.service.ts

```diff
diff --git a/src/server/admin/admin-roles.service.ts b/src/server/admin/admin-roles.service.ts
index 2da24a3..30c900b 100644
--- a/src/server/admin/admin-roles.service.ts
+++ b/src/server/admin/admin-roles.service.ts
@@ -1,3 +1,4 @@
+import { requireAdminActor } from "./admin-session.service"
 import {
   MembershipStatus,
   Prisma,
@@ -94,6 +95,57 @@ export async function getAdminRoleOverview(
       actorUserId,
     )

+  if (
+    profile?.permissions.includes(PERMISSIONS.ROLE_ASSIGN_COMMERCIAL) &&
+    !profile.permissions.includes(PERMISSIONS.ROLE_READ)
+  ) {
+    const eligible = {
+      isActive: true,
+      id: { not: actorUserId },
+      roleAssignments: {
+        every: {
+          role: { key: "COMMERCIAL", system: true },
+          organizationId: null,
+        },
+      },
+    };
+    const [assignableUsers, assignments] = await Promise.all([
+      db.user.findMany({
+        where: eligible,
+        select: { id: true, email: true, displayName: true, isActive: true },
+        orderBy: { displayName: "asc" },
+        take: 200,
+      }),
+      db.roleAssignment.findMany({
+        where: {
+          organizationId: null,
+          role: { key: "COMMERCIAL", system: true },
+          user: eligible,
+        },
+        select: {
+          id: true,
+          organizationId: true,
+          user: {
+            select: {
+              id: true,
+              email: true,
+              displayName: true,
+              isActive: true,
+            },
+          },
+          role: { select: { key: true, name: true } },
+          organization: { select: { id: true, name: true, type: true } },
+        },
+      }),
+    ]);
+    return {
+      delegated: true,
+      roles: SYSTEM_ROLES.filter((r) => r.key === "COMMERCIAL"),
+      assignments,
+      assignableUsers,
+      canManage: true,
+    };
+  }
   if (
     !profile ||
     !profile.permissions.includes(
@@ -111,11 +163,7 @@ export async function getAdminRoleOverview(
       access.organizationIds.length ===
         0
     ) {
-      return {
-        roles: [],
-        assignments: [],
-        canManage: false,
-      }
+      throw new AccessDeniedError()
     }
   }

@@ -233,283 +281,194 @@ export async function getAdminRoleOverview(
   }
 }

-export async function createAdminRoleAssignment(
-  input: {
-    actorUserId: string
-    targetUserId: string
-    roleKey: string
-    organizationId?: string | null
-  },
+/** Called inside the mutation transaction: revocation cannot leave a stale authority snapshot. */
+async function requireRoleMutation(
+  actorUserId: string,
+  token: string | undefined,
+  targetUserId: string,
+  roleKey: string,
+  organizationId: string | null | undefined,
+  tx: Prisma.TransactionClient,
 ) {
-  if (
-    !isSystemRoleKey(
-      input.roleKey,
-    )
-  ) {
-    throw new UnsupportedAdminRoleError()
+  await requireAdminActor(actorUserId, token, tx);
+  const profile = await getEffectiveAccessProfile(actorUserId, tx);
+  const full = profile?.roles.some(
+    (r) =>
+      r.key === "PAP_ADMIN" &&
+      r.scope === "GLOBAL" &&
+      r.permissions.includes(PERMISSIONS.ROLE_MANAGE),
+  );
+  if (full) {
+    await requirePermission(
+      {
+        userId: actorUserId,
+        permission: PERMISSIONS.ROLE_MANAGE,
+        organizationId,
+      },
+      tx,
+    );
+    return;
   }
-
-  const definition =
-    getSystemRoleDefinition(
-      input.roleKey,
+  if (
+    roleKey !== "COMMERCIAL" ||
+    organizationId != null ||
+    targetUserId === actorUserId ||
+    !profile?.roles.some(
+      (r) =>
+        r.key === "PAP_MANAGER" &&
+        r.scope === "GLOBAL" &&
+        r.permissions.includes(PERMISSIONS.ROLE_ASSIGN_COMMERCIAL),
     )
+  )
+    throw new AccessDeniedError();
+  // A commercial delegate may never alter an existing privileged account.
+  const privileged = await tx.roleAssignment.count({
+    where: {
+      userId: targetUserId,
+      OR: [
+        { organizationId: { not: null } },
+        { role: { key: { not: "COMMERCIAL" } } },
+        { role: { system: false } },
+      ],
+    },
+  });
+  if (privileged) throw new AccessDeniedError();
+}

-  if (!definition) {
-    throw new UnsupportedAdminRoleError()
-  }
-
+export async function createAdminRoleAssignment(input: {
+  actorUserId: string;
+  actorSessionToken?: string;
+  targetUserId: string;
+  roleKey: string;
+  organizationId?: string | null;
+}) {
+  if (!isSystemRoleKey(input.roleKey)) throw new UnsupportedAdminRoleError();
+  const definition = getSystemRoleDefinition(input.roleKey)!;
   if (
-    definition.scope ===
-    "GLOBAL"
-  ) {
-    await requirePermission({
-      userId:
-        input.actorUserId,
-
-      permission:
-        PERMISSIONS.ROLE_MANAGE,
-    })
-
-    if (
-      input.organizationId !=
-      null
-    ) {
-      throw new UnsupportedAdminRoleError()
-    }
-  } else {
-    if (
-      !input.organizationId
-    ) {
-      throw new UnsupportedAdminRoleError()
-    }
-
-    await requirePermission({
-      userId:
-        input.actorUserId,
-
-      permission:
-        PERMISSIONS.ROLE_MANAGE,
-
-      organizationId:
-        input.organizationId,
-    })
-  }
-
-  return roleMutationTransaction(
-    async (tx) => {
-      const targetUser =
-        await tx.user.findUnique({
-          where: { id: input.targetUserId },
-          select: { id: true, isActive: true },
-        })
-
-      if (!targetUser?.isActive) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      if (definition.scope !== "GLOBAL") {
-        const membership =
-          await tx.membership.findUnique({
-            where: {
-              userId_organizationId: {
-                userId: input.targetUserId,
-                organizationId: input.organizationId!,
-              },
-            },
-            select: { status: true },
-          })
-
-        if (membership?.status !== MembershipStatus.ACTIVE) {
-          throw new UnsupportedAdminRoleError()
-        }
-      }
-
-      const role = await tx.role.findUnique({
-        where: { key: input.roleKey },
-        select: { id: true },
-      })
-
-      // assignSystemRole remains the canonical scope/type validator.
-      if (!role) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      const existing = await tx.roleAssignment.findFirst({
+    (definition.scope === "GLOBAL" && input.organizationId != null) ||
+    (definition.scope !== "GLOBAL" && !input.organizationId)
+  )
+    throw new UnsupportedAdminRoleError();
+  return roleMutationTransaction(async (tx) => {
+    await requireRoleMutation(
+      input.actorUserId,
+      input.actorSessionToken,
+      input.targetUserId,
+      input.roleKey,
+      input.organizationId,
+      tx,
+    );
+    const target = await tx.user.findUnique({
+      where: { id: input.targetUserId },
+      select: { isActive: true },
+    });
+    if (!target?.isActive) throw new UnsupportedAdminRoleError();
+    if (definition.scope !== "GLOBAL") {
+      const member = await tx.membership.findUnique({
         where: {
-          userId: input.targetUserId,
-          roleId: role.id,
-          organizationId: input.organizationId ?? null,
-        },
-        select: { id: true },
-      })
-
-      const assignment = await assignSystemRole(
-        {
-          userId: input.targetUserId,
-          roleKey: input.roleKey as SystemRoleKey,
-          organizationId: input.organizationId,
-        },
-        tx,
-      )
-
-      // Idempotent assignments should not generate false audit events.
-      if (!existing) {
-        await tx.auditEvent.create({
-          data: {
-            actorUserId: input.actorUserId,
-            organizationId: assignment.organizationId,
-            action: "ROLE_ASSIGNED",
-            resourceType: "ROLE_ASSIGNMENT",
-            resourceId: assignment.id,
-            after: {
-              targetUserId: input.targetUserId,
-              roleKey: input.roleKey,
-              organizationId: assignment.organizationId,
-            },
+          userId_organizationId: {
+            userId: input.targetUserId,
+            organizationId: input.organizationId!,
           },
-        })
-      }
-
-      return assignment
-    },
-  )
-}
-
-export async function revokeAdminRoleAssignment(
-  input: {
-    actorUserId: string
-    assignmentId: string
-  },
-) {
-  const assignment =
-    await db.roleAssignment.findUnique({
+        },
+      });
+      if (member?.status !== MembershipStatus.ACTIVE)
+        throw new UnsupportedAdminRoleError();
+    }
+    const role = await tx.role.findUnique({ where: { key: input.roleKey } });
+    if (!role) throw new UnsupportedAdminRoleError();
+    const existing = await tx.roleAssignment.findFirst({
       where: {
-        id:
-          input.assignmentId,
+        userId: input.targetUserId,
+        roleId: role.id,
+        organizationId: input.organizationId ?? null,
       },
-
-      include: {
-        user: {
-          select: {
-            id: true,
-            isActive: true,
-          },
-        },
-
-        role: true,
-
-        organization: {
-          select: {
-            id: true,
-          },
-        },
+    });
+    const assignment = await assignSystemRole(
+      {
+        userId: input.targetUserId,
+        roleKey: input.roleKey as SystemRoleKey,
+        organizationId: input.organizationId,
       },
-    })
-
-  if (
-    !assignment
-  ) {
-    throw new AdminRoleAssignmentNotFoundError()
-  }
-
-  const definition =
-    getSystemRoleDefinition(
-      assignment.role.key,
-    )
-
-  if (!definition) {
-    throw new UnsupportedAdminRoleError()
-  }
-
-  try {
-    if (definition.scope === "GLOBAL") {
-      await requirePermission({
-        userId: input.actorUserId,
-        permission: PERMISSIONS.ROLE_MANAGE,
-      })
-    } else {
-      if (!assignment.organizationId) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      await requirePermission({
-        userId: input.actorUserId,
-        permission: PERMISSIONS.ROLE_MANAGE,
-        organizationId: assignment.organizationId,
-      })
-    }
-  } catch (error) {
-    if (error instanceof AccessDeniedError) {
-      // A foreign assignment must not be distinguishable from a missing one.
-      throw new AdminRoleAssignmentNotFoundError()
-    }
-    throw error
-  }
-
-  return roleMutationTransaction(
-    async (tx) => {
-      const current = await tx.roleAssignment.findUnique({
-        where: { id: assignment.id },
-        include: {
-          user: { select: { id: true, isActive: true } },
-          role: { select: { key: true } },
-        },
-      })
-
-      if (!current) {
-        throw new AdminRoleAssignmentNotFoundError()
-      }
-
-      // Block any role/key substitution between authorization and delete.
-      if (
-        current.role.key !== assignment.role.key ||
-        current.organizationId !== assignment.organizationId ||
-        current.userId !== assignment.userId
-      ) {
-        throw new UnsupportedAdminRoleError()
-      }
-
-      if (
-        current.role.key === SYSTEM_ROLE_KEYS.PAP_ADMIN &&
-        current.user.isActive
-      ) {
-        const activePapAdmins = await tx.roleAssignment.count({
-          where: {
-            organizationId: null,
-            role: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN },
-            user: { isActive: true },
-          },
-        })
-
-        if (activePapAdmins <= 1) {
-          throw new LastPapAdminError()
-        }
-      }
-
-      const deleted = await tx.roleAssignment.deleteMany({
-        where: { id: current.id },
-      })
-
-      if (deleted.count !== 1) {
-        throw new AdminRoleAssignmentNotFoundError()
-      }
-
+      tx,
+    );
+    if (!existing)
       await tx.auditEvent.create({
         data: {
           actorUserId: input.actorUserId,
-          organizationId: current.organizationId,
-          action: "ROLE_REVOKED",
+          organizationId: assignment.organizationId,
+          action: "ROLE_ASSIGNED",
           resourceType: "ROLE_ASSIGNMENT",
-          resourceId: current.id,
-          before: {
-            targetUserId: current.userId,
-            roleKey: current.role.key,
-            organizationId: current.organizationId,
+          resourceId: assignment.id,
+          after: {
+            targetUserId: input.targetUserId,
+            roleKey: input.roleKey,
+            organizationId: assignment.organizationId,
           },
         },
-      })
+      });
+    return assignment;
+  });
+}

-      return { revoked: true, assignmentId: current.id }
-    },
-  )
+export async function revokeAdminRoleAssignment(input: {
+  actorUserId: string;
+  actorSessionToken?: string;
+  assignmentId: string;
+}) {
+  return roleMutationTransaction(async (tx) => {
+    const current = await tx.roleAssignment.findUnique({
+      where: { id: input.assignmentId },
+      include: { role: true, user: true },
+    });
+    if (!current) throw new AdminRoleAssignmentNotFoundError();
+    if (!getSystemRoleDefinition(current.role.key))
+      throw new UnsupportedAdminRoleError();
+    try {
+      await requireRoleMutation(
+        input.actorUserId,
+        input.actorSessionToken,
+        current.userId,
+        current.role.key,
+        current.organizationId,
+        tx,
+      );
+    } catch (error) {
+      if (error instanceof AccessDeniedError)
+        throw new AdminRoleAssignmentNotFoundError();
+      throw error;
+    }
+    if (
+      current.role.key === SYSTEM_ROLE_KEYS.PAP_ADMIN &&
+      current.user.isActive
+    ) {
+      const count = await tx.roleAssignment.count({
+        where: {
+          organizationId: null,
+          role: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN },
+          user: { isActive: true },
+        },
+      });
+      if (count <= 1) throw new LastPapAdminError();
+    }
+    const deleted = await tx.roleAssignment.deleteMany({
+      where: { id: current.id },
+    });
+    if (deleted.count !== 1) throw new AdminRoleAssignmentNotFoundError();
+    await tx.auditEvent.create({
+      data: {
+        actorUserId: input.actorUserId,
+        organizationId: current.organizationId,
+        action: "ROLE_REVOKED",
+        resourceType: "ROLE_ASSIGNMENT",
+        resourceId: current.id,
+        before: {
+          targetUserId: current.userId,
+          roleKey: current.role.key,
+          organizationId: current.organizationId,
+        },
+      },
+    });
+    return { revoked: true, assignmentId: current.id };
+  });
 }
```

### src/server/admin/admin-session.service.ts

```diff
diff --git a/src/server/admin/admin-session.service.ts b/src/server/admin/admin-session.service.ts
new file mode 100644
index 0000000..49e3e74
--- /dev/null
+++ b/src/server/admin/admin-session.service.ts
@@ -0,0 +1,38 @@
+import type { Prisma } from "@prisma/client";
+import { db } from "@/server/db/client";
+import { validateSession } from "@/server/auth/session.service";
+import { InvalidSessionError } from "@/server/auth/session.errors";
+
+export class AdminMfaRequiredError extends Error {
+  constructor() {
+    super("ADMIN_MFA_REQUIRED");
+  }
+}
+/** Proof belongs to this exact live session, never another session of the actor. */
+export async function requireAdminActor(
+  userId: string,
+  token?: string,
+  client: Prisma.TransactionClient = db,
+) {
+  if (!token) throw new AdminMfaRequiredError();
+  const result = await validateSession(token, {
+    updateLastSeen: false,
+    client,
+  });
+  if (result.user.id !== userId) throw new InvalidSessionError();
+  const verified = result.session.mfaVerifiedAt;
+  const factor = await client.mfaFactor.findFirst({
+    where: { userId, type: "TOTP", status: "ACTIVE" },
+    orderBy: { enabledAt: "desc" },
+    select: { enabledAt: true },
+  });
+  if (
+    !verified ||
+    !factor?.enabledAt ||
+    verified < factor.enabledAt ||
+    verified < result.session.createdAt ||
+    verified > new Date()
+  )
+    throw new AdminMfaRequiredError();
+  return result;
+}
```

### src/server/admin/admin-http.ts

```diff
diff --git a/src/server/admin/admin-http.ts b/src/server/admin/admin-http.ts
index bc1636c..5fa585d 100644
--- a/src/server/admin/admin-http.ts
+++ b/src/server/admin/admin-http.ts
@@ -1,3 +1,4 @@
+import { AccountSecurityError } from "@/server/auth/account-security.service"
 import {
   NextRequest,
   NextResponse,
@@ -52,39 +53,17 @@ import {
   OrganizationAlreadyArchivedError,
 } from "@/server/organizations/organization.errors"

-import { db } from "@/server/db/client"
-
-export class AdminMfaRequiredError extends Error {
-  constructor() { super("ADMIN_MFA_REQUIRED") }
-}
-
-const MAX_ADMIN_BODY_BYTES =
-  32 * 1024
-
-export async function requireAdminSession(
-  request: NextRequest,
-) {
-  const token =
-    readSessionToken(
-      request,
-    )
-
-  if (!token) {
-    throw new InvalidSessionError()
-  }
-
-  const result = await validateSession(token)
-  const verifiedAt = result.session.mfaVerifiedAt
-  const factor = await db.mfaFactor.findFirst({
-    where: { userId: result.user.id, type: "TOTP", status: "ACTIVE" },
-    orderBy: { enabledAt: "desc" },
-    select: { enabledAt: true },
-  })
-  if (!verifiedAt || !factor?.enabledAt || factor.enabledAt > verifiedAt ||
-      verifiedAt < result.session.createdAt || verifiedAt > new Date()) {
-    throw new AdminMfaRequiredError()
-  }
-  return result
+import {
+  requireAdminActor,
+  AdminMfaRequiredError,
+} from "./admin-session.service";
+export { AdminMfaRequiredError } from "./admin-session.service";
+const MAX_ADMIN_BODY_BYTES = 32 * 1024;
+export async function requireAdminSession(request: NextRequest) {
+  const token = readSessionToken(request);
+  if (!token) throw new InvalidSessionError();
+  const { user } = await validateSession(token);
+  return requireAdminActor(user.id, token);
 }

 export async function readAdminJson(
@@ -191,6 +170,9 @@ function noStoreHeaders() {
 export function adminErrorResponse(
   error: unknown,
 ) {
+  if (error instanceof AccountSecurityError) {
+    return NextResponse.json({ error: error.message }, { status: error.message === "REAUTH_THROTTLED" ? 429 : 403, headers: noStoreHeaders() })
+  }
   if (error instanceof AdminMfaRequiredError) {
     return NextResponse.json({ error: "ADMIN_MFA_REQUIRED" }, {
       status: 403, headers: noStoreHeaders(),
```

### src/server/auth/session.service.ts

```diff
diff --git a/src/server/auth/session.service.ts b/src/server/auth/session.service.ts
index 567a4d1..0989c09 100644
--- a/src/server/auth/session.service.ts
+++ b/src/server/auth/session.service.ts
@@ -1,5 +1,6 @@
 import {
   SessionRevocationReason,
+  type Prisma,
   type Session,
   type User,
 } from "@prisma/client";
@@ -40,6 +41,7 @@ export interface ValidatedSession {
 export interface ValidateSessionOptions {
   now?: Date;
   updateLastSeen?: boolean;
+  client?: Prisma.TransactionClient;
 }

 function addSeconds(date: Date, seconds: number): Date {
@@ -84,8 +86,9 @@ export async function validateSession(
   }

   const now = options.now ?? new Date();
+  const client = options.client ?? db;

-  const result = await db.session.findUnique({
+  const result = await client.session.findUnique({
     where: {
       tokenHash: hashSessionToken(token),
     },
@@ -116,7 +119,7 @@ export async function validateSession(
     options.updateLastSeen !== false &&
     shouldUpdateLastSeen(result.lastSeenAt, now)
   ) {
-    session = await db.session.update({
+    session = await client.session.update({
       where: {
         id: result.id,
       },
```

### src/server/iam/authorization.service.ts

```diff
diff --git a/src/server/iam/authorization.service.ts b/src/server/iam/authorization.service.ts
index 3980189..890c8ec 100644
--- a/src/server/iam/authorization.service.ts
+++ b/src/server/iam/authorization.service.ts
@@ -1,4 +1,5 @@
 import {
+  type Prisma,
   MembershipStatus,
   OrganizationStatus,
   OrganizationType,
@@ -93,8 +94,9 @@ function allowsTarget(input: {

 export async function authorize(
   input: AuthorizationInput,
+  client: Prisma.TransactionClient = db,
 ): Promise<AuthorizationDecision> {
-  const user = await db.user.findUnique({
+  const user = await client.user.findUnique({
     where: {
       id: input.userId,
     },
@@ -113,7 +115,7 @@ export async function authorize(

   const targetOrganization =
     input.organizationId
-      ? await db.organization.findUnique({
+      ? await client.organization.findUnique({
           where: {
             id: input.organizationId,
           },
@@ -142,7 +144,7 @@ export async function authorize(
   }

   const assignments =
-    await db.roleAssignment.findMany({
+    await client.roleAssignment.findMany({
       where: {
         userId: input.userId,
         role: {
@@ -226,7 +228,7 @@ export async function authorize(
       }

       const membership =
-        await db.membership.findUnique({
+        await client.membership.findUnique({
           where: {
             userId_organizationId: {
               userId: input.userId,
@@ -295,9 +297,10 @@ export async function authorize(

 export async function requirePermission(
   input: AuthorizationInput,
+  client: Prisma.TransactionClient = db,
 ) {
   const decision =
-    await authorize(input)
+    await authorize(input, client)

   if (!decision.allowed) {
     throw new AccessDeniedError()
```

### src/server/iam/effective-access-profile.service.ts

```diff
diff --git a/src/server/iam/effective-access-profile.service.ts b/src/server/iam/effective-access-profile.service.ts
index 5a3e765..07acb1f 100644
--- a/src/server/iam/effective-access-profile.service.ts
+++ b/src/server/iam/effective-access-profile.service.ts
@@ -9,6 +9,7 @@ import type {
   EffectiveAccessRole,
 } from "@/lib/admin/types"

+import type { Prisma } from "@prisma/client"
 import { db } from "@/server/db/client"

 import {
@@ -29,7 +30,6 @@ const ADMIN_ENTRY_PERMISSIONS =
     PERMISSIONS.USER_SECURITY_MANAGE,
     PERMISSIONS.MFA_RESET,
     PERMISSIONS.AUDIT_READ,
-    PERMISSIONS.COMMERCIAL_READ,
     PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
     PERMISSIONS.FEEDBACK_READ,
     PERMISSIONS.RNDS_INTEGRATION_READ,
@@ -60,9 +60,10 @@ function compareOrganizations(

 export async function getEffectiveAccessProfile(
   userId: string,
+  client: Prisma.TransactionClient = db,
 ): Promise<EffectiveAccessProfile | null> {
   const user =
-    await db.user.findUnique({
+    await client.user.findUnique({
       where: {
         id: userId,
       },
```

### src/server/admin/admin-access.service.ts

```diff
diff --git a/src/server/admin/admin-access.service.ts b/src/server/admin/admin-access.service.ts
index 2b2e53a..418289e 100644
--- a/src/server/admin/admin-access.service.ts
+++ b/src/server/admin/admin-access.service.ts
@@ -1,3 +1,5 @@
+import type { Prisma } from "@prisma/client"
+import type { EffectiveAccessProfile } from "@/lib/admin/types"
 import type {
   PermissionKey,
 } from "@/server/iam/permissions"
@@ -22,6 +24,7 @@ export async function requireAdminOrganizationAccess(
   userId: string,
   permission: PermissionKey,
   organizationId: string,
+  client: Prisma.TransactionClient = db,
 ) {
   const [
     profile,
@@ -29,10 +32,10 @@ export async function requireAdminOrganizationAccess(
   ] =
     await Promise.all([
       getEffectiveAccessProfile(
-        userId,
+        userId, client,
       ),

-      db.organization.findUnique({
+      client.organization.findUnique({
         where: {
           id:
             organizationId,
@@ -122,16 +125,17 @@ export async function hasGlobalAdminPermission(
 export async function listAccessibleOrganizationIds(
   userId: string,
   permission: PermissionKey,
+  effectiveProfile?: EffectiveAccessProfile,
 ): Promise<{
   global: boolean
   organizationIds: string[]
 }> {
-  const profile =
+  const profile = effectiveProfile ??
     await getEffectiveAccessProfile(
       userId,
     )

-  if (!profile) {
+  if (!profile || profile.user.id !== userId) {
     throw new AccessDeniedError()
   }

```

### src/server/admin/admin-organizations.service.ts

```diff
diff --git a/src/server/admin/admin-organizations.service.ts b/src/server/admin/admin-organizations.service.ts
index cd4865d..ca2945d 100644
--- a/src/server/admin/admin-organizations.service.ts
+++ b/src/server/admin/admin-organizations.service.ts
@@ -1,7 +1,13 @@
+import { requireAdminActor } from "./admin-session.service";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import {
+  requireReauthentication,
+  AccountSecurityError,
+} from "@/server/auth/account-security.service";
+import { serializable } from "@/server/admin-beta/policy";
 import {
   OrganizationStatus,
   OrganizationType,
-  Prisma,
 } from "@prisma/client"

 import {
@@ -34,10 +40,13 @@ import {
 export async function listAdminOrganizations(
   userId: string,
 ) {
+  const profile = await getEffectiveAccessProfile(userId)
+  if (!profile) throw new AccessDeniedError()
   const access =
     await listAccessibleOrganizationIds(
       userId,
       PERMISSIONS.ORGANIZATION_READ,
+      profile,
     )

   if (
@@ -45,9 +54,15 @@ export async function listAdminOrganizations(
     access.organizationIds.length ===
       0
   ) {
-    return []
+    throw new AccessDeniedError()
   }

+  // Scope and projection must use the same profile: revocation between reads
+  // must never turn a global delegated directory into a private-field response.
+  // Global directory access delegates institutional metadata, never private configuration.
+  const delegatedDirectory = profile.roles.some(r => r.key === "PAP_MANAGER") &&
+    !profile.roles.some(r => r.key === "PAP_ADMIN" && r.scope === "GLOBAL")
+  const canSeeClinicalCounts = profile?.permissions.includes(PERMISSIONS.ORGANIZATION_ANALYTICS_READ) ?? false
   return db.organization.findMany({
     where:
       access.global
@@ -59,7 +74,22 @@ export async function listAdminOrganizations(
             },
           },

-    include: {
+    select: {
+      id: true,
+      name: true,
+      type: true,
+      status: true,
+      isActive: true,
+      parentId: true,
+      city: true,
+      state: true,
+      code: !delegatedDirectory,
+      cnes: !delegatedDirectory,
+      cnpj: !delegatedDirectory,
+      address: !delegatedDirectory,
+      createdAt: !delegatedDirectory,
+      updatedAt: !delegatedDirectory,
+      // settings is deliberately absent for every role: this is a directory DTO.
       parent: {
         select: {
           id: true,
@@ -71,9 +101,9 @@ export async function listAdminOrganizations(
       _count: {
         select: {
           children: true,
-          memberships: true,
-          patientLinks: true,
-          encounters: true,
+          memberships: !delegatedDirectory,
+          patientLinks: !delegatedDirectory && canSeeClinicalCounts,
+          encounters: !delegatedDirectory && canSeeClinicalCounts,
         },
       },
     },
@@ -104,7 +134,9 @@ export async function createAdminOrganization(
     state?: string | null
     address?: string | null
   },
+  actorSessionToken?: string,
 ) {
+  await requireAdminActor(userId, actorSessionToken)
   if (
     input.type !==
       OrganizationType.MUNICIPALITY &&
@@ -120,7 +152,9 @@ export async function createAdminOrganization(
     input.parentId,
   )

-  return db.$transaction(async tx => {
+  return serializable(async tx => {
+    await requireAdminActor(userId, actorSessionToken, tx)
+    await requireAdminOrganizationAccess(userId, PERMISSIONS.ORGANIZATION_MANAGE, input.parentId, tx)
     const organization = await createOrganization({
     type:
       input.type,
@@ -169,61 +203,188 @@ export async function mutateAdminOrganization(
   organizationId: string,
   input:
     | {
-        operation:
-          "ACTIVATE"
+        operation: "ACTIVATE";
       }
     | {
-        operation:
-          "SUSPEND"
+        operation: "SUSPEND";
       }
     | {
-        operation:
-          "ARCHIVE"
+        operation: "ARCHIVE";
+        confirmationName?: string;
+        password?: string;
+        code?: string;
       }
     | {
-        operation:
-          "UPDATE"
-        name?: string
-        code?: string | null
-        cnes?: string | null
-        cnpj?: string | null
-        city?: string | null
-        state?: string | null
-        address?: string | null
+        operation: "UPDATE";
+        name?: string;
+        code?: string | null;
+        cnes?: string | null;
+        cnpj?: string | null;
+        city?: string | null;
+        state?: string | null;
+        address?: string | null;
       },
+  actorSessionToken?: string,
 ) {
+  await requireAdminActor(userId, actorSessionToken);
   await requireAdminOrganizationAccess(
     userId,
     PERMISSIONS.ORGANIZATION_MANAGE,
     organizationId,
-  )
+  );

-  return db.$transaction(async tx => {
-    const before = await tx.organization.findUnique({ where: { id: organizationId } });
+  if (input.operation !== "UPDATE") {
+    const profile = await getEffectiveAccessProfile(userId);
+    const target = await db.organization.findUnique({
+      where: { id: organizationId },
+    });
+    const permission =
+      input.operation === "ACTIVATE"
+        ? PERMISSIONS.ORGANIZATION_ACTIVATE
+        : input.operation === "SUSPEND"
+          ? PERMISSIONS.ORGANIZATION_DEACTIVATE
+          : PERMISSIONS.ORGANIZATION_DELETE;
+    if (
+      target?.type === "HEALTH_UNIT" &&
+      !profile?.roles.some(
+        (r) =>
+          r.key === "PAP_ADMIN" &&
+          r.scope === "GLOBAL" &&
+          r.permissions.includes(permission),
+      )
+    )
+      throw new AccessDeniedError();
+    if (input.operation === "ARCHIVE") {
+      if (
+        !target ||
+        input.confirmationName !== target.name ||
+        typeof input.password !== "string" ||
+        typeof input.code !== "string"
+      )
+        throw new AccountSecurityError("STRONG_CONFIRMATION_REQUIRED");
+      await requireReauthentication(userId, input.password, input.code);
+    }
+  }
+  return serializable(async (tx) => {
+    await requireAdminActor(userId, actorSessionToken, tx);
+    const { profile, organization } = await requireAdminOrganizationAccess(
+      userId,
+      PERMISSIONS.ORGANIZATION_MANAGE,
+      organizationId,
+      tx,
+    );
+    if (input.operation !== "UPDATE") {
+      const permission =
+        input.operation === "ACTIVATE"
+          ? PERMISSIONS.ORGANIZATION_ACTIVATE
+          : input.operation === "SUSPEND"
+            ? PERMISSIONS.ORGANIZATION_DEACTIVATE
+            : PERMISSIONS.ORGANIZATION_DELETE;
+      if (
+        organization.type === "HEALTH_UNIT" &&
+        !profile.roles.some(
+          (r) =>
+            r.key === "PAP_ADMIN" &&
+            r.scope === "GLOBAL" &&
+            r.permissions.includes(permission),
+        )
+      )
+        throw new AccessDeniedError();
+      if (
+        input.operation === "ARCHIVE" &&
+        input.confirmationName !== organization.name
+      )
+        throw new AccountSecurityError("STRONG_CONFIRMATION_REQUIRED");
+    }
+    const before = await tx.organization.findUnique({
+      where: { id: organizationId },
+    });
     if (!before) throw new AccessDeniedError();
     let after;
     switch (input.operation) {
-      case "ACTIVATE": after = await activateOrganization(organizationId, tx); break;
-      case "SUSPEND": after = await suspendOrganization(organizationId, tx); break;
-      case "ARCHIVE": after = await archiveOrganization(organizationId, tx); break;
+      case "ACTIVATE": {
+        const candidate = await tx.organizationCandidate.findFirst({
+          where: {
+            convertedOrganizationId: organizationId,
+            consentedAt: { not: null },
+          },
+        });
+        if (
+          candidate &&
+          !["READY_FOR_ACTIVATION", "APPROVED"].includes(candidate.status)
+        )
+          throw new AccessDeniedError();
+        after = await activateOrganization(organizationId, tx);
+        if (candidate?.status === "READY_FOR_ACTIVATION") {
+          const activated = await tx.organizationCandidate.update({
+            where: { id: candidate.id },
+            data: { status: "APPROVED" },
+          });
+          await tx.organizationRequest.updateMany({
+            where: { candidateId: candidate.id, status: "REQUESTED" },
+            data: { status: "RESOLVED" },
+          });
+          await writeAdminAudit(
+            {
+              actorUserId: userId,
+              organizationId,
+              action: "REQUEST_ACTIVATED",
+              resourceType: "ORGANIZATION_REQUEST",
+              resourceId: candidate.id,
+              before: candidate,
+              after: activated,
+            },
+            tx,
+          );
+        }
+        break;
+      }
+      case "SUSPEND":
+        after = await suspendOrganization(organizationId, tx);
+        break;
+      case "ARCHIVE":
+        after = await archiveOrganization(organizationId, tx);
+        break;
       case "UPDATE":
-        after = await updateOrganizationDetails(organizationId, {
-          name: input.name, code: input.code, cnes: input.cnes, cnpj: input.cnpj,
-          city: input.city, state: input.state, address: input.address,
-        }, tx);
+        after = await updateOrganizationDetails(
+          organizationId,
+          {
+            name: input.name,
+            code: input.code,
+            cnes: input.cnes,
+            cnpj: input.cnpj,
+            city: input.city,
+            state: input.state,
+            address: input.address,
+          },
+          tx,
+        );
         break;
     }
-    if (JSON.stringify(projectAdminSnapshot("ORGANIZATION", before)) !==
-        JSON.stringify(projectAdminSnapshot("ORGANIZATION", after))) {
-      await writeAdminAudit({
-        actorUserId: userId, organizationId,
-        action: input.operation === "UPDATE" ? "ORGANIZATION_UPDATED" :
-          input.operation === "ACTIVATE" ? "ORGANIZATION_ACTIVATED" :
-          input.operation === "SUSPEND" ? "ORGANIZATION_SUSPENDED" : "ORGANIZATION_ARCHIVED",
-        resourceType: "ORGANIZATION", resourceId: organizationId,
-        before, after,
-      }, tx);
+    if (
+      JSON.stringify(projectAdminSnapshot("ORGANIZATION", before)) !==
+      JSON.stringify(projectAdminSnapshot("ORGANIZATION", after))
+    ) {
+      await writeAdminAudit(
+        {
+          actorUserId: userId,
+          organizationId,
+          action:
+            input.operation === "UPDATE"
+              ? "ORGANIZATION_UPDATED"
+              : input.operation === "ACTIVATE"
+                ? "ORGANIZATION_ACTIVATED"
+                : input.operation === "SUSPEND"
+                  ? "ORGANIZATION_SUSPENDED"
+                  : "ORGANIZATION_ARCHIVED",
+          resourceType: "ORGANIZATION",
+          resourceId: organizationId,
+          before,
+          after,
+        },
+        tx,
+      );
     }
     return after;
-  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
+  });
 }
```

### src/server/admin-beta/policy.ts

```diff
diff --git a/src/server/admin-beta/policy.ts b/src/server/admin-beta/policy.ts
index fa6d0f7..586cb4e 100644
--- a/src/server/admin-beta/policy.ts
+++ b/src/server/admin-beta/policy.ts
@@ -29,14 +29,14 @@ export function uuid(value: unknown) {
     return invalid();
   return value;
 }
-export async function requirePapReviewer(userId: string) {
-  const profile = await getEffectiveAccessProfile(userId);
+export async function requirePapReviewer(userId: string, client: Prisma.TransactionClient = db) {
+  const profile = await getEffectiveAccessProfile(userId, client);
   if (
     !profile?.roles.some(
       (r) =>
-        r.key === "PAP_ADMIN" &&
+        ["PAP_ADMIN", "PAP_MANAGER"].includes(r.key) &&
         r.scope === "GLOBAL" &&
-        r.permissions.includes("organization.manage"),
+        r.permissions.includes("organization.request.review"),
     )
   )
     throw new AccessDeniedError();
```

### src/server/admin-beta/requests.service.ts

```diff
diff --git a/src/server/admin-beta/requests.service.ts b/src/server/admin-beta/requests.service.ts
index 3ea1243..d80e987 100644
--- a/src/server/admin-beta/requests.service.ts
+++ b/src/server/admin-beta/requests.service.ts
@@ -1,3 +1,5 @@
+import { requireAdminActor } from "@/server/admin/admin-session.service";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
 import { createHash } from "node:crypto";
 import { Prisma } from "@prisma/client";
 import { db } from "@/server/db/client";
@@ -134,12 +136,19 @@ export async function listBetaRequests(
     !Number.isInteger(page) ||
     page < 1 ||
     page > 10000 ||
-    (status && !["NEW", "APPROVED", "REJECTED"].includes(status))
+    (status &&
+      ![
+        "NEW",
+        "CHANGES_REQUESTED",
+        "READY_FOR_ACTIVATION",
+        "APPROVED",
+        "REJECTED",
+      ].includes(status))
   )
     invalid();
   const where: Prisma.OrganizationCandidateWhereInput = {
     consentedAt: { not: null },
-    status: status as "NEW" | "APPROVED" | "REJECTED" | undefined,
+    status: status as Prisma.EnumOrganizationCandidateStatusFilter["equals"],
     ...(query
       ? { name: { contains: text(query, 100, 1), mode: "insensitive" } }
       : {}),
@@ -153,19 +162,37 @@ export async function listBetaRequests(
     }),
     db.organizationCandidate.count({ where }),
   ]);
-  return { rows, total, page, pageSize: 20 };
+  const profile = await getEffectiveAccessProfile(userId);
+  return {
+    rows,
+    total,
+    page,
+    pageSize: 20,
+    canActivate:
+      profile?.roles.some(
+        (r) =>
+          r.key === "PAP_ADMIN" &&
+          r.scope === "GLOBAL" &&
+          r.permissions.includes("organization.activate"),
+      ) ?? false,
+  };
 }
 export async function reviewBetaRequest(
   userId: string,
   body: Record<string, unknown>,
+  actorSessionToken?: string,
 ) {
+  await requireAdminActor(userId, actorSessionToken);
   await requirePapReviewer(userId);
   const id = uuid(body.id),
     reason = text(body.reason, 500, 5);
-  if (body.decision !== "APPROVE" && body.decision !== "REJECT") invalid();
-  return db.$transaction(async (tx) => {
+  if (!["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(String(body.decision)))
+    invalid();
+  return serializable(async (tx) => {
+    await requireAdminActor(userId, actorSessionToken, tx);
+    await requirePapReviewer(userId, tx);
     const claim = await tx.organizationCandidate.updateMany({
-      where: { id, status: "NEW" },
+      where: { id, status: { in: ["NEW", "CHANGES_REQUESTED"] } },
       data: { updatedAt: new Date() },
     });
     void claim;
@@ -173,10 +200,10 @@ export async function reviewBetaRequest(
       where: { id },
     });
     if (!candidate?.consentedAt) invalid();
-    if (candidate.status !== "NEW") {
+    if (!["NEW", "CHANGES_REQUESTED"].includes(candidate.status)) {
       if (
         candidate.status ===
-          (body.decision === "APPROVE" ? "APPROVED" : "REJECTED") &&
+          (body.decision === "APPROVE" ? "READY_FOR_ACTIVATION" : "REJECTED") &&
         (!body.municipalityId ||
           (candidate.convertedOrganizationId &&
             (
@@ -213,7 +240,7 @@ export async function reviewBetaRequest(
       const organization = await createOrganization(
         {
           type: "HEALTH_UNIT",
-          status: "ACTIVE",
+          status: "PENDING_VERIFICATION",
           name: candidate.name,
           parentId: parent.id,
           cnes: candidate.cnes,
@@ -229,7 +256,7 @@ export async function reviewBetaRequest(
         {
           actorUserId: userId,
           organizationId,
-          action: "ORGANIZATION_ACTIVATED",
+          action: "ORGANIZATION_CREATED",
           resourceType: "ORGANIZATION",
           resourceId: organizationId,
           after: organization,
@@ -240,23 +267,33 @@ export async function reviewBetaRequest(
     const after = await tx.organizationCandidate.update({
       where: { id },
       data: {
-        status: body.decision === "APPROVE" ? "APPROVED" : "REJECTED",
+        status:
+          body.decision === "APPROVE"
+            ? "READY_FOR_ACTIVATION"
+            : body.decision === "REQUEST_CHANGES"
+              ? "CHANGES_REQUESTED"
+              : "REJECTED",
         convertedOrganizationId: organizationId,
         reviewReason: reason,
         reviewedByUserId: userId,
         reviewedAt: new Date(),
       },
     });
-    await tx.organizationRequest.updateMany({
-      where: { candidateId: id, status: "REQUESTED" },
-      data: { status: "RESOLVED" },
-    });
+    if (body.decision === "REJECT")
+      await tx.organizationRequest.updateMany({
+        where: { candidateId: id, status: "REQUESTED" },
+        data: { status: "RESOLVED" },
+      });
     await writeAdminAudit(
       {
         actorUserId: userId,
         organizationId,
         action:
-          body.decision === "APPROVE" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
+          body.decision === "APPROVE"
+            ? "REQUEST_FORWARDED"
+            : body.decision === "REQUEST_CHANGES"
+              ? "REQUEST_CHANGES"
+              : "REQUEST_REJECTED",
         resourceType: "ORGANIZATION_REQUEST",
         resourceId: id,
         before: candidate,
```

### src/server/admin/institutional-invitation-policy.ts

```diff
diff --git a/src/server/admin/institutional-invitation-policy.ts b/src/server/admin/institutional-invitation-policy.ts
new file mode 100644
index 0000000..5bb6130
--- /dev/null
+++ b/src/server/admin/institutional-invitation-policy.ts
@@ -0,0 +1,70 @@
+import { AccessDeniedError } from "@/server/iam/authorization.errors";
+import type { Prisma } from "@prisma/client";
+import { db } from "@/server/db/client";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { PERMISSIONS } from "@/server/iam/permissions";
+import { requireAdminOrganizationAccess } from "./admin-access.service";
+export async function requireInstitutionalInvitationAccess(
+  userId: string,
+  organizationId: string,
+  client: Prisma.TransactionClient = db,
+) {
+  const profile = await getEffectiveAccessProfile(userId, client);
+  if (profile?.permissions.includes(PERMISSIONS.INSTITUTION_INVITE)) {
+    return requireAdminOrganizationAccess(
+      userId,
+      PERMISSIONS.INSTITUTION_INVITE,
+      organizationId,
+      client,
+    );
+  }
+  await requireAdminOrganizationAccess(
+    userId,
+    PERMISSIONS.USER_INVITE,
+    organizationId,
+    client,
+  );
+  return requireAdminOrganizationAccess(
+    userId,
+    PERMISSIONS.MEMBERSHIP_MANAGE,
+    organizationId,
+    client,
+  );
+}
+
+/** A delegated inviter cannot use institutional enrollment to gain clinical or admin access. */
+export async function requireInstitutionalInvitationTarget(
+  actorUserId: string,
+  normalizedEmail: string,
+  client: Prisma.TransactionClient = db,
+) {
+  const profile = await getEffectiveAccessProfile(actorUserId, client);
+  const full = profile?.roles.some(
+    (r) =>
+      r.key === "PAP_ADMIN" &&
+      r.scope === "GLOBAL" &&
+      r.permissions.includes(PERMISSIONS.ROLE_MANAGE),
+  );
+  const delegated = profile?.roles.some(
+    (r) => r.key === "PAP_MANAGER" && r.scope === "GLOBAL",
+  );
+  if (!delegated || full) return;
+  if (profile!.user.email.toLowerCase() === normalizedEmail.toLowerCase())
+    throw new AccessDeniedError();
+  const target = await client.user.findUnique({
+    where: { email: normalizedEmail },
+    select: {
+      roleAssignments: {
+        select: { role: { select: { key: true, system: true } } },
+      },
+    },
+  });
+  // Existing professionals may receive another legitimate institutional scope.
+  // All other assigned roles (including unknown/custom ones) are protected.
+  if (
+    target?.roleAssignments.some(
+      (a) => !a.role.system || a.role.key !== "PROFESSIONAL",
+    )
+  )
+    throw new AccessDeniedError();
+}
```

### src/server/invitations/invitation.service.ts

```diff
diff --git a/src/server/invitations/invitation.service.ts b/src/server/invitations/invitation.service.ts
index c08412d..602bead 100644
--- a/src/server/invitations/invitation.service.ts
+++ b/src/server/invitations/invitation.service.ts
@@ -1,3 +1,4 @@
+import { requireInstitutionalInvitationAccess, requireInstitutionalInvitationTarget } from "@/server/admin/institutional-invitation-policy"
 import { requirePapReviewer } from "@/server/admin-beta/policy"
 import {
   createHash,
@@ -26,15 +27,6 @@ import {
   normalizeEmail,
 } from "@/server/auth/password-authentication.service"

-import {
-  PERMISSIONS,
-} from "@/server/iam/permissions"
-
-
-import {
-  requireAdminOrganizationAccess,
-} from "@/server/admin/admin-access.service"
-
 import {
   INVITATION_TOKEN_BYTES,
   INVITATION_TOKEN_HASH_DOMAIN,
@@ -102,17 +94,7 @@ async function createInvitation(
     roleKey: "PROFESSIONAL" | "HEALTH_UNIT_ADMIN"
   },
 ) {
-  await requireAdminOrganizationAccess(
-    input.invitedByUserId,
-    PERMISSIONS.USER_INVITE,
-    input.organizationId,
-  )
-
-  await requireAdminOrganizationAccess(
-    input.invitedByUserId,
-    PERMISSIONS.MEMBERSHIP_MANAGE,
-    input.organizationId,
-  )
+  await requireInstitutionalInvitationAccess(input.invitedByUserId, input.organizationId)

   if (input.roleKey === "HEALTH_UNIT_ADMIN") {
     await requirePapReviewer(input.invitedByUserId);
@@ -160,6 +142,8 @@ async function createInvitation(
     throw new InvitationPayloadError()
   }

+  await requireInstitutionalInvitationTarget(input.invitedByUserId, email)
+
   const displayName =
     normalizeDisplayName(
       input.displayName,
@@ -193,6 +177,8 @@ async function createInvitation(
       async (
         tx,
       ) => {
+        await requireInstitutionalInvitationAccess(input.invitedByUserId, organization.id, tx);
+        await requireInstitutionalInvitationTarget(input.invitedByUserId, email, tx);
         // Serialize invite/accept/revoke and bootstrap per organization.
         await tx.organization.update({where:{id:organization.id},data:{updatedAt:new Date()}});

@@ -588,6 +574,13 @@ export async function acceptInvitation(
     async (
       tx,
     ) => {
+      // Revalidate authority and target at acceptance: identities/roles can change
+      // while a bearer invitation is pending. Never consume a now-invalid grant.
+      if (!existing.invitedByUserId) throw new InvalidInvitationError();
+      try {
+        await requireInstitutionalInvitationAccess(existing.invitedByUserId, existing.organizationId, tx);
+        await requireInstitutionalInvitationTarget(existing.invitedByUserId, existing.email, tx);
+      } catch { throw new InvalidInvitationError(); }
       await tx.organization.update({where:{id:existing.organizationId},data:{updatedAt:new Date()}});
       const currentUser = await tx.user.findUnique({where:{id:existing.user!.id}});
       const currentOrg = await tx.organization.findUnique({where:{id:existing.organizationId}});
```

### src/server/clinical/clinical-page-session.ts

```diff
diff --git a/src/server/clinical/clinical-page-session.ts b/src/server/clinical/clinical-page-session.ts
new file mode 100644
index 0000000..ef35f2b
--- /dev/null
+++ b/src/server/clinical/clinical-page-session.ts
@@ -0,0 +1,19 @@
+import { redirect } from "next/navigation";
+import { requireOwnPageSession } from "@/server/auth/require-page-session";
+import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
+import { accessDestination } from "@/lib/auth/access-destination";
+/** No implicit clinical grant for platform administrators. Professional MFA policy is unchanged. */
+export async function requireClinicalPageSession() {
+  const session = await requireOwnPageSession();
+  const profile = await getEffectiveAccessProfile(session.user.id);
+  if (
+    !profile?.roles.some(
+      (r) =>
+        r.scope === "HEALTH_UNIT" &&
+        r.organization &&
+        r.permissions.includes("patient.read"),
+    )
+  )
+    redirect(accessDestination(profile));
+  return { ...session, profile };
+}
```
