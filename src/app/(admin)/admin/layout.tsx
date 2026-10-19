import type {
  ReactNode,
} from "react"

import {
  cookies,
} from "next/headers"

import {
  redirect,
} from "next/navigation"

import AdminShell from "@/components/admin/AdminShell"

import {
  SESSION_COOKIE_NAME,
} from "@/server/security/constants"

import {
  validateSession,
} from "@/server/auth/session.service"

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "@/server/auth/session.errors"

import {
  getEffectiveAccessProfile,
} from "@/server/iam/effective-access-profile.service"

async function resolveProfile() {
  const cookieStore =
    await cookies()

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value

  if (!token) {
    return null
  }

  try {
    const session =
      await validateSession(
        token,
        {
          updateLastSeen:
            false,
        },
      )

    return getEffectiveAccessProfile(
      session.user.id,
    )
  } catch (error) {
    if (
      error instanceof
        InvalidSessionError ||
      error instanceof
        ExpiredSessionError ||
      error instanceof
        RevokedSessionError ||
      error instanceof
        InactiveSessionUserError
    ) {
      return null
    }

    throw error
  }
}

export default async function AdminLayout({
  children,
}: {
  children:
    ReactNode
}) {
  const profile =
    await resolveProfile()

  if (!profile) {
    redirect(
      "/login",
    )
  }

  if (
    !profile.canAccessAdmin
  ) {
    redirect(
      "/dashboard",
    )
  }

  return (
    <AdminShell
      profile={
        profile
      }
    >
      {children}
    </AdminShell>
  )
}
