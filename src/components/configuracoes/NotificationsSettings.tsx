"use client"

import { Bell, Mail } from "lucide-react"

import SettingSwitch from "./SettingSwitch"

import type {
  NotificationPreferences,
} from "@/types/configuracao"

type Props = {
  notifications: NotificationPreferences
  onChange: (
    notifications: NotificationPreferences,
  ) => void
}

export default function NotificationsSettings({
  notifications,
  onChange,
}: Props) {
  function update(
    field: keyof NotificationPreferences,
    value: boolean,
  ) {
    onChange({
      ...notifications,
      [field]: value,
    })
  }

  return (
    <section>
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Notificações
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Escolha quais eventos devem gerar avisos.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white px-4 sm:px-5">
        <div className="flex items-center gap-3 border-b border-slate-100 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-500">
            <Bell size={17} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Alertas do sistema
            </p>

            <p className="text-xs text-slate-400">
              Notificações dentro do PAP Saúde.
            </p>
          </div>
        </div>

        <SettingSwitch
          checked={notifications.clinicalAlerts}
          onChange={(value) =>
            update("clinicalAlerts", value)
          }
          label="Alertas clínicos"
          description="Exibe avisos relacionados a eventos importantes registrados no atendimento."
        />

        <SettingSwitch
          checked={notifications.appointmentReminders}
          onChange={(value) =>
            update("appointmentReminders", value)
          }
          label="Lembretes de atendimento"
          description="Exibe lembretes relacionados aos acompanhamentos registrados."
        />

        <SettingSwitch
          checked={notifications.protocolUpdates}
          onChange={(value) =>
            update("protocolUpdates", value)
          }
          label="Atualizações de protocolos"
          description="Avisa quando novos protocolos forem disponibilizados."
        />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 sm:px-5">
        <div className="flex items-center gap-3 border-b border-slate-100 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-500">
            <Mail size={17} />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            E-mail
          </p>
        </div>

        <SettingSwitch
          checked={notifications.emailNotifications}
          onChange={(value) =>
            update("emailNotifications", value)
          }
          label="Receber notificações por e-mail"
          description="Permite o envio de notificações selecionadas para seu e-mail."
        />
      </div>
    </section>
  )
}
