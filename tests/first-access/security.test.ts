import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixtures";
import * as OTPAuth from "otpauth";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { authenticateLogin } from "../../src/server/auth/login.service";
import {
  completeMfaLogin,
  completeMfaLoginWithRecoveryCode,
} from "../../src/server/auth/mfa-login.service";
import * as security from "../../src/app/api/auth/security/route";
import { PATCH as genericProgress } from "../../src/app/api/onboarding/[tourKey]/route";
import { GET as organizations } from "../../src/app/api/admin/organizations/route";
import { PERMISSIONS } from "../../src/server/iam/permissions";
import { requirePermission } from "../../src/server/iam/authorization.service";
const origin = "http://127.0.0.1:3110";
export function request(
  token: string,
  action?: string,
  extras: Record<string, unknown> = {},
  from = origin,
) {
  return new NextRequest(origin + "/api/auth/security", {
    method: action ? "POST" : "GET",
    headers: {
      cookie: `pap_session=${token}`,
      origin: from,
      "Content-Type": "application/json",
    },
    ...(action ? { body: JSON.stringify({ action, ...extras }) } : {}),
  });
}
after(() => db.$disconnect());
test("first access adversarial API and role journeys", async (t) => {
  assert.equal(
    (
      await db.$queryRaw<
        Array<{ name: string }>
      >`SELECT current_database() name`
    )[0].name,
    "pap_saude_onboarding_test",
  );
  await bootstrapSystemIam();
  await t.test(
    "session and CSRF rejection leave enrollment untouched",
    async () => {
      const f = await fixture();
      assert.equal(
        (
          await security.POST(
            request("missing", "START_MFA", { password: f.password }),
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await security.POST(
            request(
              f.session.token,
              "START_MFA",
              { password: f.password },
              "https://foreign.invalid",
            ),
          )
        ).status,
        403,
      );
      assert.equal(
        await db.mfaFactor.count({ where: { userId: f.user.id } }),
        0,
      );
    },
  );
  await t.test(
    "no key on posture reads; double START needs explicit replacement; stale factor cannot confirm",
    async () => {
      const f = await fixture();
      await security.GET(request(f.session.token));
      await security.GET(request(f.session.token));
      assert.equal(
        await db.mfaFactor.count({ where: { userId: f.user.id } }),
        0,
      );
      const starts = await Promise.all([
        f.post("START_MFA"),
        f.post("START_MFA"),
      ]);
      assert.deepEqual(starts.map((r) => r.status).sort(), [200, 409]);
      const first = await starts.find((r) => r.status === 200)!.json();
      const second = await (
        await f.post("START_MFA", { restart: true })
      ).json();
      assert.ok(first.factorId !== second.factorId);
      const denied = await f.post("CONFIRM_MFA", {
        factorId: first.factorId,
        code: OTPAuth.URI.parse(first.provisioningUri).generate(),
      });
      assert.equal((await denied.json()).error, "MFA_ENROLLMENT_REPLACED");
      assert.equal(
        await db.mfaFactor.count({
          where: { userId: f.user.id, status: "ACTIVE" },
        }),
        0,
      );
    },
  );
  await t.test(
    "generic failure is reproducible as distinct wrong password, code and expiration",
    async () => {
      const f = await fixture();
      assert.equal(
        (await (await f.post("START_MFA", { password: "wrong" })).json()).error,
        "INVALID_REAUTH",
      );
      const pending = await (await f.post("START_MFA")).json();
      const staleCode = OTPAuth.URI.parse(pending.provisioningUri).generate({
        timestamp: Date.now() - 120000,
      });
      assert.equal(
        (
          await (
            await f.post("CONFIRM_MFA", {
              factorId: pending.factorId,
              code: staleCode,
            })
          ).json()
        ).error,
        "INVALID_MFA_CODE",
      );
      await db.mfaFactor.update({
        where: { id: pending.factorId },
        data: { createdAt: new Date(Date.now() - 660000) },
      });
      assert.equal(
        (await (await security.GET(request(f.session.token))).json()).factors[0]
          .expired,
        true,
      );
      assert.equal(
        (
          await (
            await f.post("CONFIRM_MFA", {
              factorId: pending.factorId,
              code: OTPAuth.URI.parse(pending.provisioningUri).generate(),
            })
          ).json()
        ).error,
        "MFA_ENROLLMENT_EXPIRED",
      );
      assert.equal(
        (
          await db.mfaFactor.findUniqueOrThrow({
            where: { id: pending.factorId },
          })
        ).status,
        "REVOKED",
      );
    },
  );
  await t.test(
    "confirmation brute force has durable account throttle",
    async () => {
      const f = await fixture();
      const pending = await (await f.post("START_MFA")).json();
      for (let i = 0; i < 5; i++)
        assert.equal(
          (
            await f.post("CONFIRM_MFA", {
              factorId: pending.factorId,
              code: "bad",
            })
          ).status,
          400,
        );
      assert.equal(
        (
          await f.post("CONFIRM_MFA", {
            factorId: pending.factorId,
            code: OTPAuth.URI.parse(pending.provisioningUri).generate(),
          })
        ).status,
        429,
      );
    },
  );
  await t.test(
    "lost recovery response resumes with strong reauth without replacing the active factor",
    async () => {
      const f = await fixture();
      const pending = await (await f.post("START_MFA")).json();
      const code = OTPAuth.URI.parse(pending.provisioningUri).generate();
      const confirmation = await f.post("CONFIRM_MFA", {
        factorId: pending.factorId,
        code,
      });
      assert.equal(confirmation.status, 200);
      // Simulate losing the response at the browser: no plaintext retained.
      const posture = await (
        await security.GET(request(f.session.token))
      ).json();
      assert.equal(posture.onboarding.active, true);
      assert.equal(posture.onboarding.progress.currentStep, 5);
      assert.ok(!JSON.stringify(posture).includes(pending.secret));
      assert.equal(
        (await f.post("GENERATE_RECOVERY_CODES", { password: "wrong", code }))
          .status,
        400,
      );
      const rotated = await f.post("GENERATE_RECOVERY_CODES", { code });
      assert.equal(rotated.status, 200);
      assert.equal((await rotated.json()).codes.length, 10);
      assert.equal(
        await db.mfaFactor.count({ where: { userId: f.user.id } }),
        1,
      );
      assert.equal(
        await db.auditEvent.count({
          where: { actorUserId: f.user.id, action: "MFA_ENROLLMENT_CONFIRMED" },
        }),
        1,
      );
      assert.equal(
        (
          await db.session.findUniqueOrThrow({
            where: { id: f.session.session.id },
          })
        ).mfaVerifiedAt,
        null,
      );
      assert.equal((await f.post("ACK_RECOVERY")).status, 200);
      assert.equal((await f.post("COMPLETE_ONBOARDING")).status, 400);
    },
  );
  for (const role of [
    "PAP_ADMIN",
    "HEALTH_UNIT_ADMIN",
    "PROFESSIONAL",
  ] as const)
    await t.test(
      `${role}: enrollment, recovery acknowledgment and real MFA login`,
      async () => {
        const f = await fixture(role);
        const state = await (
          await security.GET(request(f.session.token))
        ).json();
        assert.equal(state.onboarding.mfaRequired, true);
        assert.equal((await f.post("COMPLETE_ONBOARDING")).status, 400);
        assert.equal((await f.post("DEFER_OPTIONAL_MFA")).status, 400);
        const forged = await genericProgress(
          new NextRequest(origin + "/api/onboarding/security-first-access", {
            method: "PATCH",
            headers: {
              origin,
              cookie: `pap_session=${f.session.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              version: 1,
              currentStep: 7,
              status: "COMPLETED",
            }),
          }),
          { params: Promise.resolve({ tourKey: "security-first-access" }) },
        );
        assert.equal(forged.status, 400);
        const pending = await (await f.post("START_MFA")).json();
        const other = await fixture();
        assert.equal(
          (
            await other.post("CONFIRM_MFA", {
              factorId: pending.factorId,
              code: OTPAuth.URI.parse(pending.provisioningUri).generate(),
            })
          ).status,
          400,
        );
        const confirmed = await f.post("CONFIRM_MFA", {
          factorId: pending.factorId,
          code: OTPAuth.URI.parse(pending.provisioningUri).generate(),
        });
        assert.equal(confirmed.status, 200);
        const result = await confirmed.json();
        assert.equal(result.codes.length, 10);
        assert.equal(
          (
            await db.session.findUniqueOrThrow({
              where: { id: f.session.session.id },
            })
          ).mfaVerifiedAt,
          null,
        );
        if (role !== "PROFESSIONAL")
          assert.equal(
            (
              await organizations(
                new NextRequest(origin + "/api/admin/organizations", {
                  headers: { cookie: `pap_session=${f.session.token}` },
                }),
              )
            ).status,
            403,
          );
        assert.equal(
          (await f.post("START_MFA", { restart: true })).status,
          400,
        );
        const raw = JSON.stringify(
          await (await security.GET(request(f.session.token))).json(),
        );
        assert.ok(
          !raw.includes(pending.secret) && !raw.includes(result.codes[0]),
        );
        assert.equal((await f.post("COMPLETE_ONBOARDING")).status, 400);
        assert.equal((await f.post("ACK_RECOVERY")).status, 200);
        assert.equal((await f.post("COMPLETE_ONBOARDING")).status, 400);
        const login = await authenticateLogin({
          email: f.user.email,
          password: f.password,
          origin: "synthetic-first-access",
        });
        assert.equal(login.status, "MFA_REQUIRED");
        if (login.status !== "MFA_REQUIRED") return;
        const verified = await completeMfaLogin({
          challengeToken: login.challengeToken,
          code: OTPAuth.URI.parse(pending.provisioningUri).generate(),
        });
        assert.equal(
          (
            await security.POST(
              request(verified.sessionToken, "COMPLETE_ONBOARDING"),
            )
          ).status,
          200,
        );
        await f.post("ONBOARDING_STEP", { step: 1 });
        const progress = await (
          await security.GET(request(verified.sessionToken))
        ).json();
        assert.equal(progress.onboarding.progress.status, "COMPLETED");
        assert.equal(progress.onboarding.progress.currentStep, 7);
        const recoveryLogin = await authenticateLogin({
          email: f.user.email,
          password: f.password,
          origin: "synthetic-recovery",
        });
        if (recoveryLogin.status !== "MFA_REQUIRED")
          throw new Error("expected MFA challenge");
        await completeMfaLoginWithRecoveryCode({
          challengeToken: recoveryLogin.challengeToken,
          recoveryCode: result.codes[0],
        });
        await assert.rejects(() =>
          completeMfaLoginWithRecoveryCode({
            challengeToken: recoveryLogin.challengeToken,
            recoveryCode: result.codes[0],
          }),
        );
        if (role === "PAP_ADMIN")
          await assert.rejects(() =>
            requirePermission({
              userId: f.user.id,
              permission: PERMISSIONS.PATIENT_READ,
              organizationId: f.unit.id,
            }),
          );
      },
    );
  await t.test(
    "professional cannot defer; progress remains owner-scoped and cannot bypass admin guards",
    async () => {
      const f = await fixture("PROFESSIONAL"),
        other = await fixture();
      assert.equal(
        (await f.post("DEFER_OPTIONAL_MFA", { userId: other.user.id })).status,
        400,
      );
      assert.equal(
        (await (await security.GET(request(other.session.token))).json())
          .onboarding.progress,
        null,
      );
      assert.equal(
        (
          await organizations(
            new NextRequest(origin + "/api/admin/organizations", {
              headers: { cookie: `pap_session=${f.session.token}` },
            }),
          )
        ).status,
        403,
      );
    },
  );
});
