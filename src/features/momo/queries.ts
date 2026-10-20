import { prisma } from "@/server/db";
import { MomoTransactionStatus, StatementFileType } from "@prisma/client";

export interface ListMomoTransactionsOptions {
  status?: MomoTransactionStatus;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export async function listMomoTransactions(options: ListMomoTransactionsOptions = {}) {
  const { status, categoryId, startDate, endDate, page = 1, pageSize = 50 } = options;

  const where: {
    status?: MomoTransactionStatus;
    categoryId?: string;
    occurredAt?: { gte?: Date; lte?: Date };
  } = {};

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (startDate || endDate) {
    where.occurredAt = {};
    if (startDate) where.occurredAt.gte = startDate;
    if (endDate) where.occurredAt.lte = endDate;
  }

  const [items, total] = await Promise.all([
    prisma.momoTransaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        member: true,
        matchedRule: true,
      },
    }),
    prisma.momoTransaction.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getNeedsReviewQueue() {
  return prisma.momoTransaction.findMany({
    where: {
      status: MomoTransactionStatus.NEEDS_REVIEW,
    },
    orderBy: { occurredAt: "asc" },
    include: {
      category: true,
      member: true,
      matchedRule: true,
    },
  });
}

export async function listParserProfiles() {
  return prisma.parserProfile.findMany({
    orderBy: { name: "asc" },
  });
}

export async function listClassificationRules() {
  return prisma.classificationRule.findMany({
    orderBy: { priority: "asc" },
    include: {
      category: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function listMomoImports(limit: number = 20) {
  return prisma.momoImport.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      parserProfile: true,
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
      rolledBackBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function listGivingCategories() {
  return prisma.givingCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}
