"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type Role = {
  key: string
  name: string
  description: string
  scope:
    | "GLOBAL"
    | "MUNICIPALITY"
    | "HEALTH_UNIT"
  permissions: string[]
}

type Assignment = {
  id: string
  organizationId: string | null
  user: {
    id: string
    email: string
    displayName: string
    isActive: boolean
  }
  role: {
    key: string
    name: string
  }
  organization: {
    id: string
    name: string
    type: string
  } | null
}

type User = {
  id: string
  email: string
  displayName: string
  isActive: boolean
}

type Organization = {
  id: string
  name: string
  type:
    | "PAP"
    | "MUNICIPALITY"
    | "HEALTH_UNIT"
  status: string
}

export default function AccessAdminClient() {
  const [
    roles,
    setRoles,
  ] =
    useState<Role[]>([])

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      Assignment[]
    >([])

  const [
    users,
    setUsers,
  ] =
    useState<User[]>([])

  const [
    organizations,
    setOrganizations,
  ] =
    useState<
      Organization[]
    >([])

  const [
    canManage,
    setCanManage,
  ] =
    useState(false)

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
    selectedUser,
    setSelectedUser,
  ] =
    useState("")

  const [
    selectedRole,
    setSelectedRole,
  ] =
    useState("")

  const [
    selectedOrganization,
    setSelectedOrganization,
  ] =
    useState("")

  const load =
    useCallback(
      async () => {
        setError(
          null,
        )

        const roleResponse = await fetch("/api/admin/roles", { cache: "no-store" });
        if (!roleResponse.ok) throw new Error();
        const roleData = await roleResponse.json();
        let userData: { users: User[] },
          organizationData: { organizations: Organization[] };
        if (roleData.delegated) {
          userData = { users: roleData.assignableUsers ?? [] };
          organizationData = { organizations: [] };
        } else {
          const responses = await Promise.all([
            fetch("/api/admin/users", { cache: "no-store" }),
            fetch("/api/admin/organizations", { cache: "no-store" }),
          ]);
          if (responses.some((r) => !r.ok)) throw new Error();
          [userData, organizationData] = await Promise.all(
            responses.map((r) => r.json()),
          );
        }

        setRoles(
          roleData.roles ??
            [],
        )

        setAssignments(
          roleData.assignments ??
            [],
        )

        setCanManage(
          roleData.canManage ===
            true,
        )

        setUsers(
          userData.users ??
            [],
        )

        setOrganizations(
          organizationData.organizations ??
            [],
        )
      },
      [],
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
                    "Não foi possível carregar a matriz de acesso.",
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

  const currentRole =
    roles.find(
      (
        role,
      ) =>
        role.key ===
        selectedRole,
    ) ??
    roles[0] ??
    null

  const effectiveRoleKey =
    currentRole?.key ??
    ""

  const validOrganizations =
    useMemo(
      () => {
        if (
          !currentRole ||
          currentRole.scope ===
          "GLOBAL"
        ) {
          return []
        }

        return organizations.filter(
          (
            organization,
          ) =>
            organization.status ===
              "ACTIVE" &&
            (
              currentRole.scope ===
                "MUNICIPALITY"
                ? organization.type ===
                  "MUNICIPALITY"
                : organization.type ===
                  "HEALTH_UNIT"
            ),
        )
      },
      [
        organizations,
        currentRole,
      ],
    )

  const effectiveOrganizationId =
    validOrganizations.some(
      (
        organization,
      ) =>
        organization.id ===
        selectedOrganization,
    )
      ? selectedOrganization
      : validOrganizations[0]
          ?.id ??
        ""

  const effectiveUserId =
    users.some(
      (
        user,
      ) =>
        user.id ===
        selectedUser,
    )
      ? selectedUser
      : users[0]
          ?.id ??
        ""

  async function assignRole(
    event:
      React.FormEvent,
  ) {
    event.preventDefault()

    if (
      !currentRole ||
      !effectiveUserId
    ) {
      return
    }

    if (
      currentRole.scope !==
        "GLOBAL" &&
      !effectiveOrganizationId
    ) {
      return
    }

    setError(
      null,
    )

    const response =
      await fetch(
        "/api/admin/role-assignments",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              userId:
                effectiveUserId,

              roleKey:
                effectiveRoleKey,

              organizationId:
                currentRole.scope ===
                "GLOBAL"
                  ? null
                  : effectiveOrganizationId,
            }),
        },
      )

    if (
      !response.ok
    ) {
      const body =
        await response
          .json()
          .catch(
            () => null,
          )

      setError(
        body?.error ===
          "ACTIVE_MEMBERSHIP_REQUIRED"
          ? "O usuário precisa possuir membership ativo na organização."
          : "Não foi possível atribuir o papel.",
      )

      return
    }

    await load()
  }

  async function revokeRole(
    assignmentId:
      string,
  ) {
    setError(
      null,
    )

    const response =
      await fetch(
        `/api/admin/role-assignments/${assignmentId}`,
        {
          method:
            "DELETE",
        },
      )

    if (
      !response.ok
    ) {
      const body =
        await response
          .json()
          .catch(
            () => null,
          )

      setError(
        body?.error ===
          "LAST_PAP_ADMIN"
          ? "O último PAP Admin ativo não pode ser removido."
          : "Não foi possível revogar o papel.",
      )

      return
    }

    await load()
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Carregando matriz de acesso...
      </p>
    )
  }

  return (
    <section className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
        Governança PAP
      </p>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        Papéis e permissões
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Matriz efetiva dos papéis
        reconhecidos pelo backend.
        Papéis customizados permanecem
        bloqueados até possuírem modelo
        de escopo explícito.
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {roles.map(
          (
            role,
          ) => (
            <article
              key={
                role.key
              }
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    {
                      role.name
                    }
                  </h2>

                  <p className="mt-1 text-xs font-medium text-[#064f50]">
                    {
                      role.scope
                    }
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {
                    role.permissions
                      .length
                  }{" "}
                  permissões
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {
                  role.description
                }
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {role.permissions.map(
                  (
                    permission,
                  ) => (
                    <span
                      key={
                        permission
                      }
                      className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
                    >
                      {
                        permission
                      }
                    </span>
                  ),
                )}
              </div>
            </article>
          ),
        )}
      </div>

      {canManage && (
        <form
          onSubmit={
            assignRole
          }
          className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-slate-950">
            Atribuir papel
          </h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label>
              <span className="text-sm font-medium text-slate-700">
                Usuário
              </span>

              <select
                value={
                  effectiveUserId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedUser(
                    event.target
                      .value,
                  )
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {users.map(
                  (
                    user,
                  ) => (
                    <option
                      key={
                        user.id
                      }
                      value={
                        user.id
                      }
                    >
                      {
                        user.displayName
                      }
                      {" · "}
                      {
                        user.email
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                Papel
              </span>

              <select
                value={
                  effectiveRoleKey
                }
                onChange={(
                  event,
                ) =>
                  setSelectedRole(
                    event.target
                      .value,
                  )
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {roles.map(
                  (
                    role,
                  ) => (
                    <option
                      key={
                        role.key
                      }
                      value={
                        role.key
                      }
                    >
                      {
                        role.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            {currentRole?.scope !==
              "GLOBAL" && (
              <label>
                <span className="text-sm font-medium text-slate-700">
                  Organização
                </span>

                <select
                  value={
                    effectiveOrganizationId
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedOrganization(
                      event.target
                        .value,
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  {validOrganizations.map(
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
            )}
          </div>

          <button
            type="submit"
            disabled={
              !effectiveUserId ||
              !currentRole ||
              (
                currentRole.scope !==
                  "GLOBAL" &&
                !effectiveOrganizationId
              )
            }
            className="mt-5 rounded-xl bg-[#064f50] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Atribuir papel
          </button>
        </form>
      )}

      <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">
            Atribuições efetivas
          </h2>
        </div>

        {assignments.length ===
          0 ? (
          <p className="p-5 text-sm text-slate-500">
            Nenhuma atribuição visível.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map(
              (
                assignment,
              ) => (
                <div
                  key={
                    assignment.id
                  }
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {
                        assignment.user
                          .displayName
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        assignment.role
                          .name
                      }
                      {" · "}
                      {assignment.organization
                        ?.name ??
                        "Global"}
                    </p>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        void revokeRole(
                          assignment.id,
                        )
                      }
                      className="self-start rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 sm:self-auto"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
