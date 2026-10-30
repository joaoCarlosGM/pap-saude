"use client";
import Link from "next/link";
import type { EffectiveAccessProfile } from "@/lib/admin/types";
import AreaLinks from "@/components/premium/AreaLinks";
import CourseBadge from "@/components/courses/CourseBadge";
import HelpCard from "@/components/premium/HelpCard";
import NotificationLink from "@/components/admin/NotificationLink";
import AiSparkIcon from "@/components/workspace/AiSparkIcon";
import type {NavigationMode} from "./navigation-preference";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ClipboardPlus, ClipboardList, Users, BookOpen, Wrench, LayoutDashboard, Settings, X, GraduationCap } from "lucide-react";
const items = [
 {label:"Dashboard",href:"/dashboard",icon:LayoutDashboard,group:"VISÃO GERAL"},
 {label:"Registro",href:"/registro",icon:ClipboardPlus,group:"CLÍNICA"},
 {label:"Atendimentos",href:"/atendimentos",icon:ClipboardList,group:"CLÍNICA"},
 {label:"Pacientes",href:"/pacientes",icon:Users,group:"CLÍNICA"},
 {label:"Protocolos",href:"/protocolos",icon:BookOpen,group:"CONHECIMENTO E APOIO"},
 {label:"Ferramentas",href:"/ferramentas",icon:Wrench,group:"CONHECIMENTO E APOIO"},
 {label:"Chat IA",href:"/chat",icon:AiSparkIcon,group:"CONHECIMENTO E APOIO"},
 {label:"Cursos",href:"/cursos",icon:GraduationCap,group:"CONHECIMENTO E APOIO"},
];
export default function Sidebar({ open, onClose, demo = false, displayName, institutions, profile, mode="expanded" }: {
    open: boolean;
    onClose: () => void;
    demo?: boolean;
    displayName?: string;
    institutions?:{id:string;name:string;municipality:string|null;state:string|null}[];
    profile?: EffectiveAccessProfile;
    mode?: NavigationMode;
}) {
    const hasClinical=!!profile?.roles.some(r=>r.scope==="HEALTH_UNIT"&&r.organization&&r.permissions.includes("patient.read"));
    const pathname = usePathname(), ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open)
            return;
        const wide = window.matchMedia("(min-width: 768px)");
        const closeOnWide = () => { if (wide.matches)
            onClose(); };
        wide.addEventListener("change", closeOnWide);
        closeOnWide();
        const previous = document.activeElement as HTMLElement | null;
        const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || []).filter(e => e.getClientRects().length > 0);
        focusable()[0]?.focus();
        function key(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
            if (e.key !== "Tab")
                return;
            const all = focusable(), first = all[0], last = all.at(-1);
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
        document.addEventListener("keydown", key);
        return () => { document.removeEventListener("keydown", key); wide.removeEventListener("change", closeOnWide); previous?.focus(); };
    }, [open, onClose]);
    return <>
    {open && <button type="button" tabIndex={-1} aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"/>}
    <aside ref={ref} aria-label={demo?"Navegação clínica demonstrativa":hasClinical?"Navegação clínica":"Navegação de cursos"} role={open ? "dialog" : undefined} aria-modal={open || undefined} className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col premium-sidebar border-r border-gray-200 bg-white transition-transform duration-200 motion-reduce:transition-none md:sticky md:top-0 md:h-screen md:z-auto ${mode==="hidden"?"md:hidden":mode==="compact"?"md:w-20":"md:w-64"} md:translate-x-0 md:visible ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5"><span className={`text-xl font-semibold ${demo?"text-pink-500":"text-[var(--premium-brand,#b41468)]"} ${mode==="compact"?"md:text-sm":""}`}>{mode==="compact"?"PAP":"PAP Saúde"}</span><button type="button" aria-label="Fechar menu" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 md:hidden"><X size={20}/></button></div>
      {!demo && <div data-tour="clinical-profile" className={`shrink-0 space-y-2 px-4 py-3 ${mode==="compact"?"md:hidden":""}`}>
        <div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-100 font-semibold text-pink-800">{displayName?.trim().slice(0,1) || "P"}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName ?? "Sua conta"}</p><p className="text-xs text-slate-600">{hasClinical?"Área clínica autorizada":"Cursos e equipe autorizados"}</p></div></div>
        <ul className="max-h-20 overflow-auto text-xs text-slate-600" aria-label="Vínculos autorizados">{institutions?institutions.map(o=><li key={o.id}>{o.name}{o.municipality?` · ${o.municipality}`:""}{o.state?` — ${o.state}`:""}</li>):profile?.organizations.map(o=><li key={o.id}>{o.name}</li>)}</ul>
        <div className="flex flex-wrap items-center gap-2 text-xs"><button type="button" className="rounded-lg border px-2 py-2" onClick={()=>window.dispatchEvent(new CustomEvent("pap-tour:restart",{detail:{tourKey:"clinical-core"}}))}>Ajuda</button><Link href="/minha-seguranca" className="rounded-lg border px-2 py-2">Segurança</Link></div>
        {profile && <AreaLinks profile={profile} current="/dashboard"/>}
      </div>}
      <nav aria-label="Módulos clínicos" className="pap-scroll-hidden min-h-0 flex-1 overflow-y-auto px-3 py-4"><div className="relative space-y-1">{items.filter(item=>(demo || !profile || hasClinical || item.href==="/cursos")&&(demo || !profile || item.href==="/pacientes" || item.href==="/configuracoes" || !["/registro","/atendimentos","/dashboard"].includes(item.href) || profile.roles.some(r=>r.scope==="HEALTH_UNIT" && r.organization && r.permissions.includes(item.href==="/registro"?"encounter.create":"encounter.read")))).map((item,index,visible) => {
            const href = demo ? item.href === "/dashboard" ? "/vitrine" : `/vitrine${item.href}` : item.href;
            const Icon = item.icon;
            return <div key={href}>{visible[index-1]?.group!==item.group&&<p className="mt-3 px-3 pb-1 text-xs font-medium text-slate-600">{item.group}</p>}<Link href={href} prefetch={demo ? false : undefined} onClick={onClose} data-tour={`clinical-${item.href.slice(1)}`} aria-label={item.label} title={item.label} aria-current={(pathname === href || pathname.startsWith(href+"/")) ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${pathname === href ? "bg-pink-50 font-medium text-pink-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}><Icon size={18} aria-hidden="true"/><span className={mode==="compact"?"md:sr-only":undefined}>{item.label}</span>{!demo&&item.href==="/cursos"&&profile?.permissions.some(p=>p.startsWith("course."))&&<CourseBadge/>}</Link></div>;
        })}</div></nav>
      <div className="shrink-0 border-t border-gray-100 p-3"><p className="px-3 text-xs text-slate-600">SISTEMA</p><div className="px-1">{!demo&&<NotificationLink/>}</div><Link data-tour="clinical-configuracoes" href={demo ? "/vitrine/ajuda" : "/configuracoes"} prefetch={demo ? false : undefined} onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-600"><Settings size={18} aria-hidden="true"/><span className={mode==="compact"?"md:sr-only":undefined}>{demo ? "Sobre a demonstração" : "Configurações"}</span></Link><HelpCard onTutorial={()=>{window.dispatchEvent(new CustomEvent("pap-tour:restart",{detail:{tourKey:"clinical-core"}}));}}/></div>
    </aside>
  </>;
}
