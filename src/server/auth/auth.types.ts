export interface SessionDescriptor {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordAuthenticationInput
  extends LoginCredentials {
  ipHash?: string | null;
  userAgent?: string | null;
  now?: Date;
}

export interface PasswordAuthenticationResult {
  user: AuthenticatedUser;
  session: SessionDescriptor;
  sessionToken: string;
}


export interface PasswordCredentialVerificationResult {
  user: AuthenticatedUser;
}

export interface MfaChallengeDescriptor {
  challengeToken: string;
  expiresAt: Date;
}

export type LoginAuthenticationResult =
  | {
      status: "AUTHENTICATED";
      user: AuthenticatedUser;
      session: SessionDescriptor;
      sessionToken: string;
    }
  | {
      status: "MFA_REQUIRED";
      user: AuthenticatedUser;
      challengeToken: string;
      challengeExpiresAt: Date;
    };
