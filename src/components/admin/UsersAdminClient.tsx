"use client"

import {
  useEffect,
  useState,
} from "react"

import ProfessionalInviteForm from "@/components/admin/ProfessionalInviteForm"

type AdminUser = {
  id: string
  email: string
  displayName: string
  isActive: boolean
  createdAt: string
  memberships: Array<{
    id: string
    status: string
    organization: {
      id: string
      name: string
      type: string
    }
  }>
  roleAssignments: Array<{
    id: string
    role: {
      key: string
      name: string
    }
    organization: {
      id: string
      name: string
      type: string
    } | null
  }>
}

export default function UsersAdminClient() {
  const [
    users,
    setUsers,
  ] =
    useState<
      AdminUser[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  useEffect(
    () => {
      let active =
        true

      void (
        async () => {
          try {
            const response =
              await fetch(
                "/api/admin/users",
                {
                  cache:
                    "no-store",
                },
              )

            if (
              !response.ok
            ) {
              throw new Error()
            }

            const data =
              await response.json()

            if (active) {
              setUsers(
                data.users ??
                  [],
              )
            }
          } catch {
            if (active) {
              setError(
                "Não foi possível carregar os usuários.",
              )
            }
          } finally {
            if (active) {
              setLoading(
                false,
              )
            }
          }
        }
      )()

      return () => {
        active =
          false
      }
    },
    [],
  )

  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        F04.3
      </p>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        Usuários e vínculos
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Diretório real de usuários,
        memberships e papéis visíveis
        dentro do seu escopo
        administrativo.
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ProfessionalInviteForm />

      <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Carregando...
          </div>
        ) : users.length ===
          0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nenhum usuário
            disponível para seu
            escopo.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map(
              (user) => (
                <div
                  key={
                    user.id
                  }
                  className="p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium text-slate-950">
                          {
                            user.displayName
                          }
                        </h2>

                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600",
                          ].join(
                            " ",
                          )}
                        >
                          {user.isActive
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {
                          user.email
                        }
                      </p>
                    </div>

                    <div className="min-w-0 lg:max-w-xl">
                      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                        {user.roleAssignments.map(
                          (
                            assignment,
                          ) => (
                            <span
                              key={
                                assignment.id
                              }
                              className="rounded-full bg-[#064f50]/10 px-2.5 py-1 text-xs font-medium text-[#064f50]"
                            >
                              {
                                assignment
                                  .role
                                  .name
                              }
                              {assignment.organization
                                ? ` · ${assignment.organization.name}`
                                : " · Global"}
                            </span>
                          ),
                        )}

                        {user.roleAssignments.length ===
                          0 && (
                          <span className="text-xs text-slate-400">
                            Sem papel
                            visível
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap justify-start gap-2 lg:justify-end">
                        {user.memberships.map(
                          (
                            membership,
                          ) => (
                            <span
                              key={
                                membership.id
                              }
                              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                            >
                              {
                                membership
                                  .organization
                                  .name
                              }
                              {" · "}
                              {
                                membership.status
                              }
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Convites por e-mail,
        ativação descartável e criação
        de memberships entram no
        próximo slice F04.3B.
      </div>
    </section>
  )
}
