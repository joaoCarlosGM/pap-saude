"use client"

import {
  HelpCircle,
  Bell,
  ChevronDown,
  Menu,
} from "lucide-react"

type TopbarProps = {
  onMenuClick: () => void
}

export default function Topbar({
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-[#064f50] px-3 text-white sm:px-4 lg:px-6">
      {/* Esquerda */}
      <div className="flex min-w-0 items-center gap-2">
        {/* Menu mobile */}
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-white/10 md:hidden"
        >
          <Menu
            size={21}
            strokeWidth={1.8}
          />
        </button>

        <span className="truncate text-sm font-medium">
          Prontuário de Atendimento
        </span>
      </div>

      {/* Direita */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Ajuda */}
        <button
          type="button"
          aria-label="Ajuda"
          className="flex h-9 items-center gap-2 rounded-md px-2 text-sm transition hover:bg-white/10 sm:px-3"
        >
          <HelpCircle
            size={17}
            strokeWidth={1.8}
          />

          <span className="hidden sm:inline">
            Ajuda
          </span>
        </button>

        {/* Notificações */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
        >
          <Bell
            size={18}
            strokeWidth={1.8}
          />

          {/* Indicador de notificação */}
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pink-400" />
        </button>

        {/* Usuário */}
        <button
          type="button"
          aria-label="Menu do usuário"
          className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1.5 transition hover:bg-white/10 sm:ml-2 sm:px-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xs font-medium">
            AP
          </span>

          <span className="hidden text-sm sm:inline">
            Ana Paula
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