import type { NextRequest } from "next/server";

import {
  MFA_CHALLENGE_COOKIE_NAME,
  MFA_CHALLENGE_TTL_SECONDS,
  PASSWORD_MAX_LENGTH,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  SESSION_TTL_SECONDS,
} from "@/server/security/constants";

import {
  InvalidLoginPayloadError,
  InvalidRequestOriginError,
  UntrustedClientOriginError,
} from "./http-auth.errors";

const MAX_LOGIN_BODY_BYTES = 16 * 1024;
const MAX_EMAIL_LENGTH = 320;

export interface LoginHttpPayload {
  email: string;
  password: string;
}

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  priority: "high";
}

export function getSessionCookieOptions(
  production = process.env.NODE_ENV === "production",
): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: SESSION_COOKIE_PATH,
    maxAge: SESSION_TTL_SECONDS,
    priority: "high",
  };
}

export function getExpiredSessionCookieOptions(
  production = process.env.NODE_ENV === "production",
): SessionCookieOptions {
  return {
    ...getSessionCookieOptions(production),
    maxAge: 0,
  };
}

function configuredAllowedOrigins(): string[] {
  const configured =
    process.env.AUTH_ALLOWED_ORIGINS
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  if (configured?.length) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
}

export function assertTrustedRequestOrigin(
  request: Request,
): void {
  const origin = request.headers.get("origin");

  if (!origin) {
    throw new InvalidRequestOriginError();
  }

  const allowedOrigins =
    configuredAllowedOrigins();

  if (!allowedOrigins.includes(origin)) {
    throw new InvalidRequestOriginError();
  }
}

export function resolveTrustedClientOrigin(
  request: Request,
): string {
  const configuredHeader =
    process.env.AUTH_TRUSTED_CLIENT_IP_HEADER
      ?.trim()
      .toLowerCase();

  if (configuredHeader) {
    const value =
      request.headers.get(configuredHeader)?.trim();

    if (!value) {
      throw new UntrustedClientOriginError();
    }

    /*
     * Reject lists such as:
     *   1.2.3.4, 5.6.7.8
     *
     * The trusted reverse proxy must provide one canonical
     * client identifier, not a user-controlled forwarding chain.
     */
    if (value.includes(",")) {
      throw new UntrustedClientOriginError();
    }

    return value;
  }

  if (process.env.NODE_ENV === "production") {
    /*
     * Fail closed. Production must explicitly configure the
     * reverse-proxy header that Next.js is allowed to trust.
     */
    throw new UntrustedClientOriginError();
  }

  /*
   * Development-only identifier.
   *
   * We intentionally do NOT trust X-Forwarded-For or
   * CF-Connecting-IP implicitly.
   */
  return "local-development";
}

export function getRequestUserAgent(
  request: Request,
): string | null {
  const userAgent =
    request.headers.get("user-agent")?.trim();

  if (!userAgent) {
    return null;
  }

  return userAgent.slice(0, 512);
}

export async function readLoginPayload(
  request: Request,
): Promise<LoginHttpPayload> {
  const contentType =
    request.headers.get("content-type") ?? "";

  if (
    !contentType
      .toLowerCase()
      .startsWith("application/json")
  ) {
    throw new InvalidLoginPayloadError();
  }

  const contentLength =
    request.headers.get("content-length");

  if (contentLength) {
    const numericLength =
      Number(contentLength);

    if (
      !Number.isFinite(numericLength) ||
      numericLength < 0 ||
      numericLength > MAX_LOGIN_BODY_BYTES
    ) {
      throw new InvalidLoginPayloadError();
    }
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new InvalidLoginPayloadError();
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new InvalidLoginPayloadError();
  }

  const record =
    body as Record<string, unknown>;

  const email = record.email;
  const password = record.password;

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw new InvalidLoginPayloadError();
  }

  if (
    email.length === 0 ||
    email.length > MAX_EMAIL_LENGTH ||
    password.length === 0 ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new InvalidLoginPayloadError();
  }

  return {
    email,
    password,
  };
}

export function readSessionToken(
  request: NextRequest,
): string | null {
  return (
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value ?? null
  );
}


export function getMfaChallengeCookieOptions(
  production = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true as const,
    secure: production,
    sameSite: "lax" as const,
    path: SESSION_COOKIE_PATH,
    maxAge: MFA_CHALLENGE_TTL_SECONDS,
    priority: "high" as const,
  };
}

export function getExpiredMfaChallengeCookieOptions(
  production = process.env.NODE_ENV === "production",
) {
  return {
    ...getMfaChallengeCookieOptions(
      production,
    ),
    maxAge: 0,
  };
}

export function readMfaChallengeToken(
  request: NextRequest,
): string | null {
  return (
    request.cookies.get(
      MFA_CHALLENGE_COOKIE_NAME,
    )?.value ?? null
  );
}

export async function readMfaCodePayload(
  request: Request,
): Promise<{ code: string }> {
  const contentType =
    request.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType
      .toLowerCase()
      .startsWith(
        "application/json",
      )
  ) {
    throw new InvalidLoginPayloadError();
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    throw new InvalidLoginPayloadError();
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new InvalidLoginPayloadError();
  }

  const code =
    (
      body as Record<
        string,
        unknown
      >
    ).code;

  if (
    typeof code !== "string" ||
    !/^\d{6}$/.test(
      code.trim(),
    )
  ) {
    throw new InvalidLoginPayloadError();
  }

  return {
    code:
      code.trim(),
  };
}
