"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

type SecurityUser = {
  id: string
  email: string
  displayName: string
  isActive: boolean

  mfa: {
    activeFactors: number
    pendingFactors: number
    unusedRecoveryCodes: number
  }

  sessions: {
    active: number

    items: Array<{
      id: string
      createdAt: string
      expiresAt: string
      lastSeenAt: string
      userAgent: string | null
    }>
  }
}

export default function SecurityAdminClient() {
  const [
    users,
    setUsers,
  ] =
    useState<
      SecurityUser[]
    >([])

  const [page,setPage]=useState(1)

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

  const load =
    useCallback(
      async () => {
        const response =
          await fetch(
            `/api/admin/security?page=${page}`,
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

        setUsers(
          data.users ??
            [],
        )
      },
      [page],
    )

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void load()
              .catch(
                () => {
                  setError(
                    "Não foi possível carregar a postura de segurança.",
                  )
                },
              )
              .finally(
                () => {
                  setLoading(
                    false,
                  )
                },
              )
          },
          0,
        )

      return () => {
        window.clearTimeout(
          timer,
        )
      }
    },
    [
      load,
    ],
  )

  async function action(
    body:
      Record<
        string,
        unknown
      >,
  ) {
    setError(
      null,
    )

    const response =
      await fetch(
        "/api/admin/security",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              body,
            ),
        },
      )

    if (
      !response.ok
    ) {
      setError(
        "A operação de segurança não pôde ser concluída.",
      )

      return
    }

    await load()
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Carregando segurança...
      </p>
    )
  }

  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        F04.5
      </p>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        Segurança
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Postura MFA e sessões
        autenticadas. Tokens,
        segredos TOTP e hashes não
        são expostos nesta interface.
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="button" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded border p-2 disabled:opacity-50">Anterior</button>
        <span>Página {page}</span>
        <button type="button" disabled={users.length<25} onClick={()=>setPage(p=>p+1)} className="rounded border p-2 disabled:opacity-50">Próxima</button>
      </div>
      <div className="mt-7 space-y-4">
        {users.map(
          (
            user,
          ) => (
            <article
              key={
                user.id
              }
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-950">
                      {
                        user.displayName
                      }
                    </h2>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
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

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[#064f50]/10 px-2.5 py-1 text-[#064f50]">
                    MFA ativo:{" "}
                    {
                      user.mfa
                        .activeFactors
                    }
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    Recovery codes:{" "}
                    {
                      user.mfa
                        .unusedRecoveryCodes
                    }
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    Sessões:{" "}
                    {
                      user.sessions
                        .active
                    }
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void action({
                      action:
                        "RESET_MFA",

                      targetUserId:
                        user.id,

                      reason:
                        "Administrative security reset",
                    })
                  }
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Resetar MFA
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void action({
                      action:
                        "REVOKE_ALL_SESSIONS",

                      targetUserId:
                        user.id,
                    })
                  }
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Revogar todas as sessões
                </button>
              </div>

              {user.sessions.items.length >
                0 && (
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sessões ativas
                  </div>

                  <div className="divide-y divide-slate-100">
                    {user.sessions.items.map(
                      (
                        session,
                      ) => (
                        <div
                          key={
                            session.id
                          }
                          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-700">
                              {
                                session.userAgent ??
                                "Dispositivo não identificado"
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Última atividade:{" "}
                              {new Date(
                                session.lastSeenAt,
                              ).toLocaleString(
                                "pt-BR",
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void action({
                                action:
                                  "REVOKE_SESSION",

                                targetUserId:
                                  user.id,

                                sessionId:
                                  session.id,
                              })
                            }
                            className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:self-auto"
                          >
                            Revogar
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </article>
          ),
        )}
      </div>
    </section>
  )
}
