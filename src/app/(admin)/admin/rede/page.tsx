import Link from "next/link";
import NetworkDirectory from "@/components/admin/NetworkDirectory";
import {requireOwnPageSession} from "@/server/auth/require-page-session";
import {listAdminOrganizations} from "@/server/admin/admin-organizations.service";
export const dynamic="force-dynamic";
export default async function Page(){const actor=await requireOwnPageSession(),orgs=await listAdminOrganizations(actor.user.id);return <div className="mx-auto max-w-6xl space-y-5"><h1 className="text-3xl font-semibold">Rede de Saúde</h1><p>Diretório institucional autorizado. Dados clínicos não são apresentados nesta navegação.</p><NetworkDirectory organizations={orgs.map(({id,name,type,parentId,status})=>({id,name,type,parentId,status}))}/><Link className="underline" href="/admin/organizacoes">Gerenciar organizações no fluxo existente</Link></div>;}
