"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./access.css";
type Info = {
  email: string;
  displayName: string;
  expiresAt: string;
  requiresPassword: boolean;
};
export default function GlobalInvitationActivation() {
  const token = useRef(""),
    lock = useRef(false);
  const [info, setInfo] = useState<Info | null>(null),
    [error, setError] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [accepted, setAccepted] = useState(false),
    [switchAccount, setSwitchAccount] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    token.current ||=
      new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    window.history.replaceState(null, "", window.location.pathname);
    // A second email link opened in this tab must replace the old in-memory
    // bearer and identity. A full reload clears the secret and password state.
    const newLink = () => window.location.reload();
    window.addEventListener("hashchange", newLink);
    const controller = new AbortController();
    void fetch("/api/access-invitations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ operation: "INSPECT", token: token.current }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setInfo(data.invitation))
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setError(
            "Este convite é inválido, expirou, foi revogado ou já foi utilizado. Solicite um novo convite a quem enviou.",
          );
      });
    return () => {
      controller.abort();
      window.removeEventListener("hashchange", newLink);
    };
  }, []);
  async function disconnect() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      setPassword("");
      setConfirmation("");
      setSwitchAccount(false);
      setError(
        "Conta desconectada. Confirme a identidade convidada. Se ela já possui MFA, entre com o segundo fator e reabra o link recebido.",
      );
    } catch {
      setError("Não foi possível sair da conta aberta. Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !info) return;
    if (info.requiresPassword && password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/access-invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "ACCEPT",
          token: token.current,
          password,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSwitchAccount(
          ["IDENTITY_CONFIRMATION_REQUIRED", "ADMIN_MFA_REQUIRED"].includes(
            data.error,
          ),
        );
        throw new Error(
          data.error === "IDENTITY_CONFIRMATION_REQUIRED" ||
            data.error === "ADMIN_MFA_REQUIRED"
            ? "Confirme a senha da conta existente e entre com MFA, se configurado. Se há outra conta aberta, saia antes de aceitar."
            : data.error === "RATE_LIMITED"
              ? "Muitas tentativas. Aguarde antes de tentar novamente."
              : data.error === "INVALID_PASSWORD"
                ? "Crie uma senha entre 12 e 256 caracteres."
                : "Não foi possível aceitar. Confira a senha e a validade do convite.",
        );
      }
      setPassword("");
      setConfirmation("");
      token.current = "";
      setAccepted(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <main className="access-page">
      <section className="access-card access-single">
        <p className="access-eyebrow">PAP Saúde · Convite individual</p>
        <h1>{accepted ? "Convite aceito" : "Aceitar convite"}</h1>
        {accepted ? (
          <>
            <p>
              Sua conta foi criada ou confirmada.{" "}
              <strong>Seu acesso ainda não foi liberado.</strong> A
              administração precisa autorizar seu perfil.
            </p>
            <Link className="access-primary" href="/login">
              Entrar para acompanhar minha autorização
            </Link>
          </>
        ) : (
          <>
            {info && (
              <>
                <p>
                  Olá, <strong>{info.displayName}</strong>. Este convite permite
                  criar ou confirmar sua identidade; o perfil será analisado
                  depois.
                </p>
                <p data-sensitive>{info.email}</p>
                <form onSubmit={accept} className="access-card">
                  <label>
                    {info.requiresPassword
                      ? "Crie sua senha"
                      : "Confirme sua senha atual"}
                    <input
                      type="password"
                      autoComplete={
                        info.requiresPassword
                          ? "new-password"
                          : "current-password"
                      }
                      minLength={info.requiresPassword ? 12 : 1}
                      maxLength={256}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  {info.requiresPassword && (
                    <>
                      <small>
                        Mínimo de 12 caracteres. Não compartilhe sua senha.
                      </small>
                      <label>
                        Confirme a nova senha
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={256}
                          required
                          value={confirmation}
                          onChange={(e) => setConfirmation(e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  <button disabled={busy}>
                    {busy ? "Confirmando…" : "Aceitar e aguardar autorização"}
                  </button>
                </form>
              </>
            )}
            {!info && !error && <p role="status">Validando convite…</p>}
            {error && (
              <p className="access-error" role="alert">
                {error}
              </p>
            )}
            {switchAccount && (
              <button
                type="button"
                className="access-secondary"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                Sair da conta aberta
              </button>
            )}
            <p>O aceite não concede papel, acesso clínico nem ativa UBS.</p>
            <Link href="/login">Entrar na minha conta</Link>
          </>
        )}
      </section>
    </main>
  );
}
