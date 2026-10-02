import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { SESSION_TOKEN_BYTES } from "./constants";

export function generateSecureToken(
  bytes = SESSION_TOKEN_BYTES,
): string {
  if (!Number.isSafeInteger(bytes) || bytes < 16) {
    throw new Error("Secure tokens require at least 16 bytes");
  }

  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function hashSessionToken(token: string): string {
  return sha256(token);
}

export function safeEqual(
  left: string,
  right: string,
): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
