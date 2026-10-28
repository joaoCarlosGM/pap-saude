import { verifiedSessionToken } from "../helpers/verified-admin-session";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { resolveLoginNavigation } from "../../src/server/auth/login-navigation.service";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { createSession } from "../../src/server/auth/session.service";
import { SESSION_TTL_SECONDS } from "../../src/server/security/constants";
import { fixture } from "./fixtures";
import { verifiedLoginFixture, navigationFingerprint } from "./login-fixtures";

after(() => db.$disconnect());
test("login navigation uses live session, MFA and effective permissions without writes", async (t) => {
  assert.equal(
    (await db.$queryRaw<{ name: string }[]>`SELECT current_database() name`)[0]
      .name,
    "pap_saude_onboarding_test",
  );
  await bootstrapSystemIam();
  await t.test("missing and forged session cookies show login", async () => {
    assert.deepEqual(await resolveLoginNavigation(), { view: "LOGIN" });
    assert.deepEqual(await resolveLoginNavigation("forged-cookie"), {
      view: "LOGIN",
    });
  });
  await t.test(
    "expired, revoked and inactive sessions show login without mutation",
    async () => {
      for (const kind of ["expired", "revoked", "inactive"] as const) {
        const f = await fixture();
        if (kind === "expired")
          await db.session.update({
            where: { id: f.session.session.id },
            data: {
              createdAt: new Date(Date.now() - 9 * 3_600_000),
              lastSeenAt: new Date(Date.now() - 9 * 3_600_000),
              expiresAt: new Date(Date.now() - 3_600_000),
            },
          });
        if (kind === "revoked")
          await db.session.update({
            where: { id: f.session.session.id },
            data: { revokedAt: new Date(), revocationReason: "LOGOUT" },
          });
        if (kind === "inactive")
          await db.user.update({
            where: { id: f.user.id },
            data: { isActive: false },
          });
        const before = await navigationFingerprint(f.user.id);
        assert.deepEqual(await resolveLoginNavigation(f.session.token), {
          view: "LOGIN",
        });
        assert.ok(before === (await navigationFingerprint(f.user.id)));
      }
    },
  );
  await t.test(
    "primary administrator and incomplete first access go only to setup",
    async () => {
      const primary = await fixture();
      assert.deepEqual(await resolveLoginNavigation(primary.session.token), {
        view: "REDIRECT",
        destination: "/primeiros-passos",
      });
      const incomplete = await verifiedLoginFixture(false);
      assert.deepEqual(
        await resolveLoginNavigation(incomplete.verified.sessionToken),
        { view: "REDIRECT", destination: "/primeiros-passos" },
      );
    },
  );
  await t.test(
    "verified administrator with complete onboarding goes to admin preserving old session and MFA",
    async () => {
      const f = await verifiedLoginFixture();
      // An old lastSeenAt must not be refreshed by merely visiting login.
      await db.session.update({
        where: { id: f.verified.session.id },
        data: {
          createdAt: new Date(Date.now() - 1_200_000),
          lastSeenAt: new Date(Date.now() - 600_000),
          expiresAt: new Date(
            Date.now() - 1_200_000 + SESSION_TTL_SECONDS * 1000,
          ),
        },
      });
      const before = await navigationFingerprint(f.user.id);
      for (let i = 0; i < 3; i++)
        assert.deepEqual(
          await resolveLoginNavigation(f.verified.sessionToken),
          { view: "REDIRECT", destination: "/admin" },
        );
      assert.ok(before === (await navigationFingerprint(f.user.id)));
      assert.equal(
        f.verified.session.expiresAt.getTime() -
          f.verified.session.createdAt.getTime(),
        SESSION_TTL_SECONDS * 1000,
      );
      // Completed metadata cannot elevate the original primary session.
      assert.deepEqual(await resolveLoginNavigation(f.session.token), {
        view: "REDIRECT",
        destination: "/primeiros-passos",
      });
    },
  );
  await t.test(
    "professional requires MFA and cannot complete onboarding by deferral; active factor still challenges at login",
    async () => {
      const f = await fixture("PROFESSIONAL");
      assert.deepEqual(await resolveLoginNavigation(f.session.token), {
        view: "REDIRECT",
        destination: "/primeiros-passos",
      });
      assert.equal((await f.post("DEFER_OPTIONAL_MFA")).status,400);
      assert.deepEqual(await resolveLoginNavigation(f.session.token), {
        view: "REDIRECT",
        destination: "/primeiros-passos",
      });
      const setup = await (await f.post("START_MFA")).json();
      const OTPAuth = await import("otpauth");
      await f.post("CONFIRM_MFA", {
        factorId: setup.factorId,
        code: OTPAuth.URI.parse(setup.provisioningUri).generate(),
      });
      assert.deepEqual(await resolveLoginNavigation(f.session.token), {
        view: "REDIRECT",
        destination: "/primeiros-passos",
      });
      const login = await authenticateLogin({
        email: f.user.email,
        password: f.password,
        origin: "a11-optional-mfa",
      });
      assert.ok(login.status === "MFA_REQUIRED");
      assert.deepEqual(
        await resolveLoginNavigation(f.session.token, login.challengeToken),
        { view: "MFA" },
      );
    },
  );
  await t.test(
    "absent, revoked or inactive scoped access is restricted even with completed metadata",
    async () => {
      for (const kind of ["role", "membership", "organization"] as const) {
        const f = await fixture("PROFESSIONAL");
        const verified=await verifiedSessionToken(f.user.id);
        if (kind === "role")
          await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
        if (kind === "membership")
          await db.membership.updateMany({
            where: { userId: f.user.id },
            data: { status: "SUSPENDED" },
          });
        if (kind === "organization")
          await db.organization.update({
            where: { id: f.unit.id },
            data: { status: "SUSPENDED" },
          });
        const before = await navigationFingerprint(f.user.id);
        assert.deepEqual(await resolveLoginNavigation(verified), {
          view: "RESTRICTED",
        });
        assert.ok(before === (await navigationFingerprint(f.user.id)));
      }
    },
  );
  await t.test(
    "live MFA challenge takes precedence over an older session without consuming or granting access",
    async () => {
      const f = await verifiedLoginFixture();
      const other = await verifiedLoginFixture();
      const login = await authenticateLogin({
        email: f.user.email,
        password: f.password,
        origin: "a11-pending-test",
      });
      assert.ok(login.status === "MFA_REQUIRED");
      const before = await navigationFingerprint(f.user.id);
      for (const token of [
        undefined,
        f.session.token,
        other.verified.sessionToken,
      ]) {
        assert.deepEqual(
          await resolveLoginNavigation(token, login.challengeToken),
          { view: "MFA" },
        );
      }
      assert.ok(before === (await navigationFingerprint(f.user.id)));
    },
  );
  await t.test(
    "invalid, expired, revoked and consumed challenges cannot grant or loop into setup",
    async () => {
      assert.deepEqual(
        await resolveLoginNavigation(undefined, "forged-challenge"),
        { view: "LOGIN" },
      );
      for (const kind of ["expired", "revoked", "consumed"] as const) {
        const f = await verifiedLoginFixture();
        const login = await authenticateLogin({
          email: f.user.email,
          password: f.password,
          origin: "a11-stale-challenge",
        });
        assert.ok(login.status === "MFA_REQUIRED");
        await db.mfaChallenge.updateMany({
          where: { userId: f.user.id, consumedAt: null },
          data:
            kind === "expired"
              ? {
                  createdAt: new Date(Date.now() - 600_000),
                  expiresAt: new Date(Date.now() - 300_000),
                }
              : kind === "revoked"
                ? { revokedAt: new Date() }
                : { consumedAt: new Date() },
        });
        assert.deepEqual(
          await resolveLoginNavigation(undefined, login.challengeToken),
          { view: "LOGIN" },
        );
        assert.deepEqual(
          await resolveLoginNavigation(
            f.verified.sessionToken,
            login.challengeToken,
          ),
          { view: "REDIRECT", destination: "/admin" },
        );
      }
    },
  );
  await t.test(
    "a newly created primary session cannot inherit another session's MFA",
    async () => {
      const f = await verifiedLoginFixture();
      const fresh = await createSession({ userId: f.user.id });
      assert.deepEqual(await resolveLoginNavigation(fresh.token), {
        view: "REDIRECT",
        destination: "/primeiros-passos",
      });
      assert.equal(
        (
          await db.session.findUniqueOrThrow({
            where: { id: fresh.session.id },
          })
        ).mfaVerifiedAt,
        null,
      );
    },
  );
});
