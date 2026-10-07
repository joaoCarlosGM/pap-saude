"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

type Organization = {
  id: string
  name: string
  type:
    | "PAP"
    | "MUNICIPALITY"
    | "HEALTH_UNIT"
  status: string
}

export default function ProfessionalInviteForm({
  onInvited,
}: {
  onInvited?: () => void
}) {
  const [
    organizations,
    setOrganizations,
  ] =
    useState<
      Organization[]
    >([])

  const [
    displayName,
    setDisplayName,
  ] =
    useState("")

  const [
    email,
    setEmail,
  ] =
    useState("")

  const [
    organizationId,
    setOrganizationId,
  ] =
    useState("")

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false)

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null)

  const [
    developmentUrl,
    setDevelopmentUrl,
  ] =
    useState<
      string | null
    >(null)

  useEffect(
    () => {
      const controller =
        new AbortController()

      void fetch(
        "/api/admin/organizations",
        {
          cache:
            "no-store",

          signal:
            controller.signal,
        },
      )
        .then(
          async (
            response,
          ) => {
            if (
              !response.ok
            ) {
              throw new Error()
            }

            return response.json()
          },
        )
        .then(
          (
            data,
          ) => {
            setOrganizations(
              data.organizations ??
                [],
            )
          },
        )
        .catch(
          () => {},
        )

      return () =>
        controller.abort()
    },
    [],
  )

  const units =
    useMemo(
      () =>
        organizations.filter(
          (
            organization,
          ) =>
            organization.type ===
              "HEALTH_UNIT" &&
            organization.status ===
              "ACTIVE",
        ),
      [
        organizations,
      ],
    )

  const effectiveOrganizationId =
    units.some(
      (
        organization,
      ) =>
        organization.id ===
        organizationId,
    )
      ? organizationId
      : units[0]
          ?.id ??
        ""

  async function submit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault()

    if (
      !effectiveOrganizationId
    ) {
      return
    }

    setSubmitting(
      true,
    )
    setMessage(
      null,
    )
    setDevelopmentUrl(
      null,
    )

    try {
      const response =
        await fetch(
          "/api/admin/invitations",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                displayName,
                email,
                organizationId:
                  effectiveOrganizationId,
              }),
          },
        )

      const data =
        await response.json()

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "INVITE_FAILED",
        )
      }

      setDisplayName(
        "",
      )
      setEmail(
        "",
      )

      setMessage(
        "Convite criado com sucesso.",
      )

      setDevelopmentUrl(
        data.developmentUrl ??
          null,
      )

      onInvited?.()
    } catch {
      setMessage(
        "Não foi possível enviar o convite.",
      )
    } finally {
      setSubmitting(
        false,
      )
    }
  }

  return (
    <form
      onSubmit={
        submit
      }
      className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold text-slate-950">
        Convidar profissional
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        O profissional receberá
        acesso à UBS selecionada.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label>
          <span className="text-sm font-medium text-slate-700">
            Nome
          </span>

          <input
            value={
              displayName
            }
            onChange={(
              event,
            ) =>
              setDisplayName(
                event.target
                  .value,
              )
            }
            required
            maxLength={200}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">
            E-mail
          </span>

          <input
            type="email"
            value={
              email
            }
            onChange={(
              event,
            ) =>
              setEmail(
                event.target
                  .value,
              )
            }
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">
            UBS
          </span>

          <select
            value={
              effectiveOrganizationId
            }
            onChange={(
              event,
            ) =>
              setOrganizationId(
                event.target
                  .value,
              )
            }
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {units.map(
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
      </div>

      <button
        type="submit"
        disabled={
          submitting ||
          !effectiveOrganizationId
        }
        className="mt-5 rounded-xl bg-[#064f50] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting
          ? "Enviando..."
          : "Enviar convite"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-slate-600">
          {message}
        </p>
      )}

      {developmentUrl && (
        <div className="mt-3 break-all rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Ambiente de desenvolvimento:
          {" "}
          {developmentUrl}
        </div>
      )}
    </form>
  )
}
