"use client";

import Link from "next/link";
import HelpCard from "@/components/premium/HelpCard";
import ActiveIndicator from "@/components/premium/ActiveIndicator";
import AreaLinks from "@/components/premium/AreaLinks";
import { adminBetaPathAllowed } from "@/lib/admin-beta-policy";
import { useState, useEffect, useRef } from "react";

import {
  BarChart3,
  Building2,
  FileClock,
  KeyRound,
  Activity,
  LayoutDashboard,
  Plug,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { usePathname } from "next/navigation";

import type { EffectiveAccessProfile } from "@/lib/admin/types";

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
  profile: EffectiveAccessProfile;
  betaOnly?: boolean;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiredAny?: string[];
  tourId?: string;
};

const navigation: NavigationItem[] = [
  {label:"Cursos institucionais",href:"/cursos",icon:LayoutDashboard,requiredAny:["course.progress.municipality.read","course.assign","course.progress.own.read"]},
  {label:"Solicitar nova unidade",href:"/solicitar-adesao",icon:Building2,requiredAny:["institution.invite"]},
  {label:"Distribuição institucional",href:"/admin/manager/distribuicao",icon:FileClock,requiredAny:["course.distribute"]},
  {label:"Inclusão de município",href:"/admin/manager/municipios",icon:Building2,requiredAny:["organization.municipality.create"]},
  {label:"Cursos de autoria",href:"/admin/manager/cursos",icon:LayoutDashboard,requiredAny:["course.edit"]},
  {label:"Biblioteca de materiais",href:"/admin/manager/materiais",icon:FileClock,requiredAny:["course.edit"]},
  { label: "Central de Pendências", href: "/admin/pendencias", icon: FileClock },
  {
    label: "Visão geral",
    href: "/admin",
    icon: LayoutDashboard,
    tourId: "admin-overview",
  },

  {
    label: "Rede de Saúde",
    href: "/admin/rede",
    icon: Building2,
    requiredAny: ["organization.read"],
    tourId: "admin-organizations",
  },

  {
    label: "Pessoas e Acessos",
    href: "/admin/usuarios",
    icon: Users,
    requiredAny: ["user.read"],
    tourId: "admin-users",
  },

  {
    label: "Perfis e acessos",
    href: "/admin/acessos",
    icon: ShieldCheck,
    requiredAny: ["role.read", "role.assign_commercial"],
  },

  {
    label: "Minha segurança",
    href: "/admin/minha-seguranca",
    icon: KeyRound,
  },

  {
    label: "Segurança",
    href: "/admin/seguranca",
    icon: KeyRound,
    requiredAny: ["user.security.manage", "mfa.reset"],
  },

  {
    label: "Auditoria",
    href: "/admin/auditoria",
    icon: FileClock,
    requiredAny: ["audit.read"],
  },

  {
    label: "Monitoramento",
    href: "/admin/monitoramento",
    icon: Activity,
    requiredAny: ["analytics.organization.read"],
  },
  {
    label: "Métricas",
    href: "/admin/metricas",
    icon: BarChart3,
    requiredAny: ["analytics.organization.read"],
    tourId: "admin-metrics",
  },

  {
    label: "Integrações",
    href: "/admin/integracoes",
    icon: Plug,
    requiredAny: ["rnds.integration.read"],
    tourId: "admin-integrations",
  },

  {
    label: "Solicitações",
    href: "/admin/solicitacoes",
    icon: Building2,
    requiredAny: ["organization.request.review"],
  },
  {
    label: "Convites",
    href: "/admin/convites",
    icon: Users,
    requiredAny: ["user.invite", "institution.invite"],
  },
  {
    label: "Convites e autorizações",
    href: "/admin/convites-globais",
    icon: Users,
    requiredAny: ["institution.invite"],
  },
];

