import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import DashboardShell from "@/components/layout/DashboardShell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await requireClinicalPageSession();
  return <DashboardShell identity={{id:actor.user.id,displayName:actor.user.displayName}}>{children}</DashboardShell>
}