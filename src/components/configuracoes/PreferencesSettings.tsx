"use client"

import {
  Monitor,
  SlidersHorizontal,
} from "lucide-react"

import SettingSwitch from "./SettingSwitch"

import type { UserPreferences } from "@/types/configuracao"

type Props = {
  preferences: UserPreferences
  onChange: (
    preferences: UserPreferences,
  ) => void
}

export default function PreferencesSettings({
  preferences,
  onChange,
}: Props) {
  function update(
    field: keyof UserPreferences,
    value: boolean,
  ) {
    onChange({
      ...preferences,
      [field]: value,
    })
  }

  return (
    <section>
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Preferências
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Personalize o comportamento da interface.
        </p>
      </div>

      <div
        className="
          mt-6
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          sm:px-5
        "
      >
        <div className="flex items-center gap-3 border-b border-slate-100 py-4">
          <div
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              bg-pink-50
              text-pink-500
            "
          >
            <Monitor size={17} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Interface
            </p>

            <p className="text-xs text-slate-400">
              Preferências de exibição.
            </p>
          </div>
        </div>

        <SettingSwitch
          checked={preferences.compactMode}
          onChange={(value) =>
            update("compactMode", value)
          }
          label="Modo compacto"
          description="Reduz espaçamentos para exibir mais informações na tela."
        />

        <SettingSwitch
          checked={
            preferences.reducedAnimations
          }
          onChange={(value) =>
            update(
              "reducedAnimations",
              value,
            )
          }
          label="Reduzir animações"
          description="Diminui movimentos e transições da interface."
        />
      </div>

      <div
        className="
          mt-4
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          sm:px-5
        "
      >
        <div className="flex items-center gap-3 border-b border-slate-100 py-4">
          <div
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              bg-pink-50
              text-pink-500
            "
          >
            <SlidersHorizontal size={17} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Comportamento
            </p>

            <p className="text-xs text-slate-400">
              Preferências de interação.
            </p>
          </div>
        </div>

        <SettingSwitch
          checked={
            preferences.confirmBeforeLeavingForm
          }
          onChange={(value) =>
            update(
              "confirmBeforeLeavingForm",
              value,
            )
          }
          label="Confirmar antes de sair de formulários"
          description="Solicita confirmação quando houver informações ainda não salvas."
        />
      </div>
    </section>
  )
}