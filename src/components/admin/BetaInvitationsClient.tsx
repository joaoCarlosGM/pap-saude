"use client";
import { useState } from "react";
import { BetaTitle, DataState, useBetaData } from "./BetaWidgets";
type Org = { id: string; name: string; type: string; status: string; isActive: boolean };
type Row = {
  id: string;
  email: string;
  displayName: string;
  roleKey: string;
  status: string;
  deliveryStatus: string;
  expiresAt: string;
  createdAt: string;
};
function History({
  organizationId,
  allowBootstrap,
}: {
  organizationId: string;
  allowBootstrap: boolean;
}) {
  const [page, setPage] = useState(1),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const result = useBetaData<{ rows: Row[]; total: number }>(
    `/api/admin/beta/invitations?organizationId=${organizationId}&page=${page}`,
  );
  async function action(
    operation: string,
    id?: string,
    fields?: Record<string, string>,
  ) {
    if (
      !window.confirm(
        operation === "REVOKE"
          ? "Revogar este convite?"
          : "Enviar convite individual? Reenvios invalidam links anteriores.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/beta/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, organizationId, id, ...fields }),
      });
      if (!r.ok)
        throw new Error(
          "Operação não concluída. Atualize o histórico: falhas de envio revogam o link e permitem novo envio seguro.",
        );
      setMessage(
        operation === "REVOKE"
          ? "Convite revogado."
          : "Tentativa registrada. Consulte o estado do provedor abaixo; envio não comprova recebimento.",
      );
      result.refresh();
    } catch (e) {
      setMessage((e as Error).message);
      result.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <form
        className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action("INVITE", undefined, {
            displayName: String(f.get("displayName")),
            email: String(f.get("email")),
          });
        }}
      >
        <label>
          Nome do profissional
          <input
            required
            name="displayName"
            minLength={2}
            maxLength={200}
            className="mt-1 w-full rounded-xl border p-3"
          />
        </label>
        <label>
          E-mail
          <input
            required
            type="email"
            name="email"
            maxLength={254}
            className="mt-1 w-full rounded-xl border p-3"
          />
        </label>
        <button
          disabled={busy}
          className="rounded-xl bg-[#064f50] p-3 text-white disabled:opacity-40"
        >
          Convidar profissional
        </button>
      </form>
      {allowBootstrap && (
        <button
          disabled={busy}
          className="rounded-xl border p-3"
          onClick={() => action("BOOTSTRAP")}
        >
          Enviar convite ao responsável aprovado (PAP)
        </button>
      )}
      <p className="text-sm text-slate-600">
        O convite inaugural usa o contato validado da solicitação e exige PAP
        Admin. Um administrador UBS pode convidar somente profissionais na sua
        unidade.
      </p>
      <p role="status">{message}</p>
      <DataState {...result} />
      {!result.loading && !result.error && result.data && (
        <>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Pessoa",
                    "Papel",
                    "Aceite",
                    "Envio",
                    "Validade",
                    "Ações",
                  ].map((x) => (
                    <th className="p-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((r) => (
                  <tr className="border-t" key={r.id}>
                    <td className="p-3">
                      {r.displayName}
                      <br />
                      {r.email}
                    </td>
                    <td>{r.roleKey}</td>
                    <td>{r.status}</td>
                    <td>
                      {r.deliveryStatus === "SENT"
                        ? "Aceito pelo Resend; entrega não confirmada"
                        : r.deliveryStatus}
                    </td>
                    <td>{new Date(r.expiresAt).toLocaleString("pt-BR")}</td>
                    <td>
                      {r.status !== "ACCEPTED" && (
                        <div className="flex gap-3">
                          <button
                            disabled={busy}
                            onClick={() => action("RESEND", r.id)}
                            className="underline"
                          >
                            Reenviar
                          </button>
                          {r.status === "PENDING" && (
                            <button
                              disabled={busy}
                              onClick={() => action("REVOKE", r.id)}
                              className="underline"
                            >
                              Revogar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.data.rows.length && (
              <p className="p-5">Nenhum convite nesta unidade.</p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                result.refresh();
              }}
            >
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              disabled={page * 20 >= result.data.total}
              onClick={() => {
                setPage((p) => p + 1);
                result.refresh();
              }}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export default function BetaInvitationsClient() {
  const [organizationId, setOrganizationId] = useState("");
  const context = useBetaData<{
    profile: { roles: { key: string; scope: string }[] };
  }>("/api/admin/context");
  const orgs = useBetaData<{ organizations: Org[] }>(
    "/api/admin/organizations",
  );
  return (
    <section className="mx-auto max-w-6xl">
      <BetaTitle
        title="Convites institucionais"
        description="Convites individuais, temporários e de uso único. MFA obrigatório. Nenhum token é exibido nesta área."
      />
      <DataState {...orgs} />
      <label className="mb-6 block">
        Unidade autorizada{" "}
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className="ml-3 rounded-xl border p-3"
        >
          <option value="">Selecione uma UBS</option>
          {orgs.data?.organizations
            ?.filter((o) => o.type === "HEALTH_UNIT" && o.status === "ACTIVE" && o.isActive)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
      </label>
      {organizationId && (
        <History
          key={organizationId}
          organizationId={organizationId}
          allowBootstrap={Boolean(
            context.data?.profile.roles.some(
              (r) => ["PAP_ADMIN", "PAP_MANAGER"].includes(r.key) && r.scope === "GLOBAL",
            ),
          )}
        />
      )}
    </section>
  );
}
