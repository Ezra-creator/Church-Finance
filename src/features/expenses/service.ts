import {
  ExpenseStatus,
  ExpensePaymentMethod,
  Role,
  Expense,
  ExpenseCategory,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { toDecimal } from "@/lib/money";
import { linkAttachmentToEntity } from "@/features/attachments/service";
import {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseDraftInput,
} from "./schemas";

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
  actorId: string
): Promise<ExpenseCategory> {
  const existing = await prisma.expenseCategory.findUnique({
    where: { name: input.name.trim() },
  });

  if (existing) {
    if (existing.active) {
      throw new AppError("CONFLICT", `Expense category "${input.name}" already exists.`);
    }
    // Reactivate existing category
    return withAudit(async (tx) => {
      const updated = await tx.expenseCategory.update({
        where: { id: existing.id },
        data: { active: true },
      });
      return {
        result: updated,
        audit: {
          actorId,
          action: "EXPENSE_CATEGORY_REACTIVATED",
          entityType: "ExpenseCategory",
          entityId: existing.id,
          before: { active: false },
          after: { active: true },
        },
      };
    });
  }

  return withAudit(async (tx) => {
    const created = await tx.expenseCategory.create({
      data: {
        name: input.name.trim(),
        active: true,
      },
    });
    return {
      result: created,
      audit: {
        actorId,
        action: "EXPENSE_CATEGORY_CREATED",
        entityType: "ExpenseCategory",
        entityId: created.id,
        after: { name: created.name },
      },
    };
  });
}

export async function createExpense(
  input: CreateExpenseInput,
  actorId: string
): Promise<Expense> {
  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category || !category.active) {
    throw new AppError("NOT_FOUND", "Selected expense category is invalid or inactive.");
  }

  const initialStatus = input.submitImmediately
    ? ExpenseStatus.SUBMITTED
    : ExpenseStatus.DRAFT;

  const result = await withAudit(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        expenseDate: new Date(input.expenseDate),
        categoryId: input.categoryId,
        payee: input.payee.trim(),
        description: input.description.trim(),
        amount: toDecimal(input.amount),
        paymentMethod: input.paymentMethod,
        status: initialStatus,
        requestedById: actorId,
      },
    });

    return {
      result: expense,
      audit: {
        actorId,
        action: input.submitImmediately ? "EXPENSE_SUBMITTED" : "EXPENSE_DRAFT_CREATED",
        entityType: "Expense",
        entityId: expense.id,
        after: {
          amount: expense.amount.toString(),
          payee: expense.payee,
          status: expense.status,
        },
      },
    };
  });

  if (input.attachmentId) {
    await linkAttachmentToEntity(input.attachmentId, result.id);
  }

  return result;
}

export async function updateExpenseDraft(
  input: UpdateExpenseDraftInput,
  actorId: string
): Promise<Expense> {
  const existing = await prisma.expense.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Expense record not found.");
  }

  if (existing.status === ExpenseStatus.APPROVED || existing.status === ExpenseStatus.PAID) {
    throw new AppError(
      "LOCKED_RECORD",
      "Approved and paid expenses cannot be edited. They can only be voided by a treasurer."
    );
  }

  if (existing.status === ExpenseStatus.VOIDED) {
    throw new AppError("LOCKED_RECORD", "Voided expenses cannot be edited.");
  }

  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category || !category.active) {
    throw new AppError("NOT_FOUND", "Selected expense category is invalid or inactive.");
  }

  const result = await withAudit(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: existing.id },
      data: {
        expenseDate: new Date(input.expenseDate),
        categoryId: input.categoryId,
        payee: input.payee.trim(),
        description: input.description.trim(),
        amount: toDecimal(input.amount),
        paymentMethod: input.paymentMethod,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "EXPENSE_DRAFT_UPDATED",
        entityType: "Expense",
        entityId: existing.id,
        before: {
          amount: existing.amount.toString(),
          payee: existing.payee,
        },
        after: {
          amount: updated.amount.toString(),
          payee: updated.payee,
        },
      },
    };
  });

  if (input.attachmentId) {
    await linkAttachmentToEntity(input.attachmentId, result.id);
  }

  return result;
}

