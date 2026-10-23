import { redirect } from "next/navigation";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
import WaitingAuthorization from "@/components/access/WaitingAuthorization";
export const dynamic = "force-dynamic";
export default async function WaitingPage() {
  const { user } = await requireOwnPageSession();
  const state = await ownAccessStatus(user.id);
  if (!state) redirect("/login");
  return (
    <WaitingAuthorization
      initial={{
        ...state,
        acceptedAt: state.acceptedAt?.toISOString() ?? null,
        decidedAt: state.decidedAt?.toISOString() ?? null,
      }}
    />
  );
}
