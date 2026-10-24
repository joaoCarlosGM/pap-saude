"use client";

import { ChevronDown, HelpCircle, Menu } from "lucide-react";

import type { EffectiveAccessProfile } from "@/lib/admin/types";

type AdminTopbarProps = {
  onMenuClick: () => void;
  profile: EffectiveAccessProfile;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "PA";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminTopbar({
  onMenuClick,
  profile,
}: AdminTopbarProps) {
  const hasGlobalScope = profile.roles.some((role) => role.scope === "GLOBAL");

  const contextLabel = hasGlobalScope
    ? "Escopo global"
    : (profile.organizations[0]?.name ?? "Administração");

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 text-[#172c2c] sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#28484b] md:hidden"
        >
          <Menu size={21} strokeWidth={1.8} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Central Administrativa</p>

          <p className="truncate text-xs text-slate-600">{contextLabel}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <a href="/notificacoes" className="rounded-lg px-2 py-3 text-sm underline" aria-label="Minhas notificações">Notificações</a>
        <button
          type="button"
          aria-label="Ajuda"
          data-tour="admin-help"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("pap-tour:restart", {
                detail: {
                  tourKey: "admin-core",
                },
              }),
            )
          }
          className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm hover:bg-slate-100 dark:hover:bg-[#28484b] sm:px-3"
        >
          <HelpCircle size={17} strokeWidth={1.8} />

          <span className="hidden sm:inline">Ajuda</span>
        </button>

        <a
          href="/admin/minha-seguranca"
          aria-label="Minha segurança e perfil"
          className="ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-100 dark:hover:bg-[#28484b] sm:ml-2 sm:px-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#064f50] text-white text-xs font-semibold">
            {initials(profile.user.displayName)}
          </span>

          <span className="hidden max-w-40 truncate text-sm sm:inline">
            {profile.user.displayName}
          </span>

          <ChevronDown size={15} className="hidden sm:block" />
        </a>
      </div>
    </header>
  );
}
