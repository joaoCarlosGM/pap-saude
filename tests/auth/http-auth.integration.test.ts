import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  NextRequest,
} from "next/server";

import {
  PasswordAlgorithm,
  SessionRevocationReason,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  getSessionCookieOptions,
  resolveTrustedClientOrigin,
} from "../../src/server/auth/http-auth";

import {
  hashPassword,
} from "../../src/server/auth/password";

import {
  SESSION_COOKIE_NAME,
} from "../../src/server/security/constants";

import {
  POST as loginPOST,
} from "../../src/app/api/auth/login/route";

import {
  GET as sessionGET,
} from "../../src/app/api/auth/session/route";

import {
  POST as logoutPOST,
} from "../../src/app/api/auth/logout/route";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f02e";

const EMAIL =
  "foundation-f02e@papsaude.local";

const PASSWORD =
  "Foundation-F02E-Password-2026";

const ORIGIN =
  "203.0.113.82";

const WEB_ORIGIN =
  "http://localhost:3000";

const previousAllowedOrigins =
  process.env.AUTH_ALLOWED_ORIGINS;

const previousTrustedHeader =
  process.env.AUTH_TRUSTED_CLIENT_IP_HEADER;

function loginRequest(
  password = PASSWORD,
): NextRequest {
  return new NextRequest(
    `${WEB_ORIGIN}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        origin:
          WEB_ORIGIN,
        "x-pap-test-client-ip":
          ORIGIN,
        "user-agent":
          "PAP-F02E-Test",
      },
      body: JSON.stringify({
        email: EMAIL,
        password,
      }),
    },
  );
}

async function assertSafeDatabase(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ database: string }>
  >`SELECT current_database() AS database`;

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  );
}

async function clearFixtures(): Promise<void> {
  await db.loginAttempt.deleteMany();
  await db.auditEvent.deleteMany();

  await db.session.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  await db.passwordCredential.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  await db.user.deleteMany({
    where: {
      id: USER_ID,
    },
  });
}

async function createUser(): Promise<void> {
  await db.user.create({
    data: {
      id: USER_ID,
      email: EMAIL,
      displayName:
        "Foundation F02E",
      isActive: true,
    },
  });

  await db.passwordCredential.create({
    data: {
      userId: USER_ID,
      passwordHash:
        await hashPassword(PASSWORD),
      algorithm:
        PasswordAlgorithm.ARGON2ID,
    },
  });
}

before(async () => {
  process.env.AUTH_ALLOWED_ORIGINS =
    WEB_ORIGIN;

  process.env.AUTH_TRUSTED_CLIENT_IP_HEADER =
    "x-pap-test-client-ip";

  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
  await createUser();
});

after(async () => {
  await clearFixtures();

  if (
    previousAllowedOrigins === undefined
  ) {
    delete process.env.AUTH_ALLOWED_ORIGINS;
  } else {
    process.env.AUTH_ALLOWED_ORIGINS =
      previousAllowedOrigins;
  }

  if (
    previousTrustedHeader === undefined
  ) {
    delete process.env.AUTH_TRUSTED_CLIENT_IP_HEADER;
  } else {
    process.env.AUTH_TRUSTED_CLIENT_IP_HEADER =
      previousTrustedHeader;
  }
});

test(
  "production cookie policy is HttpOnly Secure SameSite Lax",
  () => {
    const options =
      getSessionCookieOptions(true);

    assert.equal(
      options.httpOnly,
      true,
    );

    assert.equal(
      options.secure,
      true,
    );

    assert.equal(
      options.sameSite,
      "lax",
    );

    assert.equal(
      options.path,
      "/",
    );

    assert.equal(
      options.maxAge,
      8 * 60 * 60,
    );

    assert.equal(
      options.priority,
      "high",
    );
  },
);

test(
  "trusted client origin uses only explicitly configured header",
  () => {
    const request =
      new Request(
        `${WEB_ORIGIN}/`,
        {
          headers: {
            "x-pap-test-client-ip":
              ORIGIN,
            "x-forwarded-for":
              "1.2.3.4",
            "cf-connecting-ip":
              "5.6.7.8",
          },
        },
      );

    assert.equal(
      resolveTrustedClientOrigin(
        request,
      ),
      ORIGIN,
    );
  },
);

test(
  "valid HTTP login creates session and HttpOnly cookie",
  async () => {
    const response =
      await loginPOST(
        loginRequest(),
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

    assert.equal(
      body.user.id,
      USER_ID,
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

    assert.match(
      setCookie,
      /SameSite=Lax/i,
    );

    assert.match(
      setCookie,
      /Path=\//i,
    );

    assert.match(
      setCookie,
      /Max-Age=28800/i,
    );

    const session =
      await db.session.findFirstOrThrow({
        where: {
          userId: USER_ID,
        },
      });

    assert.ok(
      session.ipHash,
    );

    assert.equal(
      session.ipHash.length,
      64,
    );

    assert.notEqual(
      session.ipHash,
      ORIGIN,
    );
  },
);

test(
  "invalid credentials return generic 401 without session cookie",
  async () => {
    const response =
      await loginPOST(
        loginRequest(
          "Wrong-Foundation-F02E-Password",
        ),
      );

    assert.equal(
      response.status,
      401,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "INVALID_CREDENTIALS",
    );

    assert.equal(
      response.headers.get(
        "set-cookie",
      ),
      null,
    );

    assert.equal(
      await db.session.count({
        where: {
          userId: USER_ID,
        },
      }),
      0,
    );
  },
);

test(
  "login rejects an untrusted browser Origin",
  async () => {
    const request =
      new NextRequest(
        `${WEB_ORIGIN}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            origin:
              "https://evil.invalid",
            "x-pap-test-client-ip":
              ORIGIN,
          },
          body: JSON.stringify({
            email: EMAIL,
            password: PASSWORD,
          }),
        },
      );

    const response =
      await loginPOST(request);

    assert.equal(
      response.status,
      403,
    );

    assert.equal(
      await db.session.count(),
      0,
    );
  },
);

