import { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseStatus, Prisma } from "@prisma/client";

export function buildExpenseCategoryFixture(
  overrides: Partial<ExpenseCategory> = {}
): ExpenseCategory {
  const id = overrides.id || `exp_cat_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  return {
    id,
    name: overrides.name || "Stationery & Office",
    active: overrides.active ?? true,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

export function buildExpenseFixture(
  overrides: Partial<Expense> = {}
): Expense {
  const id = overrides.id || `exp_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  return {
    id,
    expenseDate: overrides.expenseDate || new Date("2026-10-20T00:00:00.000Z"),
    categoryId: overrides.categoryId || "exp_cat_1",
    payee: overrides.payee || "Local Vendor",
    description: overrides.description || "Weekly church supplies",
    amount: overrides.amount || new Prisma.Decimal("150.00"),
    paymentMethod: overrides.paymentMethod || ExpensePaymentMethod.CASH,
    status: overrides.status || ExpenseStatus.DRAFT,
    requestedById: overrides.requestedById || "user_secretary",
    approvedById: overrides.approvedById || null,
    approvedAt: overrides.approvedAt || null,
    rejectionReason: overrides.rejectionReason || null,
    paidAt: overrides.paidAt || null,
    voidedById: overrides.voidedById || null,
    voidedAt: overrides.voidedAt || null,
    voidReason: overrides.voidReason || null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}
