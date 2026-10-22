"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
export function useBetaData<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, refresh] = useState(0);
  const retry = useCallback(() => refresh((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            body.error === "BETA_QUERY_TOO_LARGE"
              ? "Há muitos eventos nesta consulta. Reduza o período ou selecione um município/UBS."
              : ["ADMIN_MFA_REQUIRED", "BETA_MFA_REQUIRED"].includes(body.error)
                ? "Ative o MFA em Minha segurança e entre novamente com o segundo fator."
                : r.status === 403
                  ? "Você não tem permissão para esta área."
                  : "Não foi possível consultar os dados. Tente novamente.",
          );
        }
        return r.json() as Promise<T>;
      })
      .then((value) => {
        if (current) {
          setData(value);
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (current) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [url, version]);
  return {
    data,
    error,
    loading,
    retry,
    refresh: () => {
      setLoading(true);
      retry();
    },
  };
}
export function DataState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <div role="status" className="rounded-2xl bg-slate-100 p-8 text-slate-700">
        Carregando dados…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-300 bg-amber-50 p-4"
      >
        <p>{error}</p>
        <Link className="underline" href="/admin/minha-seguranca">
          Minha segurança
        </Link>
        <button className="ml-4 underline" onClick={retry}>
          Tentar novamente
        </button>
      </div>
    );
  return null;
}
export function BetaTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#064f50]">
        PAP Saúde · Admin Beta 1
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm text-slate-600">{description}</p>
    </header>
  );
}
