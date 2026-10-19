import { OrganizationType, Prisma } from "@prisma/client";
import { db } from "../../src/server/db/client";

// Legacy F03 fixtures must obey the F04 hierarchy, just like real writes.
// No production trigger is disabled to make a fixture pass.
export async function createClinicalTestOrganization(args: {
  data: Prisma.OrganizationUncheckedCreateInput;
}) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!/^\/pap_saude_f(?:02b|03_[a-z_]+)_test$/.test(url.pathname)) {
    throw new Error("Clinical fixtures require an allowlisted disposable database");
  }
  const data = { ...args.data };
  if (data.type !== OrganizationType.PAP && !data.parentId) {
    const pap = await db.organization.create({
      data: { type: OrganizationType.PAP, status: "ACTIVE", name: "Synthetic PAP" },
    });
    data.parentId = pap.id;
    if (data.type === OrganizationType.HEALTH_UNIT) {
      const municipality = await db.organization.create({
        data: { type: OrganizationType.MUNICIPALITY, status: "ACTIVE", name: "Synthetic municipality", parentId: pap.id },
      });
      data.parentId = municipality.id;
    }
  }
  return db.organization.create({ data });
}
