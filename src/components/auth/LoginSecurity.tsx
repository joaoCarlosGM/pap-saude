"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthAccessShell from "./AuthAccessShell";
import styles from "./auth-access.module.css";
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
  const [showPassword, setShowPassword] = useState(false);
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
  return <AuthAccessShell>
    <form className={styles.form} onSubmit={e => { e.preventDefault(); void submit(); }} aria-busy={busy}>
      <p className={styles.eyebrow}>{mode === "LOGIN" ? "PORTAL PAP SAÚDE" : mode === "MFA" ? "VERIFICAÇÃO EM DUAS ETAPAS" : "SEGURANÇA DA CONTA"}</p>
      <h1 className={styles.title}>{mode === "LOGIN" ? "Bem-vindo de volta" : mode === "MFA" ? "Confirme sua identidade" : "Atualize sua senha"}</h1>
      <p className={styles.intro}>{mode === "LOGIN" ? "Entre com suas credenciais para acessar seu espaço de trabalho." : mode === "MFA" ? "Abra seu autenticador e informe o código atual. Você também pode usar um código de recuperação ainda não utilizado." : "Defina uma senha forte e exclusiva para continuar."}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {mode !== "MFA" && <>
        <label className={styles.label}>E-mail<input type="email" required autoComplete="username" className={styles.input} value={email} onChange={e => setEmail(e.target.value)} /></label>
        <div className={styles.label}><label htmlFor="login-password">Senha</label><span className={styles.passwordWrap}><input id="login-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" className={styles.input} value={password} onChange={e => setPassword(e.target.value)} /><button className={styles.toggle} type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? "Ocultar" : "Mostrar"}</button></span></div>
      </>}
      {(mode === "MFA" || mode === "CHANGE") && <label className={styles.label}>{mode === "MFA" ? "Código do autenticador ou código de recuperação" : "Código MFA, se configurado"}<input className={styles.input} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} required={mode === "MFA"} value={code} onChange={e => setCode(e.target.value)} /></label>}
      {mode === "CHANGE" && <label className={styles.label}>Nova senha<input className={styles.input} type="password" required minLength={12} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>}
      <button type="submit" disabled={busy || !ready || mfaTemporarilyBlocked} className={styles.primary}>{busy ? "Aguarde…" : mfaTemporarilyBlocked ? "Verificação temporariamente bloqueada" : mode === "LOGIN" ? "Entrar" : mode === "MFA" ? "Confirmar MFA" : "Atualizar senha"}</button>
      <Link className={styles.link} href="/recuperar-senha">Esqueci minha senha</Link>
      {mode === "LOGIN" && <p className={styles.divider}>Sua instituição ainda não participa? <Link className={styles.link} href="/solicitar-adesao">Solicitar adesão de uma UBS</Link></p>}
      {mode === "MFA" && <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setMode("LOGIN"); setPassword(""); setCode(""); setMfaTemporarilyBlocked(false); setError(mfaTemporarilyBlocked ? "Aguarde até 15 minutos antes de tentar novamente. Depois, entre com sua senha e um código atual do autenticador ou um código de recuperação ainda não utilizado." : ""); }}>{mfaTemporarilyBlocked ? "Voltar ao login" : "Reiniciar login"}</button>}
    </form>
  </AuthAccessShell>;
}
