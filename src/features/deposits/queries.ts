import { prisma } from "@/server/db";
import { DepositKind, DepositStatus, AttachmentEntityType } from "@prisma/client";

export interface ListDepositsOptions {
  status?: DepositStatus;
  kind?: DepositKind;
  month?: string; // e.g. "2026-10"
  limit?: number;
}

export async function listDeposits(options: ListDepositsOptions = {}) {
  const where: any = {};

  if (options.status) {
    where.status = options.status;
  }

  if (options.kind) {
    where.kind = options.kind;
  }

  if (options.month) {
    const [yearStr, monthStr] = options.month.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!isNaN(year) && !isNaN(month)) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      where.depositDate = {
        gte: start,
        lte: end,
      };
    }
  }

  const deposits = await prisma.deposit.findMany({
    where,
    include: {
      carriedBy: {
        select: { id: true, name: true, email: true },
      },
      confirmedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { depositDate: "desc" },
    take: options.limit || 100,
  });

  const depositIds = deposits.map((d) => d.id);
  const attachments = await prisma.attachment.findMany({
    where: {
      entityType: AttachmentEntityType.DEPOSIT,
      entityId: { in: depositIds },
    },
  });

  const attachmentsByDepositId = new Map<string, typeof attachments>();
  for (const att of attachments) {
    const list = attachmentsByDepositId.get(att.entityId) || [];
    list.push(att);
    attachmentsByDepositId.set(att.entityId, list);
  }

  return deposits.map((d) => ({
    ...d,
    attachments: attachmentsByDepositId.get(d.id) || [],
  }));
}

export async function getDepositById(id: string) {
  const deposit = await prisma.deposit.findUnique({
    where: { id },
    include: {
      carriedBy: {
        select: { id: true, name: true, email: true },
      },
      confirmedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!deposit) return null;

  const attachments = await prisma.attachment.findMany({
    where: {
      entityType: AttachmentEntityType.DEPOSIT,
      entityId: deposit.id,
    },
  });

  return {
    ...deposit,
    attachments,
  };
}
