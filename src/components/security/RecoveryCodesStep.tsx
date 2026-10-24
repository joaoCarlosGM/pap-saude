"use client";
import { useState } from "react";
export default function RecoveryCodesStep({
  codes,
  busy,
  onAcknowledge,
}: {
  codes: string[];
  busy: boolean;
  onAcknowledge: () => void;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="ob-stack">
      <p>
        Guarde estes códigos em um local privado, fora do celular. Cada código
        pode substituir o autenticador <strong>uma única vez</strong> no login.
      </p>
      <p>
        Eles só aparecem nesta resposta. Não envie por e-mail, suporte ou
        mensagem e não faça uma captura desta tela.
      </p>
      <ul className="ob-codes" data-sensitive="true">
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ul>
      <label className="ob-check">
        <input
          id="recovery-ack"
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        Guardei os códigos em um local seguro.
      </label>
      <button
        className="ob-primary"
        disabled={!saved || busy}
        onClick={onAcknowledge}
      >
        Ocultar códigos e continuar
      </button>
    </div>
  );
}
