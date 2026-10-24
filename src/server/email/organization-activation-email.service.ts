import type { Organization, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { invitationBaseUrl, requireTransactionalMail, sendPlatformEmail } from "./email.service";
import { transactionalTemplate } from "./templates";
/** Called inside the authorized activation transaction. A public request contact
 * alone is never a recipient: require a real active scoped administrator/member. */
export async function prepareOrganizationActivationNotices(tx: Prisma.TransactionClient, organization: Organization) {
  const recipients = await tx.user.findMany({ where: { isActive: true,
    memberships: { some: { organizationId: organization.id, status: "ACTIVE" } },
    roleAssignments: { some: { organizationId: organization.id, role: { key: "HEALTH_UNIT_ADMIN", system: true } } },
  }, select: { id: true } });
  for (const user of recipients) await tx.organizationActivationNotice.create({ data: {
    organizationId: organization.id, userId: user.id, organizationName: organization.name,
    activatedAt: organization.updatedAt,
  } });
}
/** Repeating authorized ACTIVATE retries pending/failed receipts, never mints a new receipt for an already active UBS. */
export async function dispatchOrganizationActivationNotices(organizationId: string) {
  const notices = await db.organizationActivationNotice.findMany({ where: { organizationId, emailStatus: { in: ["PENDING", "FAILED"] } } });
  for (const notice of notices) {
    const organization = await db.organization.findUnique({ where: { id: organizationId } });
    const user = await db.user.findFirst({ where: { id: notice.userId, isActive: true,
      memberships: { some: { organizationId, status: "ACTIVE" } },
      roleAssignments: { some: { organizationId, role: { key: "HEALTH_UNIT_ADMIN", system: true } } },
    }, select: { email: true } });
    if (!user || !organization?.isActive || organization.status !== "ACTIVE") {
      await db.organizationActivationNotice.updateMany({ where: { id: notice.id, emailStatus: { in: ["PENDING", "FAILED"] } }, data: { emailStatus: "NOT_REQUESTED" } });
      continue;
    }
    try {
      requireTransactionalMail();
      const delivery = await sendPlatformEmail({ to: user.email,
        ...transactionalTemplate({ kind: "UBS_ACTIVATED", organizationName: notice.organizationName, url: new URL("/login", invitationBaseUrl()).toString() }),
        messageId: `ubs-activation/${notice.id}`, eventTime: notice.createdAt.toISOString(),
        reference: { kind: "UBS_ACTIVATED", id: notice.id },
      });
      await db.organizationActivationNotice.updateMany({ where: { id: notice.id, emailStatus: { in: ["PENDING", "FAILED"] } }, data: { emailStatus: delivery.status } });
    } catch {
      // Activation remains valid; receipt is durable and retryable, never "delivered".
      await db.organizationActivationNotice.updateMany({ where: { id: notice.id, emailStatus: { in: ["PENDING", "FAILED"] } }, data: { emailStatus: "FAILED" } });
    }
  }
}
