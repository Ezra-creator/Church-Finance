import { Prisma, AuditLog } from "@prisma/client";
import { prisma, DatabaseTransaction } from "@/server/db";

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  reason?: string | null;
}

/**
 * Records an audit entry inside an existing database transaction.
 * Append-only: updates and deletes are never supported.
 */
export async function recordAudit(
  tx: DatabaseTransaction,
  entry: AuditEntry
): Promise<AuditLog> {
  return tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? Prisma.DbNull,
      after: entry.after ?? Prisma.DbNull,
      reason: entry.reason ?? null,
    },
  });
}

/**
 * Executes a function inside an interactive Prisma transaction, writes audit log entries,
 * and rolls back both operations if either the work or audit write fails.
 */
export async function withAudit<T>(
  fn: (tx: DatabaseTransaction) => Promise<{
    result: T;
    audit: AuditEntry | AuditEntry[];
  }>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const { result, audit } = await fn(tx);
    const entries = Array.isArray(audit) ? audit : [audit];
    for (const entry of entries) {
      await recordAudit(tx, entry);
    }
    return result;
  });
}
