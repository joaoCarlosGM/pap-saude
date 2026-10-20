"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Enrollment } from "./security-client";
export default function TotpSetupStep({
  enrollment,
}: {
  enrollment: Enrollment;
}) {
  const [qr, setQr] = useState(""),
    [manual, setManual] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    // Local algorithm only: no remote image URL, API, analytics or storage.
    void QRCode.toDataURL(enrollment.provisioningUri, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 256,
    })
      .then((value) => {
        if (!cancelled) setQr(value);
      })
      .catch(() => {
        if (!cancelled)
          setMessage("Use a chave manual para cadastrar o aplicativo.");
      });
    return () => {
      cancelled = true;
    };
  }, [enrollment.provisioningUri]);
  return (
    <div className="ob-stack">
      <p>
        No Google Authenticator, Microsoft Authenticator ou outro app TOTP,
        toque em <strong>+ → Ler QR Code</strong>.
      </p>
      <div className="ob-qr" data-sensitive="true">
        {qr ? (
          <picture>
            <img
              src={qr}
              width={256}
              height={256}
              alt="QR Code privado para cadastrar sua conta PAP Saúde no autenticador"
            />
          </picture>
        ) : (
          <p>Preparando QR Code local…</p>
        )}
      </div>
      <p>
        Emissor: <strong>PAP Saúde</strong>. Confira o e-mail da sua conta no
        aplicativo.
      </p>
      <button
        type="button"
        className="ob-link"
        aria-expanded={manual}
        onClick={() => setManual(!manual)}
      >
        Não consigo ler? Usar chave manual
      </button>
      {manual && (
        <div data-sensitive="true" className="ob-panel">
          <p>Selecione chave baseada em tempo (TOTP).</p>
          <code className="ob-secret">{enrollment.secret}</code>
          <button
            type="button"
            className="ob-secondary"
            onClick={() => {
              void navigator.clipboard
                .writeText(enrollment.secret)
                .then(() =>
                  setMessage(
                    "Chave copiada. Limpe a área de transferência após usar.",
                  ),
                )
                .catch(() =>
                  setMessage(
                    "Copie a chave manualmente em seu dispositivo privado.",
                  ),
                );
            }}
          >
            Copiar chave
          </button>
        </div>
      )}
      <p className="ob-muted">
        A chave permanece estável neste cadastro. O código de seis dígitos muda
        normalmente a cada 30 segundos. Sincronize data e hora automaticamente;
        os fusos podem ser diferentes.
      </p>
      <p className="ob-muted">
        Configuração válida até{" "}
        {new Date(enrollment.expiresAt).toLocaleTimeString("pt-BR")}. Não
        compartilhe esta tela.
      </p>
      <p role="status">{message}</p>
    </div>
  );
}
