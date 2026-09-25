import SettingsLayout from "@/components/configuracoes/SettingsLayout"

import { mockUserSettings } from "@/lib/mock-configuracao"

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Configurações
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Gerencie seu perfil e preferências
        </p>
      </header>

      <SettingsLayout
        initialSettings={
          mockUserSettings
        }
      />
    </div>
  )
}