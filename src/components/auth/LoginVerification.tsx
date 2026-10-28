"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./auth-access.module.css";
type Challenge = { id: string; image?: string; question?: string };
export type LoginVerificationValue = { id: string; answer: string };
export default function LoginVerification({ onChange }: { onChange: (value: LoginVerificationValue | null) => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null), [answer, setAnswer] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/auth/login/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(async r => { if (!r.ok) throw Error(); const c = await r.json(); if (active) setChallenge(c); }).catch(() => { if (active) setError("Verificação indisponível. Solicite um novo desafio para continuar."); });
    return () => { active = false; };
  }, []);
  async function refresh(accessible = false) {
    if (busy) return;
    setBusy(true); setChallenge(null); setAnswer(""); setError(""); onChange(null);
    try {
      const r = await fetch("/api/auth/login/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessible }) });
      if (!r.ok) throw Error();
      setChallenge(await r.json());
    } catch { setError("Verificação indisponível. Aguarde e tente novamente."); }
    finally { setBusy(false); }
  }
  return <fieldset className={styles.form} disabled={busy} aria-busy={busy}>
    <legend className={styles.label}>Verificação de segurança</legend>
    {challenge?.image && <Image src={challenge.image} alt="Desafio visual. Use a alternativa textual se não puder ler a imagem." width={190} height={66} unoptimized />}
    {challenge?.question && <p id="verification-question" className={styles.intro}>{challenge.question}</p>}
    <label className={styles.label}>Resposta da verificação<input className={styles.input} autoComplete="off" autoCapitalize="characters" spellCheck={false} required disabled={!challenge || busy} aria-describedby={challenge?.question ? "verification-question" : undefined} value={answer} maxLength={32} onChange={e => { setAnswer(e.target.value); onChange(challenge ? { id: challenge.id, answer: e.target.value } : null); }} /></label>
    <div><button type="button" className={styles.toggle} onClick={() => void refresh()}>Novo código visual</button><button type="button" className={styles.toggle} onClick={() => void refresh(true)}>Alternativa textual acessível</button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </fieldset>;
}
