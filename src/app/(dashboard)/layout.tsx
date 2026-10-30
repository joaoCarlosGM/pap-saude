import {cookies} from 'next/headers';
import {SESSION_COOKIE_NAME} from '@/server/security/constants';
import {workspaceInstitutions} from '@/server/account/workspace-identity.service';
import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import DashboardShell from "@/components/layout/DashboardShell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await requireClinicalPageSession();
  return <DashboardShell profile={actor.profile} identity={{id:actor.user.id,displayName:actor.user.displayName,institutions:await workspaceInstitutions((await cookies()).get(SESSION_COOKIE_NAME)?.value||'')}}>{children}</DashboardShell>
}