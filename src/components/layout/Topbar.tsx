"use client";
import { HelpCircle, ChevronDown, Menu, ArrowLeft, PanelLeftClose, PanelLeftOpen, Columns2 } from "lucide-react";
import Link from "next/link";
import NotificationLink from "@/components/admin/NotificationLink";
import type {NavigationMode} from "./navigation-preference";
import ThemeToggle from "@/components/demo/ThemeToggle";
export default function Topbar({ onMenuClick, demo = false, displayName, mode="expanded", onModeChange }: {
    onMenuClick: () => void;
    demo?: boolean;
    displayName?: string;
    mode?: NavigationMode;
    onModeChange?: (mode:NavigationMode)=>void;
}) {
    return <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 text-slate-900 dark:bg-slate-900 dark:text-slate-100 sm:px-4 lg:px-6">
    <div className="flex min-w-0 items-center gap-2"><button type="button" aria-label="Abrir menu" onClick={onMenuClick} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-white/10 md:hidden"><Menu size={21}/></button><span className="truncate text-sm font-medium">{demo ? "PAP Saúde · Demo" : "Prontuário de Atendimento"}</span></div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <div className="hidden gap-1 md:flex" role="group" aria-label="Preferência de navegação">{([{value:"expanded",label:"Menu expandido",Icon:PanelLeftOpen},{value:"compact",label:"Menu de ícones",Icon:Columns2},{value:"hidden",label:"Recolher menu",Icon:PanelLeftClose}] as const).map(({value,label,Icon})=><button key={value} type="button" className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={label} title={label} aria-pressed={mode===value} onClick={()=>onModeChange?.(value)}><Icon size={18}/></button>)}</div>
      {demo ? <><Link prefetch={false} href="/vitrine/ajuda" aria-label="Como funciona a demonstração" className="grid h-10 w-10 place-items-center rounded-md hover:bg-white/10"><HelpCircle size={18}/></Link><Link prefetch={false} href="/comercial" aria-label="Voltar ao Comercial" className="flex h-10 items-center gap-2 rounded-md px-2 hover:bg-white/10"><ArrowLeft size={18}/><span className="hidden sm:inline">Voltar ao Comercial</span></Link><ThemeToggle /></> : <>
        <Link href="/ajuda/seguranca" aria-label="Ajuda de segurança" className="grid h-9 w-9 place-items-center"><HelpCircle size={17}/></Link>
        <NotificationLink/>
        <Link href="/configuracoes" aria-label="Configurações da minha conta" className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-white/10"><span className="grid h-7 w-7 place-items-center rounded-full bg-pink-700 text-xs font-medium text-white">{displayName?.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join("") || "PAP"}</span><span className="hidden text-sm sm:inline">{displayName ?? "Sua conta"}</span><ChevronDown size={15} className="hidden sm:block"/></Link>
      </>}
    </div>
  </header>;
}
