"use client"

import {
  useState,
} from "react"

import type {
  EffectiveAccessProfile,
} from "@/lib/admin/types"

import RouteHero from "@/components/premium/RouteHero"
import PageMotion from "@/components/premium/PageMotion"
import "@/components/premium/premium.css"
import AdminSidebar from "./AdminSidebar"
import AdminTopbar from "./AdminTopbar"

import GuidedTourEngine from "@/components/onboarding/GuidedTourEngine"

import type {
  GuidedTourStep,
} from "@/lib/onboarding/types"

const ADMIN_TOUR_STEPS: GuidedTourStep[] = [
  {
    id:
      "overview",
    title:
      "Central Administrativa",
    description:
      "Esta é a visão geral da administração do PAP Saúde.",
    target:
      '[data-tour="admin-overview"]',
  },
  {
    id:
      "organizations",
    title:
      "Organizações",
    description:
      "Gerencie municípios e unidades de saúde dentro do seu escopo.",
    target:
      '[data-tour="admin-organizations"]',
    requiredAny: [
      "organization.read",
    ],
  },
  {
    id:
      "users",
    title:
      "Usuários e profissionais",
    description:
      "Consulte vínculos e convide profissionais para unidades autorizadas.",
    target:
      '[data-tour="admin-users"]',
    requiredAny: [
      "user.read",
    ],
  },
  {
    id:
      "metrics",
    title:
      "Métricas",
    description:
      "Acompanhe indicadores organizacionais e de utilização quando disponíveis para seu perfil.",
    target:
      '[data-tour="admin-metrics"]',
    requiredAny: [
      "analytics.organization.read",
    ],
  },
  {
    id:
      "integrations",
    title:
      "Integrações",
    description:
      "Acesse integrações institucionais autorizadas, como RNDS.",
    target:
      '[data-tour="admin-integrations"]',
    requiredAny: [
      "rnds.integration.read",
    ],
  },
  {
    id:
      "help",
    title:
      "Ajuda e tour",
    description:
      "Use Ajuda para rever este tour sempre que precisar.",
    target:
      '[data-tour="admin-help"]',
  },
]

export default function AdminShell({
  children,
  profile,
}: {
  children:
    React.ReactNode
  profile:
    EffectiveAccessProfile
}) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] =
    useState(false)

  return (
    <div className="premium-workspace pap-admin flex min-h-screen">
      <AdminSidebar
        open={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false,
          )
        }
        profile={
          profile
        }
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fbf8fa]">
        <AdminTopbar
          onMenuClick={() =>
            setSidebarOpen(
              true,
            )
          }
          profile={
            profile
          }
        />

        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <RouteHero admin/><PageMotion>{children}</PageMotion>
        </main>
      </div>

      <GuidedTourEngine
        tourKey="admin-core"
        tourVersion={1}
        steps={
          ADMIN_TOUR_STEPS
        }
        permissions={
          profile.permissions
        }
      />
    </div>
  )
}
