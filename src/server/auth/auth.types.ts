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
