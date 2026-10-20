import { AuditLog } from "@prisma/client";

export function buildAuditLogFixture(overrides: Partial<AuditLog> = {}): AuditLog {
  const id = overrides.id || `audit_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    actorId: overrides.actorId ?? "actor_123",
    action: overrides.action || "USER_CREATE",
    entityType: overrides.entityType || "User",
    entityId: overrides.entityId || "user_123",
    before: overrides.before ?? null,
    after: overrides.after ?? null,
    reason: overrides.reason ?? null,
    createdAt: overrides.createdAt || new Date(),
  };
}
