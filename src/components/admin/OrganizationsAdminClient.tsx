"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type Organization = {
  id: string
  type:
    | "PAP"
    | "MUNICIPALITY"
    | "HEALTH_UNIT"
  status:
    | "PENDING_VERIFICATION"
    | "ACTIVE"
    | "SUSPENDED"
    | "ARCHIVED"
  name: string
  code: string | null
  cnes: string | null
  cnpj: string | null
  city: string | null
  state: string | null
  parentId: string | null
  parent: {
    id: string
    name: string
    type: string
  } | null
  _count: {
    children: number
    memberships: number
    patientLinks: number
    encounters: number
  }
}

function statusLabel(
  status:
    Organization["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "Ativa"
    case "SUSPENDED":
      return "Suspensa"
    case "ARCHIVED":
      return "Arquivada"
    default:
      return "Pendente"
  }
}

function typeLabel(
  type:
    Organization["type"],
) {
  switch (type) {
    case "PAP":
      return "PAP"
    case "MUNICIPALITY":
      return "Município"
    case "HEALTH_UNIT":
      return "UBS"
  }
}

export default function OrganizationsAdminClient() {
  const [
    organizations,
    setOrganizations,
  ] =
    useState<
      Organization[]
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

  const [
    creating,
    setCreating,
  ] =
    useState(false)

  const [
    type,
    setType,
  ] =
    useState<
      "MUNICIPALITY" |
      "HEALTH_UNIT"
    >(
      "HEALTH_UNIT",
    )

  const [
    name,
    setName,
  ] =
    useState("")

  const [
    parentId,
    setParentId,
  ] =
    useState("")

  const [
    cnes,
    setCnes,
  ] =
    useState("")

  const [
    city,
    setCity,
  ] =
    useState("")

  const [
    state,
    setState,
  ] =
    useState("PA")

  const load =
    useCallback(
      async () => {
        setLoading(true)
        setError(null)

        try {
          const response =
            await fetch(
              "/api/admin/organizations",
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

          setOrganizations(
            data.organizations ??
              [],
          )
        } catch {
          setError(
            "Não foi possível carregar as organizações.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void load()
          },
          0,
        )

      return () => {
        window.clearTimeout(
          timer,
        )
      }
    },
    [load],
  )

  const possibleParents =
    useMemo(
      () =>
        organizations.filter(
          (organization) =>
            type ===
            "MUNICIPALITY"
              ? organization.type ===
                "PAP"
              : organization.type ===
                "MUNICIPALITY",
        ),
      [
        organizations,
        type,
      ],
    )

  const effectiveParentId =
    possibleParents.some(
      (organization) =>
        organization.id ===
        parentId,
    )
      ? parentId
      : possibleParents[0]
          ?.id ??
        ""

  async function createOrganization(
    event:
      React.FormEvent,
  ) {
    event.preventDefault()

    if (
      !name.trim() ||
      !effectiveParentId
    ) {
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response =
        await fetch(
          "/api/admin/organizations",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  type,
                  name,
                  parentId:
                    effectiveParentId,
                  cnes:
                    type ===
                    "HEALTH_UNIT"
                      ? cnes
                      : null,
                  city,
                  state,
                },
              ),
          },
        )

      if (
        !response.ok
      ) {
        throw new Error()
      }

      setName("")
      setCnes("")

      await load()
    } catch {
      setError(
        "Não foi possível criar a organização. Verifique os dados e seu escopo de acesso.",
      )
    } finally {
      setCreating(false)
    }
  }

  async function mutate(
    organizationId:
      string,
    operation:
      | "ACTIVATE"
      | "SUSPEND"
      | "ARCHIVE",
  ) {
    setError(null)

    try {
      const response =
        await fetch(
          `/api/admin/organizations/${organizationId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  operation,
                },
              ),
          },
        )

      if (
        !response.ok
      ) {
        throw new Error()
      }

      await load()
    } catch {
      setError(
        "A operação não pôde ser concluída.",
      )
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        F04.2
      </p>

      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Organizações
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Estrutura institucional
            PAP → Município → UBS.
            As ações disponíveis são
            limitadas pelo escopo real
            do administrador autenticado.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          onSubmit={
            createOrganization
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-slate-950">
            Nova organização
          </h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Tipo
              </span>

              <select
                value={type}
                onChange={(
                  event,
                ) =>
                  setType(
                    event.target
                      .value as
                      | "MUNICIPALITY"
                      | "HEALTH_UNIT",
                  )
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="HEALTH_UNIT">
                  UBS
                </option>

                <option value="MUNICIPALITY">
                  Município
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Nome
              </span>

              <input
                value={name}
                onChange={(
                  event,
                ) =>
                  setName(
                    event.target
                      .value,
                  )
                }
                maxLength={200}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Organização superior
              </span>

              <select
                value={
                  effectiveParentId
                }
                onChange={(
                  event,
                ) =>
                  setParentId(
                    event.target
                      .value,
                  )
                }
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {possibleParents.map(
                  (
                    organization,
                  ) => (
                    <option
                      key={
                        organization.id
                      }
                      value={
                        organization.id
                      }
                    >
                      {
                        organization.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            {type ===
              "HEALTH_UNIT" && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  CNES
                </span>

                <input
                  value={
                    cnes
                  }
                  onChange={(
                    event,
                  ) =>
                    setCnes(
                      event.target
                        .value,
                    )
                  }
                  inputMode="numeric"
                  maxLength={7}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>
            )}

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Cidade
                </span>

                <input
                  value={
                    city
                  }
                  onChange={(
                    event,
                  ) =>
                    setCity(
                      event.target
                        .value,
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  UF
                </span>

                <input
                  value={
                    state
                  }
                  onChange={(
                    event,
                  ) =>
                    setState(
                      event.target
                        .value
                        .toUpperCase()
                        .slice(
                          0,
                          2,
                        ),
                    )
                  }
                  maxLength={2}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={
                creating ||
                !effectiveParentId
              }
              className="w-full rounded-xl bg-[#064f50] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#043f40] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Criando..."
                : "Criar organização"}
            </button>
          </div>
        </form>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-950">
              Estrutura disponível
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Carregando...
            </div>
          ) : organizations.length ===
            0 ? (
            <div className="p-6 text-sm text-slate-500">
              Nenhuma organização
              disponível para seu
              perfil.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {organizations.map(
                (
                  organization,
                ) => (
                  <div
                    key={
                      organization.id
                    }
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-slate-950">
                            {
                              organization.name
                            }
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {typeLabel(
                              organization.type,
                            )}
                          </span>

                          <span className="rounded-full bg-[#064f50]/10 px-2 py-0.5 text-xs font-medium text-[#064f50]">
                            {statusLabel(
                              organization.status,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {organization.parent
                            ? `${organization.parent.name} · `
                            : ""}
                          {organization.city ??
                            "Cidade não informada"}
                          {organization.state
                            ? `/${organization.state}`
                            : ""}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>
                            {
                              organization
                                ._count
                                .memberships
                            }{" "}
                            usuários
                          </span>

                          <span>
                            {
                              organization
                                ._count
                                .patientLinks
                            }{" "}
                            pacientes
                          </span>

                          <span>
                            {
                              organization
                                ._count
                                .encounters
                            }{" "}
                            atendimentos
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {organization.status !==
                          "ACTIVE" &&
                          organization.status !==
                            "ARCHIVED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void mutate(
                                  organization.id,
                                  "ACTIVATE",
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Ativar
                            </button>
                          )}

                        {organization.status ===
                          "ACTIVE" &&
                          organization.type !==
                            "PAP" && (
                            <button
                              type="button"
                              onClick={() =>
                                void mutate(
                                  organization.id,
                                  "SUSPEND",
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Suspender
                            </button>
                          )}

                        {organization.type !==
                          "PAP" &&
                          organization.status !==
                            "ARCHIVED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void mutate(
                                  organization.id,
                                  "ARCHIVE",
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Arquivar
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
