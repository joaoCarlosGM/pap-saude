"use client"

import Link from "next/link"

import {
  useEffect,
  useState,
  useRef,
} from "react"

type InvitationInfo = {
  email: string
  displayName: string
  organizationName: string
  roleKey: string
  expiresAt: string
  requiresPassword: boolean
}

export default function InvitationActivation({
  token: legacyToken,
}: {
  token: string
}) {
  const token = useRef(legacyToken);
  const [
    invitation,
    setInvitation,
  ] =
    useState<
      InvitationInfo | null
    >(null)

  const [
    password,
    setPassword,
  ] =
    useState("")

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const [
    accepted,
    setAccepted,
  ] =
    useState(false)

  useEffect(
    () => {
      token.current ||= new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
      if (window.location.hash || window.location.search)
        window.history.replaceState(null, "", window.location.pathname);
      const newLink = () => window.location.reload();
      window.addEventListener("hashchange", newLink);
      const controller =
        new AbortController()

      void fetch(
        "/api/invitations/accept",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "INSPECT", token: token.current }),
          referrerPolicy: "no-referrer",
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
            setInvitation(
              data.invitation,
            )
          },
        )
        .catch(
          (
            fetchError,
          ) => {
            if (
              fetchError instanceof
                DOMException &&
              fetchError.name ===
                "AbortError"
            ) {
              return
            }

            setError(
              "Este convite é inválido, expirou ou já foi utilizado.",
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

      return () => {
        controller.abort();
        window.removeEventListener("hashchange", newLink);
      }
    },
    [legacyToken],
  )

  async function activate(
    event:
      React.FormEvent,
  ) {
    event.preventDefault()

    if (
      !invitation
    ) {
      return
    }

    setSubmitting(
      true,
    )
    setError(
      null,
    )

    try {
      const response =
        await fetch(
          "/api/invitations/accept",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token: token.current,

                ...(invitation.requiresPassword
                  ? {
                      password,
                    }
                  : {}),
              }),
          },
        )

      if (
        !response.ok
      ) {
        throw new Error()
      }

      setAccepted(
        true,
      )
    } catch {
      setError(
        "Não foi possível ativar o acesso. Verifique o convite e tente novamente.",
      )
    } finally {
      setSubmitting(
        false,
      )
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Validando convite...
      </p>
    )
  }

  if (accepted) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-950">
          Acesso ativado
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Seu vínculo com o PAP Saúde
          foi ativado com sucesso.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-[#064f50] px-5 py-2.5 text-sm font-medium text-white"
        >
          Entrar no PAP Saúde
        </Link>
      </div>
    )
  }

  if (
    error &&
    !invitation
  ) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-950">
          Convite indisponível
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {error}
        </p>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <form
      onSubmit={
        activate
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        PAP Saúde
      </p>

      <h1 className="mt-2 text-2xl font-semibold text-slate-950">
        Ativar acesso
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Olá,{" "}
        <strong>
          {
            invitation.displayName
          }
        </strong>
        . Você foi convidado para
        atuar em{" "}
        <strong>
          {
            invitation.organizationName
          }
        </strong>
        .
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {
          invitation.email
        }
      </p>

      {invitation.requiresPassword && (
        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700">
            Crie sua senha
          </span>

          <input
            type="password"
            value={
              password
            }
            onChange={(
              event,
            ) =>
              setPassword(
                event.target
                  .value,
              )
            }
            minLength={12}
            required
            autoComplete="new-password"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />

          <span className="mt-1 block text-xs text-slate-500">
            Mínimo de 12 caracteres.
          </span>
        </label>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting
        }
        className="mt-6 w-full rounded-xl bg-[#064f50] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting
          ? "Ativando..."
          : "Ativar meu acesso"}
      </button>
    </form>
  )
}
