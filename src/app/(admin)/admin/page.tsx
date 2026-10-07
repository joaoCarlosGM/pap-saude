import {
  Building2,
  ShieldCheck,
  Users,
} from "lucide-react"

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        PAP Admin
      </p>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        Central Administrativa
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
        Gerencie a estrutura organizacional,
        usuários e controles de acesso da
        plataforma PAP Saúde.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Building2
            className="text-[#064f50]"
            size={22}
            strokeWidth={1.8}
          />

          <h2 className="mt-4 font-semibold text-slate-950">
            Organizações
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Estrutura PAP, municípios e
            unidades de saúde.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Users
            className="text-[#064f50]"
            size={22}
            strokeWidth={1.8}
          />

          <h2 className="mt-4 font-semibold text-slate-950">
            Pessoas
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Usuários, profissionais,
            memberships e convites.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck
            className="text-[#064f50]"
            size={22}
            strokeWidth={1.8}
          />

          <h2 className="mt-4 font-semibold text-slate-950">
            Acesso
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Papéis, escopos e permissões
            efetivas por usuário.
          </p>
        </div>
      </div>
    </section>
  )
}
