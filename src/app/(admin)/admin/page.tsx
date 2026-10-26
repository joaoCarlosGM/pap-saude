import { redirect } from "next/navigation";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import BetaDashboardClient from "@/components/admin/BetaDashboardClient";
export default async function Page() {
  const session = await requireOwnPageSession();
  const profile = await getEffectiveAccessProfile(session.user.id);
  if (!profile?.permissions.includes("analytics.organization.read")) redirect("/admin/solicitacoes");
  return <BetaDashboardClient/>;
}
