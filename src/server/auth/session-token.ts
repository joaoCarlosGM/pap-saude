import {
  generateSecureToken,
  hashSessionToken,
} from "@/server/security/crypto";

export interface SessionTokenPair {
  token: string;
  tokenHash: string;
}

export function createSessionToken(): SessionTokenPair {
  const token = generateSecureToken();

  return {
    token,
    tokenHash: hashSessionToken(token),
  };
}
