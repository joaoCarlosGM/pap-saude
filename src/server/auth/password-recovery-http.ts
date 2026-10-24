import type { NextRequest } from "next/server";
import { resolveTrustedClientOrigin } from "./http-auth";
import { issuePasswordReset } from "./password-security.service";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email.service";
import { readSecurityBody, securityFailure, securityJson, stringField, validateOrigin } from "./security-http";

type ScheduleAfterResponse = (task: () => Promise<void>) => void;

/** Keep every identity-dependent operation outside the public response lifecycle.
 * The scheduler is Next's `after` in production; tests explicitly drain callbacks.
 * This is lifecycle-managed work, not a durable queue: interrupted workers require
 * a new request. A 202 acknowledges the request, never delivery or account existence.
 */
export function createForgotPasswordHandler(
  schedule: ScheduleAfterResponse,
  issue: typeof issuePasswordReset = issuePasswordReset,
) {
  return async function POST(request: NextRequest) {
    try {
      validateOrigin(request);
      const origin = resolveTrustedClientOrigin(request);
      const body = await readSecurityBody(request);
      const email = stringField(body, "email", 320);
      if (email.includes("@")) schedule(async () => {
        try {
          await issue({ email, origin, deliver: sendPasswordResetEmail });
        } catch {
          // Never pass an exception, address or request body to framework logging.
          console.error("PASSWORD_RESET_BACKGROUND_FAILED");
        }
      });
      return securityJson({ accepted: true }, 202);
    } catch (error) {
      return securityFailure(error);
    }
  };
}
