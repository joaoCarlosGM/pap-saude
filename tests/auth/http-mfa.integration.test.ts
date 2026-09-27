import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import * as OTPAuth from "otpauth";

import {
  MfaFactorStatus,
  MfaFactorType,
  PasswordAlgorithm,
} from "@prisma/client";

import {
  NextRequest,
} from "next/server";

import { db } from "../../src/server/db/client";

import {
  hashPassword,
} from "../../src/server/auth/password";

import {
  encryptSecret,
} from "../../src/server/security/secret-encryption";

import {
  MFA_CHALLENGE_COOKIE_NAME,
  MFA_TOTP_ALGORITHM,
  MFA_TOTP_DIGITS,
  MFA_TOTP_ISSUER,
  MFA_TOTP_PERIOD_SECONDS,
  SESSION_COOKIE_NAME,
} from "../../src/server/security/constants";

import {
  POST as loginPOST,
} from "../../src/app/api/auth/login/route";

import {
  POST as mfaPOST,
} from "../../src/app/api/auth/mfa/verify/route";

const USER_ID =
  "00000000-0000-4000-8000-00000000f13c";

const EMAIL =
  "foundation-http-f03c@papsaude.local";

const PASSWORD =
  "Foundation-HTTP-F03C-Password";

const SECRET =
  "JBSWY3DPEHPK3PXP";

const WEB_ORIGIN =
  "http://localhost:3000";

const CLIENT_ORIGIN =
  "203.0.113.160";

async function clearFixtures() {
  await db.mfaChallenge.deleteMany();
  await db.loginAttempt.deleteMany();
  await db.auditEvent.deleteMany();
  await db.session.deleteMany();
  await db.mfaFactor.deleteMany({
    where: {
      userId:
        USER_ID,
    },
  });
  await db.passwordCredential.deleteMany({
    where: {
      userId:
        USER_ID,
    },
  });
  await db.user.deleteMany({
    where: {
      id:
        USER_ID,
    },
  });
}

async function createUser() {
  const enabledAt =
    new Date(
      "2030-01-01T10:00:00.000Z",
    );

  await db.user.create({
    data: {
      id:
        USER_ID,
      email:
        EMAIL,
      displayName:
        "HTTP MFA User",
      isActive:
        true,
    },
  });

  await db.passwordCredential.create({
    data: {
      userId:
        USER_ID,
      passwordHash:
        await hashPassword(
          PASSWORD,
        ),
      algorithm:
        PasswordAlgorithm.ARGON2ID,
    },
  });

  await db.mfaFactor.create({
    data: {
      userId:
        USER_ID,
      type:
        MfaFactorType.TOTP,
      status:
        MfaFactorStatus.ACTIVE,
      secretEncrypted:
        encryptSecret(
          SECRET,
        ),
      label:
        EMAIL,
      createdAt:
        enabledAt,
      enabledAt,
    },
  });
}

function code(
  timestamp = new Date(),
) {
  return new OTPAuth.TOTP({
    issuer:
      MFA_TOTP_ISSUER,
    label:
      EMAIL,
    algorithm:
      MFA_TOTP_ALGORITHM,
    digits:
      MFA_TOTP_DIGITS,
    period:
      MFA_TOTP_PERIOD_SECONDS,
    secret:
      SECRET,
  }).generate({
    timestamp:
      timestamp.getTime(),
  });
}

before(() => {
  process.env.AUTH_ALLOWED_ORIGINS =
    WEB_ORIGIN;

  process.env.AUTH_TRUSTED_CLIENT_IP_HEADER =
    "x-pap-test-client-ip";
});

beforeEach(async () => {
  await clearFixtures();
  await createUser();
});

after(async () => {
  await clearFixtures();
});

test(
  "HTTP password login with MFA sets challenge cookie but no session cookie",
  async () => {
    const request =
      new NextRequest(
        `${WEB_ORIGIN}/api/auth/login`,
        {
          method:
            "POST",
          headers: {
            origin:
              WEB_ORIGIN,
            "content-type":
              "application/json",
            "x-pap-test-client-ip":
              CLIENT_ORIGIN,
          },
          body:
            JSON.stringify({
              email:
                EMAIL,
              password:
                PASSWORD,
            }),
        },
      );

    const response =
      await loginPOST(
        request,
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.authenticated,
      false,
    );

    assert.equal(
      body.mfaRequired,
      true,
    );

    const cookie =
      response.headers.get(
        "set-cookie",
      ) ?? "";

    assert.match(
      cookie,
      new RegExp(
        `${MFA_CHALLENGE_COOKIE_NAME}=`,
      ),
    );

    assert.doesNotMatch(
      cookie,
      new RegExp(
        `${SESSION_COOKIE_NAME}=`,
      ),
    );

    assert.equal(
      await db.session.count(),
      0,
    );
  },
);

test(
  "HTTP MFA verification consumes challenge and creates session cookie",
  async () => {
    const login =
      await loginPOST(
        new NextRequest(
          `${WEB_ORIGIN}/api/auth/login`,
          {
            method:
              "POST",
            headers: {
              origin:
                WEB_ORIGIN,
              "content-type":
                "application/json",
              "x-pap-test-client-ip":
                CLIENT_ORIGIN,
            },
            body:
              JSON.stringify({
                email:
                  EMAIL,
                password:
                  PASSWORD,
              }),
          },
        ),
      );

    const challengeCookie =
      (
        login.headers.get(
          "set-cookie",
        ) ?? ""
      ).split(";")[0];

    assert.match(
      challengeCookie,
      new RegExp(
        `^${MFA_CHALLENGE_COOKIE_NAME}=`,
      ),
    );

    const now =
      new Date();

    const response =
      await mfaPOST(
        new NextRequest(
          `${WEB_ORIGIN}/api/auth/mfa/verify`,
          {
            method:
              "POST",
            headers: {
              origin:
                WEB_ORIGIN,
              "content-type":
                "application/json",
              "x-pap-test-client-ip":
                CLIENT_ORIGIN,
              cookie:
                challengeCookie,
            },
            body:
              JSON.stringify({
                code:
                  code(now),
              }),
          },
        ),
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.authenticated,
      true,
    );

    const setCookie =
      response.headers.get(
        "set-cookie",
      ) ?? "";

    assert.match(
      setCookie,
      new RegExp(
        `${SESSION_COOKIE_NAME}=`,
      ),
    );

    assert.match(
      setCookie,
      /HttpOnly/i,
    );

    assert.equal(
      await db.session.count(),
      1,
    );

    const challenge =
      await db.mfaChallenge.findFirstOrThrow();

    assert.ok(
      challenge.consumedAt,
    );
  },
);
