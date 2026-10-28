"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ClipboardPlus, ClipboardList, Users, BookOpen, Wrench, LayoutDashboard, Settings, X, GraduationCap, Bot } from "lucide-react";
const items = [
    { label: "Registro", href: "/registro", icon: ClipboardPlus },
    { label: "Atendimentos", href: "/atendimentos", icon: ClipboardList },
    { label: "Pacientes", href: "/pacientes", icon: Users },
    { label: "Chat IA", href: "/chat", icon: Bot },
    { label: "Protocolos", href: "/protocolos", icon: BookOpen },
    { label: "Ferramentas", href: "/ferramentas", icon: Wrench },
    { label: "Cursos", href: "/cursos", icon: GraduationCap },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];
export default function Sidebar({ open, onClose, demo = false, displayName }: {
    open: boolean;
    onClose: () => void;
    demo?: boolean;
    displayName?: string;
}) {
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
    <aside ref={ref} aria-label={demo ? "Navegação clínica demonstrativa" : "Navegação clínica"} role={open ? "dialog" : undefined} aria-modal={open || undefined} className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:w-56 md:translate-x-0 md:visible ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5"><span className="text-xl font-semibold text-pink-500">PAP Saúde</span><button type="button" aria-label="Fechar menu" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 md:hidden"><X size={20}/></button></div>
      <nav aria-label="Módulos clínicos" className="flex-1 overflow-y-auto px-3 py-4"><div className="space-y-1">{items.map(item => {
            const href = demo ? item.href === "/dashboard" ? "/vitrine" : `/vitrine${item.href}` : item.href;
            const Icon = item.icon;
            return <Link key={href} href={href} prefetch={demo ? false : undefined} onClick={onClose} aria-current={pathname === href ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${pathname === href ? "bg-pink-50 font-medium text-pink-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}><Icon size={18} aria-hidden="true"/><span>{item.label}</span></Link>;
        })}</div></nav>
      <div className="shrink-0 border-t border-gray-100 p-3"><Link href={demo ? "/vitrine/ajuda" : "/configuracoes"} prefetch={demo ? false : undefined} onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-600"><Settings size={18} aria-hidden="true"/><span>{demo ? "Sobre a demonstração" : "Configurações"}</span></Link><div className="mt-3 border-t border-gray-100 px-3 pt-3"><p className="truncate text-sm font-medium text-gray-900">{demo ? "Profissional demonstrativo" : (displayName ?? "Sua conta")}</p><p className="mt-0.5 text-xs text-gray-500">{demo ? "Personagem fictício · DEMO" : "Profissional de saúde"}</p></div></div>
    </aside>
  </>;
}
