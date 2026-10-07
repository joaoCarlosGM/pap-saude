"use client"

import {
  useState,
} from "react"

import type {
  EffectiveAccessProfile,
} from "@/lib/admin/types"

import AdminSidebar from "./AdminSidebar"
import AdminTopbar from "./AdminTopbar"

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
    <div className="flex min-h-screen bg-slate-50">
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

      <div className="flex min-w-0 flex-1 flex-col">
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
          {children}
        </main>
      </div>
    </div>
  )
}
