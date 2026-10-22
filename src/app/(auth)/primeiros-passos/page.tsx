import { requireOwnPageSession } from "@/server/auth/require-page-session";
import { redirect } from "next/navigation";
import FirstAccessWizard from "@/components/security/FirstAccessWizard";
export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ajuda?: string }>;
}) {
  const { ajuda } = await searchParams;
  // Preserve existing bookmarks while keeping help outside initial setup.
  if (ajuda === "1") redirect("/ajuda/seguranca");
  await requireOwnPageSession();
  return <FirstAccessWizard />;
}
