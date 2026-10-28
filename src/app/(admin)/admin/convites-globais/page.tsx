import { notFound } from "next/navigation";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import AccessInvitationsClient from "@/components/admin/AccessInvitationsClient";
export const dynamic = "force-dynamic";
export default async function GlobalInvitationsPage({searchParams}:{searchParams:Promise<{item?:string}>}) {
  const { user } = await requireOwnPageSession();
  const profile = await getEffectiveAccessProfile(user.id);
  if (
    !profile?.roles.some(
      (r) =>
        ["PAP_ADMIN", "PAP_MANAGER"].includes(r.key) &&
        r.scope === "GLOBAL" &&
        r.permissions.includes("institution.invite"),
    )
  )
    notFound();
  const {item}=await searchParams;
  if(item&&!/^[0-9a-f-]{36}$/i.test(item))notFound();
  return <AccessInvitationsClient focusId={item}/>;
}
