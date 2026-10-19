"use client";
import { useState } from "react";
import Link from "next/link";
import { BetaTitle, DataState, useBetaData } from "./BetaWidgets";
type User = {
  id: string;
  displayName: string;
  email: string;
  isActive: boolean;
  memberships: { status: string; organization: { id: string; name: string } }[];
  roleAssignments: {
    role: { key: string; name: string };
    organization: { id: string; name: string } | null;
  }[];
};
export default function UsersAdminClient() {
  const [page, setPage] = useState(1),
    [q, setQ] = useState("");
  const result = useBetaData<{ rows: User[]; total: number }>(
    `/api/admin/beta/users?${new URLSearchParams({ page: String(page), ...(q ? { q } : {}) })}`,
  );
  return (
    <section className="mx-auto max-w-7xl">
      <BetaTitle
        title="Usuários e vínculos"
        description="Identidades globais com vínculos e papéis limitados ao seu escopo administrativo."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <label>
          Buscar nome ou e-mail{" "}
          <input
            maxLength={100}
            className="ml-2 rounded-xl border p-3"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
              result.refresh();
            }}
          />
        </label>
        <Link
          className="rounded-xl bg-[#064f50] p-3 text-white"
          href="/admin/convites"
        >
          Gerenciar convites
        </Link>
      </div>
      <DataState {...result} />
      {!result.loading && !result.error && result.data && (
        <>
          <div className="divide-y rounded-3xl border bg-white">
            {result.data.rows.map((user) => (
              <article key={user.id} className="p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {user.displayName}{" "}
                      <span className="ml-2 text-xs text-slate-600">
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </h2>
                    <p className="text-sm text-slate-600">{user.email}</p>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {user.roleAssignments.map((a, i) => (
                      <li
                        key={i}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs"
                      >
                        {a.role.name} · {a.organization?.name ?? "Global"}
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {user.memberships.map((m) => (
                    <li
                      key={m.organization.id}
                      className="text-xs text-slate-600"
                    >
                      {m.organization.name}: {m.status}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {!result.data.rows.length && (
              <p className="p-6">Nenhum usuário neste filtro.</p>
            )}
          </div>
          <footer className="mt-5 flex justify-between text-sm">
            <p>
              {result.data.total} usuários · página {page}
            </p>
            <div className="flex gap-4">
              <button
                disabled={page === 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  result.refresh();
                }}
              >
                Anterior
              </button>
              <button
                disabled={page * 20 >= result.data.total}
                onClick={() => {
                  setPage((p) => p + 1);
                  result.refresh();
                }}
              >
                Próxima
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}
