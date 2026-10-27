"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
const subscribe = () => () => {};
export default function LoginSecurity({
  initialMode = "LOGIN",
}: {
  initialMode?: "LOGIN" | "MFA";
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [mfaTemporarilyBlocked, setMfaTemporarilyBlocked] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [code, setCode] = useState(""),
    [mode, setMode] = useState<"LOGIN" | "MFA" | "CHANGE">(initialMode),
    [error, setError] = useState("");
  const submit = async () => {
    if (lock.current || mfaTemporarilyBlocked) return;
    lock.current = true;
    setBusy(true);
    try {
      setError("");
      const route =
        mode === "LOGIN"
          ? "/api/auth/login"
          : mode === "MFA"
            ? "/api/auth/mfa/verify"
            : "/api/auth/password/forced-change";
      const payload =
        mode === "LOGIN"
          ? { email, password }
          : mode === "MFA"
            ? { code }
            : {
                email,
                currentPassword: password,
                newPassword,
                totpCode: code || undefined,
              };
      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (mode === "MFA" && result.error === "MFA_TEMPORARILY_UNAVAILABLE") {
          setCode("");
          setMfaTemporarilyBlocked(true);
          setError(
            "Muitas tentativas de verificação. Por segurança, esta verificação foi encerrada. Aguarde até 15 minutos antes de reiniciar o login. Não é necessário recadastrar seu MFA.",
          );
          return;
        }
        if (result.error === "PASSWORD_CHANGE_REQUIRED") {
          setMode("CHANGE");
          return;
        }
        setError(
          result.error === "INVALID_CREDENTIALS"
            ? "Credenciais inválidas"
            : mode === "MFA"
              ? "Código inválido, já utilizado ou desafio expirado. Use um código atual ou reinicie o login."
              : "A solicitação não foi aceita. Confira os dados e tente novamente.",
        );
        return;
      }
      if (result.mfaRequired) {
        setPassword("");
        setMode("MFA");
        return;
      }
      if (mode === "CHANGE") {
        setMode("LOGIN");
        setPassword("");
        setCode("");
        setError("Senha atualizada. Entre novamente.");
        return;
      }
      setPassword("");
      setCode("");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="ob account-login" data-theme="auto">
      <aside
        className="account-login-art"
        aria-label="Cuidado e tecnologia PAP Saúde"
      >
        <p className="ob-eyebrow">PAP SAÚDE</p>
        <h2>
          Cuidado conectado.
          <br />
          Acesso protegido.
        </h2>
        <p>Um ambiente de confiança para quem cuida da saúde.</p>
        <Image
          src="/illustrations/pap-login-care.svg"
          alt="Unidade de saúde entre natureza e recursos digitais de cuidado"
          width={1000}
          height={720}
          sizes="(max-width: 760px) 220px, 440px"
          unoptimized
        />
      </aside>
      <form
        className="ob-card w-full max-w-md ob-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        aria-busy={busy}
      >
        <p className="ob-eyebrow">PAP SAÚDE · ACESSO SEGURO</p>
        <h1 className="text-2xl font-semibold">Acesso ao PAP Saúde</h1>
        {error && (
          <p role="alert" className="ob-error">
            {error}
          </p>
        )}
        {mode !== "MFA" && (
          <>
            <label className="block">
              E-mail
              <input
                type="email"
                autoComplete="username"
                className="mt-1 block w-full rounded border p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1 block w-full rounded border p-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </>
        )}
        {(mode === "MFA" || mode === "CHANGE") && (
          <label className="block">
            {mode === "MFA"
              ? "Código do autenticador ou código de recuperação"
              : "Código MFA, se configurado"}
            <input
              className="mt-1 block w-full rounded border p-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        )}
        {mode === "CHANGE" && (
          <label className="block">
            Nova senha
            <input
              className="mt-1 block w-full rounded border p-2"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        )}
        <button type="submit" disabled={busy || !ready || mfaTemporarilyBlocked} className="ob-primary">
          {mfaTemporarilyBlocked
            ? "Verificação temporariamente bloqueada"
            : mode === "LOGIN"
            ? "Entrar"
            : mode === "MFA"
              ? "Confirmar MFA"
              : "Atualizar senha"}
        </button>
        <a className="ob-link" href="/recuperar-senha">
          Esqueci minha senha
        </a>
        <a className="ob-link" href="/solicitar-adesao">
          Solicitar adesão de uma UBS
        </a>
        {mode === "MFA" && (
          <button
            type="button"
            className="ob-secondary"
            disabled={busy}
            onClick={() => {
              setMode("LOGIN");
              setPassword("");
              setCode("");
              setMfaTemporarilyBlocked(false);
              setError(mfaTemporarilyBlocked
                ? "Aguarde até 15 minutos antes de tentar novamente. Depois, entre com sua senha e um código atual do autenticador ou um código de recuperação ainda não utilizado."
                : "");
            }}
          >
            {mfaTemporarilyBlocked ? "Voltar ao login" : "Reiniciar login"}
          </button>
        )}
      </form>
    </main>
  );
}