export async function submitExpense(
  id: string,
  actorId: string
): Promise<Expense> {
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new AppError("NOT_FOUND", "Expense not found.");
  }

  if (expense.status !== ExpenseStatus.DRAFT && expense.status !== ExpenseStatus.REJECTED) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Only draft or rejected expenses can be submitted (current status: ${expense.status}).`
    );
  }

  return withAudit(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: ExpenseStatus.SUBMITTED,
        rejectionReason: null,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "EXPENSE_SUBMITTED",
        entityType: "Expense",
        entityId: expense.id,
        before: { status: expense.status },
        after: { status: updated.status },
      },
    };
  });
}

export async function approveExpense(
  id: string,
  actorId: string,
  actorRole: Role
): Promise<Expense> {
  if (actorRole !== Role.TREASURER) {
    throw new AppError("FORBIDDEN", "Only the Treasurer can approve expenses.");
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new AppError("NOT_FOUND", "Expense not found.");
  }

  // Separation of duties rule: Requester cannot approve their own expense
  if (expense.requestedById === actorId) {
    throw new AppError(
      "FORBIDDEN",
      "Separation of duties: You cannot approve an expense that you requested."
    );
  }

  if (expense.status !== ExpenseStatus.SUBMITTED) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Only submitted expenses can be approved (current status: ${expense.status}).`
    );
  }

  return withAudit(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedById: actorId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "EXPENSE_APPROVED",
        entityType: "Expense",
        entityId: expense.id,
        before: { status: expense.status },
        after: { status: updated.status, approvedById: actorId },
      },
    };
  });
}

export async function rejectExpense(
  id: string,
  rejectionReason: string,
  actorId: string,
  actorRole: Role
): Promise<Expense> {
  if (actorRole !== Role.TREASURER) {
    throw new AppError("FORBIDDEN", "Only the Treasurer can reject expenses.");
  }

  const cleanReason = rejectionReason.trim();
  if (!cleanReason) {
    throw new AppError("VALIDATION_ERROR", "A reason is required to reject an expense.");
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new AppError("NOT_FOUND", "Expense not found.");
  }

  if (expense.status !== ExpenseStatus.SUBMITTED) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Only submitted expenses can be rejected (current status: ${expense.status}).`
    );
  }

  return withAudit(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: ExpenseStatus.REJECTED,
        rejectionReason: cleanReason,
        approvedById: null,
        approvedAt: null,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "EXPENSE_REJECTED",
        entityType: "Expense",
        entityId: expense.id,
        before: { status: expense.status },
        after: { status: updated.status },
        reason: cleanReason,
      },
    };
  });
}

export async function markExpensePaid(
  id: string,
  paymentMethod: ExpensePaymentMethod,
  paidAtDate: Date | null,
  actorId: string
): Promise<Expense> {
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new AppError("NOT_FOUND", "Expense not found.");
  }

  if (expense.status !== ExpenseStatus.APPROVED) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Only approved expenses can be marked as paid (current status: ${expense.status}).`
    );
  }

  const finalPaidAt = paidAtDate || new Date();

  return withAudit(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: ExpenseStatus.PAID,
        paymentMethod,
        paidAt: finalPaidAt,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "EXPENSE_PAID",
        entityType: "Expense",
        entityId: expense.id,
        before: { status: expense.status },
        after: { status: updated.status, paymentMethod },
      },
    };
  });
}

export async function voidExpense(
  id: string,
  voidReason: string,
  actorId: string,
  actorRole: Role
): Promise<Expense> {
  if (actorRole !== Role.TREASURER) {
    throw new AppError("FORBIDDEN", "Only the Treasurer can void expenses.");
  }

  const cleanReason = voidReason.trim();
  if (!cleanReason || cleanReason.length < 5) {
    throw new AppError("VALIDATION_ERROR", "A valid reason (minimum 5 characters) is required to void an expense.");
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new AppError("NOT_FOUND", "Expense not found.");
  }

  if (expense.status !== ExpenseStatus.APPROVED && expense.status !== ExpenseStatus.PAID) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Only approved or paid expenses can be voided (current status: ${expense.status}).`
    );
  }

  return withAudit(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: ExpenseStatus.VOIDED,
        voidReason: cleanReason,
        voidedById: actorId,
        voidedAt: new Date(),
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "EXPENSE_VOIDED",
        entityType: "Expense",
        entityId: expense.id,
        before: { status: expense.status },
        after: { status: updated.status },
        reason: cleanReason,
      },
    };
  });
}