export default function AdminSidebar({
  open,
  onClose,
  profile,
  betaOnly = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const aside = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        aside.current?.querySelectorAll<HTMLElement>(
          "a,button,input,summary",
        ) ?? [],
      ).filter((e) => e.getClientRects().length);
    focusable()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, onClose]);
  const manager=profile.roles.some(r=>r.key==="PAP_MANAGER"&&r.scope==="GLOBAL")&&!profile.roles.some(r=>r.key==="PAP_ADMIN"&&r.scope==="GLOBAL");
  const visible = navigation.map(item=>manager&&item.href==="/admin"?{...item,label:"Bancada de gestão",href:"/admin/manager"}:item).filter(
    (item) =>
      (!betaOnly || adminBetaPathAllowed(item.href)) &&
      (!item.requiredAny ||
        item.requiredAny.some((p) => profile.permissions.includes(p))) &&
      item.label
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const categories = [
    {label:"Gestão institucional",paths:["/admin","/admin/pendencias","/admin/solicitacoes","/admin/organizacoes","/admin/rede","/admin/manager","/admin/manager/municipios","/solicitar-adesao"]},
    {label:"Conhecimento institucional",paths:["/cursos","/admin/manager/cursos","/admin/manager/materiais","/admin/manager/distribuicao"]},
    {label:"Pessoas e Acessos",paths:["/admin/usuarios","/admin/convites","/admin/convites-globais","/admin/acessos"]},
    {label:"Inteligência",paths:["/admin/metricas"]},
    {label:"Auditoria e Segurança",paths:["/admin/auditoria","/admin/minha-seguranca","/admin/seguranca"]},
    {label:"Operações",paths:["/admin/monitoramento","/admin/integracoes"]},
  ];
  const groups=categories.map(group=>({label:group.label,items:visible.filter(i=>group.paths.includes(i.href))}));
  const remaining=visible.filter(i=>!categories.some(g=>g.paths.includes(i.href)));
  if(remaining.length)groups.push({label:"Mais opções",items:remaining});
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}
      <aside
        ref={aside}
        aria-label="Navegação administrativa"
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        className={[
          "group fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col premium-sidebar bg-white text-slate-700 transition-all duration-200 motion-reduce:transition-none md:sticky md:top-0 md:h-screen md:translate-x-0 md:visible",
          compact ? "md:w-20 md:hover:w-64 md:focus-within:w-64" : "md:w-64",
          open ? "visible translate-x-0" : "invisible -translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-pink-100 px-5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-50 text-xl font-bold text-pink-800"
          >
            ✚
          </span>
          <div
            className={
              compact
                ? "md:hidden md:group-hover:block md:group-focus-within:block"
                : ""
            }
          >
            <p className="whitespace-nowrap text-lg font-semibold">PAP Saúde</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-600">
              Gestão e inteligência
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="ml-auto p-2 md:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 p-3">
          <button
            className="hidden rounded-lg border border-slate-200 px-2 py-1 text-xs md:block"
            aria-label="Alternar menu compacto"
            aria-pressed={compact}
            onClick={() => setCompact((v) => !v)}
          >
            ☷
          </button>
          <div
            className={
              compact
                ? "md:hidden md:group-hover:block md:group-focus-within:block"
                : ""
            }
          >
            <p className="rounded-xl border border-pink-100 bg-pink-50/40 p-3 text-xs text-slate-700">
              <strong>{profile.user.displayName}</strong><br/>
              {profile.roles.map(r=>r.name).filter((v,i,a)=>a.indexOf(v)===i).join(" · ")}<br/>
              {profile.organizations.map(o=>o.name).join(" · ") || "Escopo global autorizado"}
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Buscar páginas</span>
              <input
                aria-label="Buscar páginas"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no menu…"
                className="w-full rounded-xl border border-slate-200 bg-pink-50/40 p-2 text-sm text-slate-800 placeholder:text-slate-500"
              />
            </label>
          </div>
        </div>
        <nav aria-label="Administração" className="pap-scroll-hidden relative min-h-0 flex-1 overflow-y-auto px-3"><ActiveIndicator/>
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <details open key={g.label} className="mb-3">
                <summary className="cursor-pointer py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  <span
                    className={
                      compact
                        ? "md:hidden md:group-hover:inline md:group-focus-within:inline"
                        : ""
                    }
                  >
                    {g.label}
                  </span>
                </summary>
                {g.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      data-tour={item.tourId}
                      onClick={onClose}
                      className={[
                        "my-1 flex items-center gap-3 whitespace-nowrap rounded-xl p-3 text-sm focus-visible:outline-2 focus-visible:outline-pink-700",
                        active
                          ? "bg-pink-50 font-semibold text-pink-800"
                          : "text-slate-700 hover:bg-pink-50",
                      ].join(" ")}
                    >
                      <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                      <span
                        className={
                          compact
                            ? "md:hidden md:group-hover:inline md:group-focus-within:inline"
                            : ""
                        }
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </details>
            ))}
        </nav>
        <div className="border-t border-pink-100 p-4">
          <div
            className={
              compact
                ? "md:hidden md:group-hover:block md:group-focus-within:block"
                : ""
            }
          >
            {!betaOnly && <AreaLinks profile={profile} current="/admin"/>}
            <HelpCard onTutorial={()=>{onClose();window.dispatchEvent(new CustomEvent("pap-tour:restart",{detail:{tourKey:"admin-core"}}));}}/>
            <Link className="mt-2 block rounded-lg px-3 py-2 text-sm" href="/admin/minha-seguranca">Segurança da minha conta</Link>
          </div>
        </div>
      </aside>
    </>
  );
}
