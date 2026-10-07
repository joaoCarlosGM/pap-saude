"use client"

import Link from "next/link"

import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  FileClock,
  KeyRound,
  LayoutDashboard,
  Plug,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"

import {
  usePathname,
} from "next/navigation"

import type {
  EffectiveAccessProfile,
} from "@/lib/admin/types"

type AdminSidebarProps = {
  open: boolean
  onClose: () => void
  profile: EffectiveAccessProfile
}

type NavigationItem = {
  label: string
  href: string
  icon:
    typeof LayoutDashboard
  requiredAny?: string[]
  tourId?: string
}

const navigation:
  NavigationItem[] = [
    {
      label:
        "Visão geral",
      href:
        "/admin",
      icon:
        LayoutDashboard,
      tourId:
        "admin-overview",
    },

    {
      label:
        "Organizações",
      href:
        "/admin/organizacoes",
      icon:
        Building2,
      requiredAny: [
        "organization.read",
      ],
      tourId:
        "admin-organizations",
    },

    {
      label:
        "Usuários",
      href:
        "/admin/usuarios",
      icon:
        Users,
      requiredAny: [
        "user.read",
      ],
      tourId:
        "admin-users",
    },

    {
      label:
        "Perfis e acessos",
      href:
        "/admin/acessos",
      icon:
        ShieldCheck,
      requiredAny: [
        "role.read",
      ],
    },

    {
      label:
        "Segurança",
      href:
        "/admin/seguranca",
      icon:
        KeyRound,
      requiredAny: [
        "user.security.manage",
        "mfa.reset",
      ],
    },

    {
      label:
        "Auditoria",
      href:
        "/admin/auditoria",
      icon:
        FileClock,
      requiredAny: [
        "audit.read",
      ],
    },

    {
      label:
        "Métricas",
      href:
        "/admin/metricas",
      icon:
        BarChart3,
      requiredAny: [
        "analytics.organization.read",
      ],
      tourId:
        "admin-metrics",
    },

    {
      label:
        "Integrações",
      href:
        "/admin/integracoes",
      icon:
        Plug,
      requiredAny: [
        "rnds.integration.read",
      ],
      tourId:
        "admin-integrations",
    },

    {
      label:
        "Comercial",
      href:
        "/admin/comercial",
      icon:
        BriefcaseBusiness,
      requiredAny: [
        "commercial.read",
      ],
    },
  ]

export default function AdminSidebar({
  open,
  onClose,
  profile,
}: AdminSidebarProps) {
  const pathname =
    usePathname()

  const permissions =
    new Set(
      profile.permissions,
    )

  const visibleNavigation =
    navigation.filter(
      (item) =>
        !item.requiredAny ||
        item.requiredAny.some(
          (permission) =>
            permissions.has(
              permission,
            ),
        ),
    )

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col",
          "border-r border-slate-200 bg-white",
          "transform transition-transform duration-200 ease-in-out",
          "md:static md:z-auto md:w-64 md:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div>
            <p className="text-lg font-semibold text-[#064f50]">
              PAP Saúde
            </p>

            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Administração
            </p>
          </div>

          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 md:hidden"
          >
            <X
              size={19}
              strokeWidth={1.8}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {visibleNavigation.map(
              (item) => {
                const Icon =
                  item.icon

                const active =
                  item.href ===
                  "/admin"
                    ? pathname ===
                      "/admin"
                    : pathname ===
                        item.href ||
                      pathname.startsWith(
                        `${item.href}/`,
                      )

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    data-tour={
                      item.tourId
                    }
                    onClick={
                      onClose
                    }
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2.5",
                      "text-sm transition-colors",
                      active
                        ? "bg-[#064f50]/10 font-medium text-[#064f50]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                    ].join(
                      " ",
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={
                        1.8
                      }
                      className="shrink-0"
                    />

                    <span>
                      {
                        item.label
                      }
                    </span>
                  </Link>
                )
              },
            )}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <p className="truncate text-sm font-medium text-slate-900">
            {
              profile.user
                .displayName
            }
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {
              profile.roles[0]
                ?.name ??
              "Usuário PAP"
            }
          </p>
        </div>
      </aside>
    </>
  )
}
