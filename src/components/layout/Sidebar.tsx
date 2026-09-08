"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardPlus,
  ClipboardList,
  Users,
  MessageSquare,
  BookOpen,
  Wrench,
  FolderOpen,
  LayoutDashboard,
  Settings,
} from "lucide-react"

const menuItems = [
  {
    label: "Registro",
    href: "/registro",
    icon: ClipboardPlus,
  },
  {
    label: "Atendimentos",
    href: "/atendimentos",
    icon: ClipboardList,
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: Users,
  },
  {
    label: "Chat IA",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    label: "Protocolos",
    href: "/protocolos",
    icon: BookOpen,
  },
  {
    label: "Ferramentas",
    href: "/ferramentas",
    icon: Wrench,
  },
  {
    label: "Casos",
    href: "/casos",
    icon: FolderOpen,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">

      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-100 px-5">
        <span className="text-xl font-semibold text-pink-500">
          PAP Saúde
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4">

        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon

            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-pink-50 font-medium text-pink-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                ].join(" ")}
              >
                <Icon size={18} strokeWidth={1.8} />

                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

      </nav>

      {/* Rodapé */}
      <div className="border-t border-gray-100 p-3">

        <Link
          href="/configuracoes"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Settings size={18} strokeWidth={1.8} />

          <span>Configurações</span>
        </Link>

        <div className="mt-3 border-t border-gray-100 px-3 pt-3">
          <p className="text-sm font-medium text-gray-900">
            Dr. Ana Paula
          </p>

          <p className="mt-0.5 text-xs text-gray-400">
            Profissional de saúde
          </p>
        </div>

      </div>

    </aside>
  )
}