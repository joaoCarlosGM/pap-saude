import { PERMISSIONS } from "@/server/iam/permissions";
import { accessDestination } from "@/lib/auth/access-destination";
import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
import { firstAccessState } from "./first-access.service";
import { loadMfaChallenge } from "./mfa-challenge.service";
import {
  ConsumedMfaChallengeError,
  ExpiredMfaChallengeError,
  InvalidMfaChallengeError,
} from "./mfa.errors";
import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "./session.errors";
import { validateSession } from "./session.service";

type LoginNavigation =
  | { view: "LOGIN" | "MFA" | "RESTRICTED" }
  | {
      view: "REDIRECT";
      destination: "/admin" | "/dashboard" | "/primeiros-passos" | "/comercial" | "/aguardando-autorizacao";
    };

// Read-only navigation, never an access grant. IAM/MFA guards still protect
// destinations and APIs. Do not renew cookies, consume challenges or touch MFA.
export async function resolveLoginNavigation(
  sessionToken?: string,
  challengeToken?: string,
): Promise<LoginNavigation> {
  // An explicit in-progress login takes precedence over an older session,
  // including when the operator is signing into a different account.
  if (challengeToken) {
    try {
      await loadMfaChallenge(challengeToken);
      return { view: "MFA" };
    } catch (error) {
      if (
        !(error instanceof InvalidMfaChallengeError) &&
        !(error instanceof ExpiredMfaChallengeError) &&
        !(error instanceof ConsumedMfaChallengeError)
      )
        throw error;
    }
  }
  if (!sessionToken) return { view: "LOGIN" };

  let session;
  try {
    session = await validateSession(sessionToken, { updateLastSeen: false });
  } catch (error) {
    if (
      error instanceof InvalidSessionError ||
      error instanceof ExpiredSessionError ||
      error instanceof RevokedSessionError ||
      error instanceof InactiveSessionUserError
    )
      return { view: "LOGIN" };
    throw error;
  }

  const state = await firstAccessState(session.user.id, session.session.id);
  const profile = state.profile;
  if (!state.verified) return { view: "REDIRECT", destination: "/primeiros-passos" };
  if (accessDestination(profile) === "/comercial")
    return { view: "REDIRECT", destination: state.progress?.status === "COMPLETED" ? "/comercial" : "/primeiros-passos" };
  // Effective permissions already intersect the canonical role catalogue,
  // persisted grants, active memberships and available organizations.
  if (
    !profile ||
    (!profile.canAccessAdmin &&
      !profile.permissions.includes(PERMISSIONS.PATIENT_READ))
  )
    return await ownAccessStatus(session.user.id)
      ? { view: "REDIRECT", destination: state.progress?.status === "COMPLETED" ? "/aguardando-autorizacao" : "/primeiros-passos" }
      : { view: "RESTRICTED" };

  if (
    state.progress?.status !== "COMPLETED" ||
    (state.mfaRequired && !state.verified)
  )
    return { view: "REDIRECT", destination: "/primeiros-passos" };

  return {
    view: "REDIRECT",
    destination: profile.canAccessAdmin ? "/admin" : "/dashboard",
  };
}
