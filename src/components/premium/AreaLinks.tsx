import Link from "next/link";
import type { EffectiveAccessProfile } from "@/lib/admin/types";
/** Navigation hints from server-computed effective grants, never an authorization guard. */
export function authorizedAreas(profile:EffectiveAccessProfile) {
  return [
    ...(profile.canAccessAdmin?[{href:"/admin",label:"Administração"}]:[]),
    ...(profile.roles.some(r=>r.scope==="HEALTH_UNIT" && r.organization && r.permissions.includes("patient.read"))?[{href:"/dashboard",label:"Área clínica"}]:[]),
    ...(profile.roles.some(r=>r.key==="COMMERCIAL" && r.scope==="GLOBAL" && r.permissions.includes("commercial.read"))?[{href:"/comercial",label:"Comercial"}]:[]),
  ];
}
export default function AreaLinks({profile,current}:{profile:EffectiveAccessProfile;current:string}) {
  const areas=authorizedAreas(profile).filter(a=>a.href!==current);
  if(!areas.length)return null;
  return <nav aria-label="Alternar área autorizada" className="flex flex-wrap gap-2 text-xs">{areas.map(a=><Link key={a.href} href={a.href} className="rounded-lg border border-pink-200 px-3 py-2 text-pink-800 hover:bg-pink-50">{a.label}</Link>)}</nav>;
}
