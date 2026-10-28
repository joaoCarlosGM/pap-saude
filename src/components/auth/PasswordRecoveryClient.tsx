"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthAccessShell from "./AuthAccessShell";
import styles from "./auth-access.module.css";

export default function PasswordRecoveryClient({ reset = false }: { reset?: boolean }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const tokenRef = useRef(""), lock = useRef(false);
  useEffect(() => {
    if (!reset) return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    tokenRef.current ||= hash.get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const newLink = () => window.location.reload();
    window.addEventListener("hashchange", newLink);
    return () => window.removeEventListener("hashchange", newLink);
  }, [reset]);
  const send = async () => {
    if (lock.current || done) return;
    setMessage(""); setError("");
    if (reset && password !== confirmation) { setError("As senhas não coincidem."); return; }
    if (reset && !tokenRef.current) { setError("Abra um link de recuperação válido para continuar."); return; }
    lock.current = true; setBusy(true);
    try {
      const response = await fetch(reset ? "/api/auth/password/reset" : "/api/auth/password/forgot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { token: tokenRef.current, newPassword: password, confirmPassword: confirmation } : { email }),
      });
      if (!response.ok) {
        setError(reset ? "Não foi possível redefinir a senha. Confira os requisitos ou solicite um novo link." : "Não foi possível processar a solicitação. Aguarde e tente novamente."); return;
      }
      setMessage(reset ? "Senha redefinida. Entre novamente e confirme seu MFA, se já configurado. Seu autenticador foi preservado." : "Solicitação recebida. Confira sua caixa de entrada e o spam. Quando o endereço estiver habilitado para recuperação, as instruções chegarão por e-mail.");
      if (reset) { setDone(true); setPassword(""); setConfirmation(""); tokenRef.current = ""; }
    } catch { setError("Não foi possível conectar. Verifique sua conexão e tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <AuthAccessShell><form className={styles.form} aria-busy={busy} onSubmit={e => { e.preventDefault(); void send(); }}>
    <p className={styles.eyebrow}>SEGURANÇA DA CONTA</p><h1 className={styles.title}>{reset ? "Redefinir senha" : "Recuperar acesso"}</h1>
    <p className={styles.intro}>{reset ? "Crie uma senha forte e exclusiva, com pelo menos 12 caracteres. A redefinição encerra as sessões anteriores e preserva seu autenticador." : "Informe o e-mail usado no PAP Saúde para receber as instruções de recuperação."}</p>
    {!done && (reset ? <><label className={styles.label}>Nova senha<input type="password" required minLength={12} autoComplete="new-password" className={styles.input} value={password} onChange={e => setPassword(e.target.value)} /></label><label className={styles.label}>Confirme a nova senha<input type="password" required minLength={12} autoComplete="new-password" className={styles.input} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></> : <label className={styles.label}>E-mail<input type="email" required autoComplete="email" className={styles.input} value={email} onChange={e => setEmail(e.target.value)} /></label>)}
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.status}>{message}</p>}
    {!done && <button type="submit" disabled={busy} className={styles.primary}>{busy ? "Aguarde…" : reset ? "Confirmar nova senha" : "Solicitar link"}</button>}
    <Link href="/login" className={styles.link}>Voltar ao login</Link>
  </form></AuthAccessShell>;
}
