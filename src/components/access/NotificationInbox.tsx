"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
type Notice = {
  id: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};
export default function NotificationInbox() {
  const [rows, setRows] = useState<Notice[] | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/account/notifications", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setRows(result.notifications);
      setError("");
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(
          "Não foi possível consultar suas notificações. Tente novamente.",
        );
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void fetch("/api/account/notifications", {
      cache: "no-store",
      signal: c.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setRows(data.notifications))
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setError(
            "Não foi possível consultar suas notificações. Tente novamente.",
          );
      });
    return () => c.abort();
  }, []);
  async function mark(id: string) {
    try {
      const r = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      await load();
    } catch {
      setError("Não foi possível atualizar a notificação.");
    }
  }
  return (
    <section className="access-notifications" aria-label="Minhas notificações">
      <h2>Minhas notificações</h2>
      {error ? (
        <p role="alert">
          {error} <button onClick={() => void load()}>Tentar novamente</button>
        </p>
      ) : rows === null ? (
        <p role="status">Consultando notificações…</p>
      ) : !rows.length ? (
        <p>Nenhuma notificação por enquanto.</p>
      ) : (
        <ul>
          {rows.map((n) => (
            <li key={n.id}>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <small>{n.readAt ? "Lida" : "Não lida"}</small>
              <div className="access-actions">
                <Link href={n.href}>Consultar meu acesso</Link>
                {!n.readAt && (
                  <button
                    className="access-secondary"
                    onClick={() => void mark(n.id)}
                  >
                    Marcar como lida
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
