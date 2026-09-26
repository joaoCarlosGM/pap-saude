export type AuditContext = {
  actorUserId?: string;
  organizationId?: string;
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export type AuditMutation = {
  action: string;
  resourceType: string;
  resourceId?: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};
