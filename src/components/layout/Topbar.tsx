"use client";
import { HelpCircle, Bell, ChevronDown, Menu, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/demo/ThemeToggle";
export default function Topbar({ onMenuClick, demo = false }: {
    onMenuClick: () => void;
    demo?: boolean;
}) {
    return <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-[#064f50] px-3 text-white sm:px-4 lg:px-6">
    <div className="flex min-w-0 items-center gap-2"><button type="button" aria-label="Abrir menu" onClick={onMenuClick} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-white/10 md:hidden"><Menu size={21}/></button><span className="truncate text-sm font-medium">{demo ? "PAP Saúde · Demo" : "Prontuário de Atendimento"}</span></div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      {demo ? <><Link prefetch={false} href="/vitrine/ajuda" aria-label="Como funciona a demonstração" className="grid h-10 w-10 place-items-center rounded-md hover:bg-white/10"><HelpCircle size={18}/></Link><Link prefetch={false} href="/comercial" aria-label="Voltar ao Comercial" className="flex h-10 items-center gap-2 rounded-md px-2 hover:bg-white/10"><ArrowLeft size={18}/><span className="hidden sm:inline">Voltar ao Comercial</span></Link><ThemeToggle /></> : <>
        <button type="button" aria-label="Ajuda" className="flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-white/10 sm:px-3"><HelpCircle size={17}/><span className="hidden sm:inline">Ajuda</span></button>
        <a href="/notificacoes" aria-label="Minhas notificações" className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10"><Bell size={18}/></a>
        <button type="button" aria-label="Menu do usuário" className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-white/10"><span className="grid h-7 w-7 place-items-center rounded-full bg-pink-500 text-xs font-medium">AP</span><span className="hidden text-sm sm:inline">Ana Paula</span><ChevronDown size={15} className="hidden sm:block"/></button>
      </>}
    </div>
  </header>;
}
