import { requireOperationalMfa, OperationalMfaRequiredError } from "@/server/auth/operational-mfa.service";
import { redirect } from "next/navigation";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { accessDestination } from "@/lib/auth/access-destination";
/** No implicit clinical grant for platform administrators. MFA is mandatory for every operational identity. */
export async function requireClinicalPageSession() {
  const session = await requireOwnPageSession();
  const profile = await getEffectiveAccessProfile(session.user.id);
  if (
    !profile?.roles.some(
      (r) =>
        r.scope === "HEALTH_UNIT" &&
        r.organization &&
        r.permissions.includes("patient.read"),
    )
  )
    redirect(accessDestination(profile));
  try { await requireOperationalMfa(session); } catch (error) {
    if (error instanceof OperationalMfaRequiredError) redirect("/primeiros-passos");
    throw error;
  }
  return { ...session, profile };
}
