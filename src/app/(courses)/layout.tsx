import {cookies} from 'next/headers';
import {SESSION_COOKIE_NAME} from '@/server/security/constants';
import {workspaceInstitutions} from '@/server/account/workspace-identity.service';
import DashboardShell from '@/components/layout/DashboardShell';import {coursePageSession} from '@/server/courses/page-session';
export default async function Layout({children}:{children:React.ReactNode}){const actor=await coursePageSession();return <DashboardShell profile={actor.profile} identity={{id:actor.user.id,displayName:actor.user.displayName,institutions:await workspaceInstitutions((await cookies()).get(SESSION_COOKIE_NAME)?.value||'')}}>{children}</DashboardShell>;}
