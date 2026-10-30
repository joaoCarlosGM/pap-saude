import Link from 'next/link';
import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {requireOwnPageSession} from '@/server/auth/require-page-session';
import {requireAdminActor} from '@/server/admin/admin-session.service';
import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';
import {SESSION_COOKIE_NAME} from '@/server/security/constants';
export const dynamic='force-dynamic';
export default async function ManagerPage(){
 const session=await requireOwnPageSession();await requireAdminActor(session.user.id,(await cookies()).get(SESSION_COOKIE_NAME)?.value);
 const profile=await getEffectiveAccessProfile(session.user.id);
 if(!profile?.roles.some(r=>r.scope==='GLOBAL'&&['PAP_MANAGER','PAP_ADMIN'].includes(r.key)))notFound();
 const links=[{href:'/solicitar-adesao',label:'Solicitar nova UBS ou Hospital',permission:'institution.invite'},{href:'/admin/manager/distribuicao',label:'Distribuição institucional',permission:'course.distribute'},{href:'/admin/manager/municipios',label:'Incluir município pendente',permission:'organization.municipality.create'},{href:'/admin/manager/cursos',label:'Criar, editar e distribuir cursos',permission:'course.edit'},{href:'/admin/manager/materiais',label:'Biblioteca de materiais',permission:'course.edit'},{href:'/admin/rede',label:'Municípios e unidades',permission:'organization.read'},{href:'/admin/solicitacoes',label:'Solicitações de unidades',permission:'organization.request.review'},{href:'/admin/convites-globais',label:'Convidar e autorizar Comercial',permission:'institution.invite'},{href:'/comercial',label:'Vitrine comercial autorizada',permission:'commercial.read'}].filter(l=>profile.permissions.includes(l.permission)&&(l.href!=="/comercial"||profile.roles.some(r=>r.key==="COMMERCIAL"&&r.scope==="GLOBAL"&&r.permissions.includes("commercial.read"))));
 return <section data-manager-workbench className="mx-auto max-w-6xl space-y-6"><h1 className="text-3xl font-semibold">Bancada de gestão</h1><p>Inclusão institucional e ações delegadas. A análise de uma solicitação não ativa a unidade nem concede acesso clínico.</p><div className="grid gap-4 sm:grid-cols-2">{links.map(l=><Link key={l.href} href={l.href} className="rounded-2xl border bg-white p-6 text-lg font-semibold hover:shadow-sm">{l.label} →</Link>)}</div><p className="text-sm">Ativação e exclusão de UBS permanecem exclusivas do PAP_ADMIN. Nenhuma permissão é concedida por esta navegação.</p></section>;
}
