import "@/components/admin/admin-theme.css";
import { accessDestination } from "@/lib/auth/access-destination";
import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";

import { SESSION_COOKIE_NAME } from "@/server/security/constants";

import { validateSession } from "@/server/auth/session.service";

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "@/server/auth/session.errors";

import { firstAccessState } from "@/server/auth/first-access.service";

async function resolveProfile() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const session = await validateSession(token, {
      updateLastSeen: false,
    });

    return firstAccessState(session.user.id, session.session.id);
  } catch (error) {
    if (
      error instanceof InvalidSessionError ||
      error instanceof ExpiredSessionError ||
      error instanceof RevokedSessionError ||
      error instanceof InactiveSessionUserError
    ) {
      return null;
    }

    throw error;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const state = await resolveProfile();
  const profile = state?.profile;

  if (!profile) {
    redirect("/login");
  }

  if (!profile.canAccessAdmin) {
    redirect(accessDestination(profile));
  }

  if (!state?.verified) redirect("/primeiros-passos");

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
