"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import NotificationInbox from "./NotificationInbox";
import "./access.css";
export type OwnAccessState = {
  user: { displayName: string; email: string };
  status: string;
  canContinue: boolean;
  acceptedAt: string | null;
  decidedAt: string | null;
};
export default function WaitingAuthorization({
  initial,
}: {
  initial: OwnAccessState;
}) {
  const router = useRouter();
  const [access, setAccess] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [version, setVersion] = useState(0),
    [theme, setTheme] = useState("auto");
  const active = access.status === "ACTIVE" && access.canContinue,
    unavailable = access.status === "ACTIVE" && !access.canContinue,
    closed = ["REVOKED", "REJECTED", "EXPIRED"].includes(access.status);
  const heading = active
    ? "Seu acesso foi liberado"
    : unavailable
      ? "Perfil autorizado, acesso indisponível"
      : access.status === "REJECTED"
        ? "Seu perfil não foi autorizado"
        : access.status === "REVOKED"
          ? "Seu perfil foi revogado"
          : "Aguardando autorização";
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/account/access-status", {
        cache: "no-store",
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (!data.access) throw new Error();
      setAccess(data.access);
      setVersion((v) => v + 1);
      setMessage("Situação atualizada.");
    } catch {
      setError(
        "Não foi possível consultar sua situação. Sua sessão pode ter expirado; entre novamente se necessário.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setBusy(false);
    }
  }
  return (
    <main className="access-page" data-theme={theme}>
      <header>
        <span className="access-brand">PAP Saúde</span>
        <button
          className="access-secondary"
          onClick={() =>
            setTheme((t) =>
              t === "auto" ? "dark" : t === "dark" ? "light" : "auto",
            )
          }
          aria-label="Alternar tema"
        >
          Tema:{" "}
          {theme === "auto" ? "sistema" : theme === "dark" ? "escuro" : "claro"}
        </button>
      </header>
      <div className="access-grid">
        <section className="access-hero" aria-label="Boas-vindas">
          <div>
            <p className="access-eyebrow">Sua jornada PAP Saúde</p>
            <h2>Seu próximo passo começa aqui.</h2>
            <p>
              Estamos preparando um acesso adequado ao seu perfil, com cuidado e
              segurança em cada etapa.
            </p>
          </div>
          <Image
            src="/illustrations/pap-login-care.svg"
            alt="Cuidado em saúde conectado à tecnologia"
            width={1000}
            height={720}
            unoptimized
          />
        </section>
        <section className="access-card" aria-labelledby="waiting-title">
          <p className="access-eyebrow">
            {active ? "Perfil autorizado" : "Cadastro recebido"}
          </p>
          <h1 id="waiting-title">{heading}</h1>
          <div className="access-person">
            <p>
              Olá, <strong>{access.user.displayName}</strong>.
            </p>
            <p data-sensitive className="access-muted">
              {access.user.email}
            </p>
          </div>
          <div className="access-notice">
            {active ? (
              <p>
                A autorização do perfil foi registrada. Continue para seu acesso
                e conclua a verificação de segurança exigida.
              </p>
            ) : unavailable ? (
              <p>
                Seu perfil foi autorizado, mas os vínculos e a disponibilidade
                da organização são verificados separadamente. Fale com a
                administração para orientação.
              </p>
            ) : closed ? (
              <p>
                Seu acesso operacional não está disponível. Entre em contato com
                quem enviou o convite para receber orientação.
              </p>
            ) : (
              <>
                <strong>Seu acesso ainda não foi liberado.</strong>
                <p>
                  Seu convite foi aceito e sua conta está criada. Estamos
                  aguardando a atribuição de um perfil pela administração.
                </p>
              </>
            )}
          </div>
          <ol className="access-timeline" aria-label="Etapas do acesso">
            {[
              ["Convite aceito", "Convite individual confirmado."],
              ["Conta criada", "Identidade registrada e protegida."],
              [
                closed
                  ? "Análise encerrada"
                  : access.status === "ACTIVE"
                    ? "Perfil autorizado"
                    : "Aguardando autorização",
                closed
                  ? "Consulte a administração para orientações."
                  : access.status === "ACTIVE"
                    ? "A decisão do perfil foi registrada."
                    : "A administração define o perfil adequado ao seu acesso.",
              ],
              [
                unavailable ? "Acesso indisponível" : "Acesso liberado",
                unavailable
                  ? "Depende do vínculo ativo e da disponibilidade da organização."
                  : "Após autorização legítima e verificação de segurança exigida.",
              ],
            ].map(([title, hint], i) => (
              <li
                key={title}
                className={
                  i < 2 || active || (unavailable && i === 2)
                    ? "access-done"
                    : i === (unavailable ? 3 : 2)
                      ? "access-current"
                      : ""
                }
                aria-current={
                  !active && i === (unavailable ? 3 : 2) ? "step" : undefined
                }
              >
                <span className="access-dot" aria-hidden="true">
                  {i < 2 || active || (unavailable && i === 2) ? "✓" : i + 1}
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{hint}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="access-muted">
            Não há prazo definido para a análise. Você pode consultar esta
            página e suas notificações. Convite aceito, perfil autorizado e UBS
            ativada são etapas distintas.
          </p>
          {error && (
            <p role="alert" className="access-error">
              {error} <Link href="/login">Entrar novamente</Link>
            </p>
          )}
          <p role="status">{message}</p>
          <div className="access-actions">
            {access.canContinue && (
              <Link className="access-primary" href="/login">
                Continuar para meu acesso
              </Link>
            )}
            <button onClick={() => void refresh()} disabled={busy}>
              {busy ? "Consultando…" : "Consultar status"}
            </button>
            <button
              className="access-secondary"
              onClick={() => void logout()}
              disabled={busy}
            >
              Sair da conta
            </button>
          </div>
          <details>
            <summary>Preciso de ajuda</summary>
            <p>
              Para revisar o convite ou a liberação, fale com quem convidou
              você. Não compartilhe sua senha nem códigos do autenticador.
            </p>
            <nav aria-label="Ajuda da conta">
              <Link href="/minha-seguranca">Segurança da minha conta</Link>
              <Link href="/ajuda/seguranca">Ajuda de segurança</Link>
            </nav>
          </details>
          <NotificationInbox key={version} />
        </section>
      </div>
    </main>
  );
}
