"use client";
import { useRef, useState } from "react";
import { securityRequest } from "./security-client";
import RecoveryCodesStep from "./RecoveryCodesStep";

export default function AccountRecovery({
  onRotated,
}: {
  onRotated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [password, setPassword] = useState(""),
    [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function rotate(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await securityRequest("GENERATE_RECOVERY_CODES", {
        password,
        code,
      });
      setCodes(result.codes);
      setPassword("");
      setCode("");
      await onRotated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gerar os códigos.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="ob-stack" aria-labelledby="recovery-title">
      <h2 id="recovery-title">Recuperação do autenticador</h2>
      {!open ? (
        <>
          <p>
            Se precisar de outro conjunto, gere novos códigos mediante
            reautenticação. Os anteriores deixarão de funcionar; a chave do
            autenticador é preservada.
          </p>
          <button className="ob-secondary" onClick={() => setOpen(true)}>
            Gerenciar recuperação
          </button>
        </>
      ) : codes.length ? (
        <RecoveryCodesStep
          codes={codes}
          busy={busy}
          onAcknowledge={() => {
            setCodes([]);
            setOpen(false);
            setError("");
          }}
        />
      ) : (
        <form className="ob-stack" onSubmit={rotate}>
          <p>
            Esta ação revoga os códigos anteriores. Confirme sua senha e um
            código TOTP atual para continuar.
          </p>
          {error && (
            <p className="ob-error" role="alert">
              {error}
            </p>
          )}
          <label>
            Senha para gerar recuperação
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Código TOTP para gerar recuperação
            <input
              data-sensitive="true"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
          </label>
          <button
            className="ob-primary"
            disabled={busy || !password || code.length !== 6}
          >
            Gerar novos códigos de recuperação
          </button>
          <button
            type="button"
            className="ob-secondary"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setPassword("");
              setCode("");
              setError("");
            }}
          >
            Cancelar
          </button>
        </form>
      )}
    </section>
  );
}
