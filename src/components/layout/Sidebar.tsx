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
  X,
  GraduationCap,
  Bot,
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
  icon: Bot,
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
  label: "Cursos",
  href: "/cursos",
  icon: GraduationCap,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay — somente mobile */}
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col",
          "border-r border-gray-200 bg-white",
          "transform transition-transform duration-200 ease-in-out",
          "md:static md:z-auto md:w-56 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5">
          <span className="text-xl font-semibold text-pink-500">
            PAP Saúde
          </span>

          {/* Fechar — somente mobile */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 md:hidden"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon

              const active = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "flex items-center gap-3 rounded-md px-3 py-2.5",
                    "text-sm transition-colors",
                    active
                      ? "bg-pink-50 font-medium text-pink-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  ].join(" ")}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0"
                  />

                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Rodapé */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          <Link
            href="/configuracoes"
            onClick={onClose}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Settings
              size={18}
              strokeWidth={1.8}
            />

            <span>Configurações</span>
          </Link>

          <div className="mt-3 border-t border-gray-100 px-3 pt-3">
            <p className="truncate text-sm font-medium text-gray-900">
              Dr. Ana Paula
            </p>

            <p className="mt-0.5 truncate text-xs text-gray-400">
              Profissional de saúde
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}