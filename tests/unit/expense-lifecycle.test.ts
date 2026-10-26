import { describe, it, expect, vi } from "vitest";
import { ExpenseStatus, ExpensePaymentMethod, Role } from "@prisma/client";
import {
  approveExpense,
  rejectExpense,
  updateExpenseDraft,
  voidExpense,
} from "@/features/expenses/service";
import { prisma } from "@/server/db";
import { buildExpenseFixture } from "../factories/expense.factory";

describe("Expense Lifecycle & Separation of Duties", () => {
  it("enforces separation of duties: requester cannot approve their own expense", async () => {
    const expenseFixture = buildExpenseFixture({
      id: "exp_1",
      requestedById: "user_officer_1",
      status: ExpenseStatus.SUBMITTED,
    });

    vi.spyOn(prisma.expense, "findUnique").mockResolvedValueOnce(expenseFixture);

    // Even if user has TREASURER role, self-approval is forbidden
    await expect(
      approveExpense("exp_1", "user_officer_1", Role.TREASURER)
    ).rejects.toThrow("Separation of duties: You cannot approve an expense that you requested.");
  });

  it("restricts expense approval strictly to Treasurer role", async () => {
    await expect(
      approveExpense("exp_1", "user_different", Role.FINANCE_SECRETARY)
    ).rejects.toThrow("Only the Treasurer can approve expenses.");
  });

  it("restricts expense rejection strictly to Treasurer role", async () => {
    await expect(
      rejectExpense("exp_1", "Not permitted", "user_different", Role.FINANCE_SECRETARY)
    ).rejects.toThrow("Only the Treasurer can reject expenses.");
  });

  it("requires a non-empty reason to reject an expense", async () => {
    await expect(
      rejectExpense("exp_1", "   ", "user_treasurer", Role.TREASURER)
    ).rejects.toThrow("A reason is required to reject an expense.");
  });

  it("enforces immutability: approved or paid expenses cannot be modified directly", async () => {
    const approvedFixture = buildExpenseFixture({
      id: "exp_approved_1",
      status: ExpenseStatus.APPROVED,
    });

    vi.spyOn(prisma.expense, "findUnique").mockResolvedValueOnce(approvedFixture);

    await expect(
      updateExpenseDraft(
        {
          id: "exp_approved_1",
          expenseDate: "2026-10-20",
          categoryId: "cat_1",
          payee: "Changed Payee",
          description: "Changed Desc",
          amount: "250.00",
          paymentMethod: ExpensePaymentMethod.CASH,
        },
        "user_secretary"
      )
    ).rejects.toThrow("Approved and paid expenses cannot be edited.");
  });

  it("restricts voiding to Treasurer with required reason", async () => {
    await expect(
      voidExpense("exp_1", "Duplicate entry made in error", "user_sec", Role.FINANCE_SECRETARY)
    ).rejects.toThrow("Only the Treasurer can void expenses.");

    await expect(
      voidExpense("exp_1", "bad", "user_treasurer", Role.TREASURER)
    ).rejects.toThrow("A valid reason (minimum 5 characters) is required");
  });
});
