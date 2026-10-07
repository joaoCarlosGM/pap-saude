"use client"

import {
  Bell,
  ChevronDown,
  HelpCircle,
  Menu,
} from "lucide-react"

import type {
  EffectiveAccessProfile,
} from "@/lib/admin/types"

type AdminTopbarProps = {
  onMenuClick: () => void
  profile: EffectiveAccessProfile
}

function initials(
  name: string,
): string {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)

  if (
    parts.length === 0
  ) {
    return "PA"
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase()
}

export default function AdminTopbar({
  onMenuClick,
  profile,
}: AdminTopbarProps) {
  const hasGlobalScope =
    profile.roles.some(
      (role) =>
        role.scope ===
        "GLOBAL",
    )

  const contextLabel =
    hasGlobalScope
      ? "Escopo global"
      : profile
          .organizations[0]
          ?.name ??
        "Administração"

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-[#064f50] px-3 text-white sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={
            onMenuClick
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10 md:hidden"
        >
          <Menu
            size={21}
            strokeWidth={1.8}
          />
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            Central Administrativa
          </p>

          <p className="truncate text-xs text-white/65">
            {contextLabel}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Ajuda"
          data-tour="admin-help"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent(
                "pap-tour:restart",
                {
                  detail: {
                    tourKey:
                      "admin-core",
                  },
                },
              ),
            )
          }
          className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition hover:bg-white/10 sm:px-3"
        >
          <HelpCircle
            size={17}
            strokeWidth={1.8}
          />

          <span className="hidden sm:inline">
            Ajuda
          </span>
        </button>

        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white/10"
        >
          <Bell
            size={18}
            strokeWidth={1.8}
          />
        </button>

        <button
          type="button"
          aria-label="Menu do usuário"
          className="ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-white/10 sm:ml-2 sm:px-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xs font-semibold">
            {initials(
              profile.user
                .displayName,
            )}
          </span>

          <span className="hidden max-w-40 truncate text-sm sm:inline">
            {
              profile.user
                .displayName
            }
          </span>

          <ChevronDown
            size={15}
            className="hidden sm:block"
          />
        </button>
      </div>
    </header>
  )
}
