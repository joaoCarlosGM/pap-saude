"use client";

import { emailDeliveryLabel } from "@/lib/email-delivery";
import { useRef, useState } from "react";
import { useBetaData, DataState } from "./BetaWidgets";
import "@/components/access/access.css";
const labels: Record<string, string> = {
  PENDING_ACCEPTANCE: "Aguardando aceite",
  PENDING_ASSIGNMENT: "Aguardando atribuição",
  ACTIVE: "Perfil autorizado",
  REJECTED: "Não autorizado",
  EXPIRED: "Convite expirado",
  REVOKED: "Revogado",
};
const roles: Record<string, string> = {
  PAP_MANAGER: "Gerente PAP",
  COMMERCIAL: "Comercial",
  PROFESSIONAL: "Profissional",
  HEALTH_UNIT_ADMIN: "Responsável de UBS",
  MUNICIPAL_ADMIN: "Administrador municipal",
};
type Row = {
  id: string;
  email: string;
  displayName: string;
  proposedRoleKey: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  decisionReason: string | null;
  deliveryStatus: string;
  releaseEmailStatus: string | null;
};
type Organization = {
  id: string;
  name: string;
  type: string;
  status: string;
  isActive: boolean;
};
type Queue = { rows: Row[]; total: number; pageSize: number; full: boolean };
function Review({
  row,
  full,
  busy,
  action,
}: {
  row: Row;
  full: boolean;
  busy: boolean;
  action: (body: Record<string, unknown>) => Promise<void>;
}) {
  const role = row.proposedRoleKey;
  const [reason, setReason] = useState("");
  const [organizations, setOrganizations] = useState<Organization[] | null>(
      null,
    ),
    [org, setOrg] = useState(""),
    [orgError, setOrgError] = useState("");
  const scoped = [
    "PROFESSIONAL",
    "HEALTH_UNIT_ADMIN",
    "MUNICIPAL_ADMIN",
  ].includes(role);
  async function loadOrganizations() {
    try {
      const r = await fetch("/api/admin/organizations", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setOrganizations(
        data.organizations.filter(
          (o: Organization) =>
            o.type ===
              (role === "MUNICIPAL_ADMIN" ? "MUNICIPALITY" : "HEALTH_UNIT") &&
            o.status === "ACTIVE" &&
            o.isActive,
        ),
      );
      setOrgError("");
    } catch {
      setOrgError("Não foi possível consultar as UBS autorizadas.");
    }
  }
  const canReview = full || row.proposedRoleKey === "COMMERCIAL";
  return (
    <li>
      <h2>{row.displayName}</h2>
      <p data-sensitive>{row.email}</p>
      <p>
        <strong>{labels[row.status]}</strong> · Proposta:{" "}
        {roles[row.proposedRoleKey]}
      </p>
      <p className="access-muted">
        Convite:{" "}
        {emailDeliveryLabel(row.deliveryStatus)}
      </p>
      {row.releaseEmailStatus && (
        <p className="access-muted">
          Aviso de liberação:{" "}
          {emailDeliveryLabel(row.releaseEmailStatus)}
          .
        </p>
      )}
      {row.decisionReason && <p>Motivo registrado: {row.decisionReason}</p>}
      {row.status === "PENDING_ASSIGNMENT" && canReview && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action({
              operation: "APPROVE",
              id: row.id,
              roleKey: role,
              organizationId: scoped ? org : null,
              reason,
            });
          }}
        >
          <p>
            Perfil aceito: <strong>{roles[role]}</strong>. Esta decisão confirma
            o perfil aceito. Para mudar o papel, encerre este convite e envie
            outro para novo consentimento explícito.
          </p>
          {scoped && (
            <>
              <p>
                Perfis institucionais exigem vínculo ativo na organização
                selecionada. Esta ação não cria vínculo nem ativa UBS.
              </p>
              <button
                className="access-secondary"
                type="button"
                onClick={() => void loadOrganizations()}
              >
                Consultar organizações autorizadas
              </button>
              {orgError && <p role="alert">{orgError}</p>}
              <label>
                Organização do vínculo existente
                <select
                  required
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                >
                  <option value="">Selecione a organização</option>
                  {organizations?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Motivo da decisão
            <textarea
              required
              minLength={3}
              maxLength={400}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="access-actions">
            <button disabled={busy}>Autorizar perfil</button>
            <button
              className="access-secondary"
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={() =>
                void action({ operation: "REJECT", id: row.id, reason })
              }
            >
              Não autorizar
            </button>
          </div>
        </form>
      )}
      {row.status === "PENDING_ASSIGNMENT" && !canReview && (
        <p>A decisão deste perfil cabe ao PAP_ADMIN.</p>
      )}
      <div className="access-actions">
        {["PENDING_ACCEPTANCE", "EXPIRED", "REVOKED"].includes(row.status) &&
          !row.acceptedAt && (
            <button
              disabled={busy}
              onClick={() => void action({ operation: "RESEND", id: row.id })}
            >
              Reenviar convite
            </button>
          )}
        {["PENDING_ACCEPTANCE", "PENDING_ASSIGNMENT", "ACTIVE"].includes(
          row.status,
        ) &&
          (row.status !== "ACTIVE" || canReview) && (
            <button
              className="access-secondary"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt(
                  "Motivo da revogação (mínimo 3 caracteres)",
                );
                if (reason && reason.trim().length >= 3)
                  void action({ operation: "REVOKE", id: row.id, reason });
              }}
            >
              Revogar {row.status === "ACTIVE" ? "perfil" : "convite"}
            </button>
          )}
        {row.status === "ACTIVE" && canReview && (
          <button
            className="access-secondary"
            disabled={busy}
            onClick={() =>
              void action({ operation: "RETRY_NOTICE", id: row.id })
            }
          >
            Tentar novamente o aviso
          </button>
        )}
      </div>
    </li>
  );
}
export default function AccessInvitationsClient() {
  const [page, setPage] = useState(1),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const lock = useRef(false);
  const result = useBetaData<Queue>(
    `/api/admin/access-invitations?page=${page}${filter ? `&status=${filter}` : ""}`,
  );
  async function action(body: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const r = await fetch("/api/admin/access-invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          data.error === "INVITATION_ALREADY_EXISTS"
            ? "Já existe um convite aberto para este e-mail. Consulte a fila e use o reenvio para invalidar o link anterior."
            : data.error === "EMAIL_DELIVERY_FAILED" ||
                data.error === "LOCAL_MAIL_FAILED"
              ? "O envio ou a captura não foi confirmado. Confira a configuração do provedor antes de reenviar."
              : data.error === "RATE_LIMITED"
                ? "Limite de operações atingido. Aguarde antes de tentar novamente."
                : "A operação não foi autorizada ou o estado mudou. Atualize a fila e confira o perfil, o vínculo e a verificação MFA.",
        );
      setMessage(
        body.operation === "CREATE" || body.operation === "RESEND"
          ? "Convite registrado. Consulte o estado de entrega na fila; o aceite ainda exigirá autorização do perfil."
          : "Operação registrada. Consulte o estado atualizado na fila.",
      );
      result.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível conectar.");
      result.refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const data = result.data;
  return (
    <div className="access-page access-queue">
      <section className="access-card">
        <p className="access-eyebrow">PAP Saúde · Governança</p>
        <h1>Convites e autorizações</h1>
        <p>
          Convide uma pessoa sem exigir vínculo prévio com UBS. O aceite
          confirma a conta; a autorização do perfil é uma decisão separada.
        </p>
        <DataState
          loading={result.loading}
          error={result.error}
          retry={result.retry}
        />
        {data && (
          <>
            <p>
              {data.full
                ? "PAP_ADMIN: autorize Gerente, Comercial ou perfis institucionais com vínculo ativo."
                : "Gerente: você acompanha seus convites e autoriza somente o perfil Comercial. Outras propostas serão analisadas pelo PAP_ADMIN."}
            </p>
            <form
              className="access-queue-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action({
                  operation: "CREATE",
                  displayName: f.get("displayName"),
                  email: f.get("email"),
                  proposedRoleKey: f.get("role"),
                });
              }}
            >
              <label>
                Nome da pessoa
                <input
                  name="displayName"
                  autoComplete="off"
                  required
                  minLength={2}
                  maxLength={200}
                />
              </label>
              <label>
                E-mail do convite
                <input
                  type="email"
                  name="email"
                  autoComplete="off"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Perfil proposto
                <select name="role" defaultValue="COMMERCIAL">
                  {Object.entries(roles)
                    .filter(([key]) => data.full || key !== "PAP_MANAGER")
                    .map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <button disabled={busy}>Criar convite global</button>
            </form>
            <label>
              Filtrar situação
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas as situações</option>
                {Object.entries(labels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {message && <p role="status">{message}</p>}
            {error && (
              <p role="alert" className="access-error">
                {error}
              </p>
            )}
            <p>{data.total} registro(s) no escopo autorizado.</p>
            {!data.rows.length && <p>Nenhum convite nesta situação.</p>}
            <ul className="access-queue-list">
              {data.rows.map((row) => (
                <Review
                  key={row.id}
                  row={row}
                  full={data.full}
                  busy={busy}
                  action={action}
                />
              ))}
            </ul>
            <nav aria-label="Páginas da fila">
              <button
                className="access-secondary"
                disabled={page <= 1 || busy}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page}</span>
              <button
                className="access-secondary"
                disabled={page * data.pageSize >= data.total || busy}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
