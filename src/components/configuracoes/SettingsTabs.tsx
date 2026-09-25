"use client"

import {
  Bell,
  Lock,
  SlidersHorizontal,
  UserRound,
} from "lucide-react"

import type { SettingsTab } from "@/types/configuracao"

type Props = {
  activeTab: SettingsTab
  onChange: (tab: SettingsTab) => void
}

const tabs: {
  id: SettingsTab
  label: string
  icon: typeof UserRound
}[] = [
  {
    id: "profile",
    label: "Perfil",
    icon: UserRound,
  },
  {
    id: "preferences",
    label: "Preferências",
    icon: SlidersHorizontal,
  },
  {
    id: "notifications",
    label: "Notificações",
    icon: Bell,
  },
  {
    id: "security",
    label: "Segurança",
    icon: Lock,
  },
]

export default function SettingsTabs({
  activeTab,
  onChange,
}: Props) {
  return (
    <div className="overflow-x-auto border-b border-slate-200 bg-white">
      <div className="flex min-w-max px-2 sm:px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "relative flex h-12 items-center gap-2 px-3 text-sm font-medium transition sm:px-4",
                active
                  ? "text-pink-600"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <Icon size={16} />

              {tab.label}

              {active && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-pink-500 sm:inset-x-4" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
