import OrganizationsAdminClient from "@/components/admin/OrganizationsAdminClient";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
export default async function OrganizationsAdminPage() {
  const session = await requireOwnPageSession();
  const profile = await getEffectiveAccessProfile(session.user.id);
  return <OrganizationsAdminClient permissions={profile?.permissions ?? []} />;
}
