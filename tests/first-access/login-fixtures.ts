import * as OTPAuth from "otpauth";
import { fixture } from "./fixtures";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { completeMfaLoginWithRecoveryCode } from "../../src/server/auth/mfa-login.service";
import { runFirstAccessAction } from "../../src/server/auth/first-access.service";
import { db } from "../../src/server/db/client";

// Real enrollment and second-factor authentication, never synthetic MFA flags.
export async function verifiedLoginFixture(complete = true) {
  const f = await fixture();
  const setup = await (await f.post("START_MFA")).json();
  const confirmation = await (
    await f.post("CONFIRM_MFA", {
      factorId: setup.factorId,
      code: OTPAuth.URI.parse(setup.provisioningUri).generate(),
    })
  ).json();
  await f.post("ACK_RECOVERY");
  const login = await authenticateLogin({
    email: f.user.email,
    password: f.password,
    origin: "a11-navigation-test",
  });
  if (login.status !== "MFA_REQUIRED")
    throw new Error("Expected MFA challenge");
  const verified = await completeMfaLoginWithRecoveryCode({
    challengeToken: login.challengeToken,
    recoveryCode: confirmation.codes[0],
  });
  if (complete)
    await runFirstAccessAction(
      f.user.id,
      verified.session.id,
      "COMPLETE_ONBOARDING",
    );
  return { ...f, verified, codes: confirmation.codes as string[] };
}

// Private values stay in test memory; assertions compare booleans only.
export async function navigationFingerprint(userId: string) {
  const rows = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.passwordCredential.findUnique({ where: { userId } }),
    db.session.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.mfaFactor.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.mfaRecoveryCode.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.mfaChallenge.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.roleAssignment.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.membership.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.userOnboardingProgress.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    }),
  ]);
  return JSON.stringify(rows);
}
