import { prisma } from "@/server/db";
import { AuditFilterInput } from "./schemas";
import { Prisma } from "@prisma/client";

export async function getAuditLogs(filters: AuditFilterInput) {
  const { page, pageSize, actorId, entityType, startDate, endDate } = filters;
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {};

  if (actorId) {
    where.actorId = actorId;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      // Include the entire end day if only date is passed
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getDistinctAuditEntityTypes(): Promise<string[]> {
  const results = await prisma.auditLog.findMany({
    select: { entityType: true },
    distinct: ["entityType"],
    orderBy: { entityType: "asc" },
  });
  return results.map((r) => r.entityType);
}
