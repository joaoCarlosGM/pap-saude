"use client"

import {
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react"

import { Button } from "@/components/ui/button"

export default function SecuritySettings() {
  return (
    <section>
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Segurança
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Gerencie senha, autenticação e sessões.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-500">
              <KeyRound size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Senha
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Atualize periodicamente sua senha de acesso.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
          >
            Alterar senha
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-500">
              <ShieldCheck size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Autenticação em duas etapas
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Adicione uma camada extra de proteção à sua conta.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
          >
            Configurar
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Smartphone size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Sessões ativas
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Dispositivos atualmente conectados à sua conta.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Lock
                  size={14}
                  className="text-emerald-500"
                />

                <p className="text-sm font-medium text-slate-700">
                  Navegador atual
                </p>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Sessão ativa
              </p>
            </div>

            <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
              Este dispositivo
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
          >
            <LogOut size={15} />
            Encerrar outras sessões
          </Button>
        </div>
      </div>
    </section>
  )
}
