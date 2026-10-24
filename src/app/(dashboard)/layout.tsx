import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import DashboardShell from "@/components/layout/DashboardShell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireClinicalPageSession();
  return <DashboardShell>{children}</DashboardShell>
}