test(
  "session endpoint authenticates from cookie",
  async () => {
    const loginResponse =
      await loginPOST(
        loginRequest(),
      );

    const setCookie =
      loginResponse.headers.get(
        "set-cookie",
      );

    assert.ok(setCookie);

    const cookiePair =
      setCookie
        .split(";")[0];

    const request =
      new NextRequest(
        `${WEB_ORIGIN}/api/auth/session`,
        {
          headers: {
            cookie:
              cookiePair,
          },
        },
      );

    const response =
      await sessionGET(request);

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

    assert.equal(
      body.user.id,
      USER_ID,
    );
  },
);

test(
  "logout revokes session and expires cookie",
  async () => {
    const loginResponse =
      await loginPOST(
        loginRequest(),
      );

    const setCookie =
      loginResponse.headers.get(
        "set-cookie",
      );

    assert.ok(setCookie);

    const cookiePair =
      setCookie
        .split(";")[0];

    const logoutRequest =
      new NextRequest(
        `${WEB_ORIGIN}/api/auth/logout`,
        {
          method: "POST",
          headers: {
            origin:
              WEB_ORIGIN,
            cookie:
              cookiePair,
          },
        },
      );

    const logoutResponse =
      await logoutPOST(
        logoutRequest,
      );

    assert.equal(
      logoutResponse.status,
      204,
    );

    const storedSession =
      await db.session.findFirstOrThrow({
        where: {
          userId: USER_ID,
        },
      });

    assert.ok(
      storedSession.revokedAt,
    );

    assert.equal(
      storedSession.revocationReason,
      SessionRevocationReason.LOGOUT,
    );

    const logoutCookie =
      logoutResponse.headers.get(
        "set-cookie",
      ) ?? "";

    assert.match(
      logoutCookie,
      /Max-Age=0/i,
    );

    const sessionRequest =
      new NextRequest(
        `${WEB_ORIGIN}/api/auth/session`,
        {
          headers: {
            cookie:
              cookiePair,
          },
        },
      );

    const sessionResponse =
      await sessionGET(
        sessionRequest,
      );

    assert.equal(
      sessionResponse.status,
      401,
    );
  },
);
