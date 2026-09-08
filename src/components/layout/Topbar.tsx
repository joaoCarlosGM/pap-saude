"use client"

import {
  HelpCircle,
  Bell,
  ChevronDown,
} from "lucide-react"

export default function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-[#064f50] px-6 text-white">

      {/* Esquerda */}
      <div className="flex items-center">
        <span className="text-sm font-medium">
          Prontuário de Atendimento
        </span>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-2">

        <button
          className="flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-white/10"
        >
          <HelpCircle size={17} strokeWidth={1.8} />

          <span>Ajuda</span>
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
        >
          <Bell size={18} strokeWidth={1.8} />
        </button>

        <button
          className="ml-2 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-xs font-medium">
            AP
          </span>

          <span className="text-sm">
            Ana Paula
          </span>

          <ChevronDown size={15} />
        </button>

      </div>

    </header>
  )
}