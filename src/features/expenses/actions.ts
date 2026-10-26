"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { Result, successResult, handleActionError } from "@/lib/errors";
import {
  createExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseDraftSchema,
  submitExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  markExpensePaidSchema,
  voidExpenseSchema,
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseDraftInput,
  SubmitExpenseInput,
  ApproveExpenseInput,
  RejectExpenseInput,
  MarkExpensePaidInput,
  VoidExpenseInput,
} from "./schemas";
import {
  createExpenseCategory,
  createExpense,
  updateExpenseDraft,
  submitExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  voidExpense,
} from "./service";

export async function createExpenseCategoryAction(
  rawInput: CreateExpenseCategoryInput
): Promise<Result<{ id: string; name: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = createExpenseCategorySchema.parse(rawInput);
    const category = await createExpenseCategory(input, user.id);
    revalidatePath("/money");
    return successResult({ id: category.id, name: category.name });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createExpenseAction(
  rawInput: CreateExpenseInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = createExpenseSchema.parse(rawInput);
    const expense = await createExpense(input, user.id);
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateExpenseDraftAction(
  rawInput: UpdateExpenseDraftInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = updateExpenseDraftSchema.parse(rawInput);
    const expense = await updateExpenseDraft(input, user.id);
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function submitExpenseAction(
  rawInput: SubmitExpenseInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = submitExpenseSchema.parse(rawInput);
    const expense = await submitExpense(input.id, user.id);
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function approveExpenseAction(
  rawInput: ApproveExpenseInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.TREASURER);
    const input = approveExpenseSchema.parse(rawInput);
    const expense = await approveExpense(input.id, user.id, user.role);
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function rejectExpenseAction(
  rawInput: RejectExpenseInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.TREASURER);
    const input = rejectExpenseSchema.parse(rawInput);
    const expense = await rejectExpense(
      input.id,
      input.rejectionReason,
      user.id,
      user.role
    );
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function markExpensePaidAction(
  rawInput: MarkExpensePaidInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = markExpensePaidSchema.parse(rawInput);
    const paidAt = input.paidAt ? new Date(input.paidAt) : null;
    const expense = await markExpensePaid(
      input.id,
      input.paymentMethod,
      paidAt,
      user.id
    );
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function voidExpenseAction(
  rawInput: VoidExpenseInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.TREASURER);
    const input = voidExpenseSchema.parse(rawInput);
    const expense = await voidExpense(
      input.id,
      input.voidReason,
      user.id,
      user.role
    );
    revalidatePath("/money");
    return successResult({ id: expense.id });
  } catch (error) {
    return handleActionError(error);
  }
}
