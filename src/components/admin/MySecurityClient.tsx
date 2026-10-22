"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountRecovery from "@/components/security/AccountRecovery";
import {
  securityRequest,
  type SecurityPosture,
} from "@/components/security/security-client";
export default function MySecurityClient() {
  const router = useRouter();
  const [data, setData] = useState<SecurityPosture | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [newPassword, setNewPassword] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    void securityRequest()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  async function send(action: string, extras: Record<string, string> = {}) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const body = await securityRequest(action, {
        password,
        code,
        newPassword,
        ...extras,
      });
      setPassword("");
      setCode("");
      setNewPassword("");
      if (body.sessionRevoked) {
        router.replace("/login");
        return;
      }
      setData(await securityRequest());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <section
        className={`ob account-security ${data?.onboarding.profile?.canAccessAdmin ? "account-security--admin" : ""}`}
        data-theme="auto"
        aria-label="Gestão da conta"
      >
        <div className="ob-card mx-auto max-w-3xl ob-stack">
          <h1 className="text-2xl font-semibold">Segurança da minha conta</h1>
          <p>
            Alterar senha e encerrar todas as sessões exigem reautenticação.
            Essas ações são separadas da configuração MFA.
          </p>
          {error && (
            <p role="alert" className="ob-error">
              {error}
            </p>
          )}
          <form
            className="ob-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void send("CHANGE_PASSWORD");
            }}
          >
            <h2>Senha e sessões</h2>
            <label>
              Senha atual
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Código TOTP atual, se MFA estiver ativo
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label>
              Nova senha
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <button className="ob-primary" disabled={busy}>
              Alterar senha e encerrar sessões
            </button>
            <button
              type="button"
              className="ob-secondary"
              disabled={busy}
              onClick={() => void send("REVOKE_ALL_SESSIONS")}
            >
              Encerrar todas as sessões
            </button>
          </form>
          <h2>Autenticador e recuperação</h2>
          <p>
            {data
              ? data.onboarding.active
                ? "MFA ativo. Seu autenticador atual foi preservado."
                : "MFA ainda não ativado. Configure-o na rota exclusiva de primeiros passos."
              : "Carregando estado de segurança…"}
          </p>
          {data && !data.onboarding.active && (
            <Link className="ob-primary" href="/primeiros-passos">
              Configurar autenticador
            </Link>
          )}
          {data?.onboarding.active && (
            <AccountRecovery
              onRotated={async () => {
                setData(await securityRequest());
              }}
            />
          )}
          <Link className="ob-link" href="/ajuda/seguranca">
            Ajuda / Refazer tutorial
          </Link>
          <p>
            Fatores ativos:{" "}
            {data?.factors.filter((f) => f.status === "ACTIVE").length ?? 0};
            códigos não utilizados: {data?.remainingRecoveryCodes ?? 0}
          </p>
          <h2>Sessões recentes</h2>
          <ul>
            {data?.sessions.map((s) => (
              <li
                className="flex flex-wrap justify-between gap-2 border-b p-2"
                key={s.id}
              >
                <span>
                  {s.userAgent ?? "Dispositivo"}{" "}
                  {s.current ? "(esta sessão)" : ""}
                </span>
                <button
                  className="ob-link"
                  disabled={busy}
                  onClick={() =>
                    void send("REVOKE_SESSION", { targetSessionId: s.id })
                  }
                >
                  Revogar
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
