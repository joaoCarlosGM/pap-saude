import { randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import {
  startTotpEnrollment,
  confirmTotpEnrollment,
} from "../../src/server/auth/totp.service";
import { generateRecoveryCodes } from "../../src/server/auth/recovery-code.service";
import { createMfaChallenge } from "../../src/server/auth/mfa-challenge.service";
import { completeMfaLoginWithRecoveryCode } from "../../src/server/auth/mfa-login.service";
// Test-only crypto material stays in memory. Exercise real enrollment + second-factor verification.
process.env.MFA_SECRET_ENCRYPTION_KEY ??= randomBytes(32).toString("base64url");
process.env.MFA_SECRET_ENCRYPTION_KEY_ID ??= "synthetic-role-regression";
const sessions = new Map<string, Promise<string>>();
export function verifiedSessionToken(userId: string): Promise<string> {
  let pending = sessions.get(userId);
  if (!pending) {
    pending = (async () => {
      const setup = await startTotpEnrollment({ userId, initialOnly: true });
      await confirmTotpEnrollment({
        userId,
        factorId: setup.factorId,
        code: OTPAuth.URI.parse(setup.provisioningUri).generate(),
        initialOnly: true,
      });
      const recovery = await generateRecoveryCodes(userId);
      const challenge = await createMfaChallenge({ userId });
      const verified = await completeMfaLoginWithRecoveryCode({
        challengeToken: challenge.token,
        recoveryCode: recovery.codes[0],
      });
      return verified.sessionToken;
    })();
    sessions.set(userId, pending);
  }
  return pending;
}
