import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/server/security/constants";
import { validateSession } from "./session.service";
import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "./session.errors";

// Own-account setup/management needs a primary session, not administrative MFA.
// This never rotates cookies, revokes sessions or changes enrollment state.
export async function requireOwnPageSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    return await validateSession(token, { updateLastSeen: false });
  } catch (error) {
    if (
      error instanceof ExpiredSessionError ||
      error instanceof InactiveSessionUserError ||
      error instanceof InvalidSessionError ||
      error instanceof RevokedSessionError
    )
      redirect("/login");
    throw error;
  }
}
