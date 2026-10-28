import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { redirect } from "next/navigation";
import FirstAccessWizard from "@/components/security/FirstAccessWizard";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
import { firstAccessState } from "@/server/auth/first-access.service";
import { accessDestination } from "@/lib/auth/access-destination";
export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ajuda?: string }>;
}) {
  const { ajuda } = await searchParams;
  // Preserve existing bookmarks while keeping help outside initial setup.
  if (ajuda === "1") redirect("/ajuda/seguranca");
  const session = await requireOwnPageSession();
  const profile = await getEffectiveAccessProfile(session.user.id);
  const state = await firstAccessState(session.user.id, session.session.id);
  if (state.verified && accessDestination(profile) === "/comercial") redirect("/comercial");
  if (state.verified && accessDestination(profile) === "/login" && await ownAccessStatus(session.user.id))
    redirect("/aguardando-autorizacao");
  return <FirstAccessWizard />;
}
