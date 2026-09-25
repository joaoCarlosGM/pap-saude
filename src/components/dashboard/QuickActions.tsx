import Link from "next/link"

import {
  BookOpen,
  ClipboardPlus,
  Search,
  Users,
} from "lucide-react"

const actions = [
  {
    label: "Novo atendimento",
    description:
      "Registrar atendimento",
    href: "/registro",
    icon: ClipboardPlus,
  },
  {
    label: "Buscar paciente",
    description:
      "Consultar prontuários",
    href: "/pacientes",
    icon: Users,
  },
  {
    label: "Atendimentos",
    description:
      "Consultar histórico",
    href: "/atendimentos",
    icon: Search,
  },
  {
    label: "Protocolos",
    description:
      "Consultar documentos",
    href: "/protocolos",
    icon: BookOpen,
  },
]

export default function QuickActions() {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Ações rápidas
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-pink-200 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-500 transition group-hover:bg-pink-100">
                <Icon size={17} />
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-800">
                {action.label}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {action.description}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}