import { prisma } from "@/server/db";
import { ExpenseStatus, AttachmentEntityType } from "@prisma/client";

export interface ListExpensesOptions {
  status?: ExpenseStatus;
  month?: string; // e.g. "2026-10"
  categoryId?: string;
  limit?: number;
}

export async function listExpenseCategories() {
  return prisma.expenseCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function listExpenses(options: ListExpensesOptions = {}) {
  const where: any = {};

  if (options.status) {
    where.status = options.status;
  }

  if (options.categoryId) {
    where.categoryId = options.categoryId;
  }

  if (options.month) {
    const [yearStr, monthStr] = options.month.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!isNaN(year) && !isNaN(month)) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      where.expenseDate = {
        gte: start,
        lte: end,
      };
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
      voidedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { expenseDate: "desc" },
    take: options.limit || 100,
  });

  // Attach receipt attachments
  const expenseIds = expenses.map((e) => e.id);
  const attachments = await prisma.attachment.findMany({
    where: {
      entityType: AttachmentEntityType.EXPENSE,
      entityId: { in: expenseIds },
    },
  });

  const attachmentsByExpenseId = new Map<string, typeof attachments>();
  for (const att of attachments) {
    const list = attachmentsByExpenseId.get(att.entityId) || [];
    list.push(att);
    attachmentsByExpenseId.set(att.entityId, list);
  }

  return expenses.map((e) => ({
    ...e,
    attachments: attachmentsByExpenseId.get(e.id) || [],
  }));
}

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      category: true,
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
      voidedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!expense) return null;

  const attachments = await prisma.attachment.findMany({
    where: {
      entityType: AttachmentEntityType.EXPENSE,
      entityId: expense.id,
    },
  });

  return {
    ...expense,
    attachments,
  };
}
