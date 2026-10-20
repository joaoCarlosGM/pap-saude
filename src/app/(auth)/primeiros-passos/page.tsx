import FirstAccessWizard from "@/components/security/FirstAccessWizard";
export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ajuda?: string }>;
}) {
  const { ajuda } = await searchParams;
  return <FirstAccessWizard help={ajuda === "1"} />;
}
