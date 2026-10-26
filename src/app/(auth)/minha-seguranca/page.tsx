import MySecurityClient from "@/components/admin/MySecurityClient";
import { requireOwnPageSession } from "@/server/auth/require-page-session";
export default async function MySecurityPage() {
  await requireOwnPageSession();
  return (
    <main>
      <MySecurityClient />
    </main>
  );
}
