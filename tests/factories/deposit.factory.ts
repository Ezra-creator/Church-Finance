import { Deposit, DepositKind, DepositStatus, Prisma } from "@prisma/client";

export function buildDepositFixture(
  overrides: Partial<Deposit> = {}
): Deposit {
  const id = overrides.id || `dep_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  return {
    id,
    depositDate: overrides.depositDate || new Date("2026-10-21T00:00:00.000Z"),
    kind: overrides.kind || DepositKind.CASH_DEPOSIT,
    amount: overrides.amount || new Prisma.Decimal("500.00"),
    bankReference: overrides.bankReference || "SLIP-2026-1001",
    carriedById: overrides.carriedById || "user_secretary",
    confirmedById: overrides.confirmedById || null,
    confirmedAt: overrides.confirmedAt || null,
    status: overrides.status || DepositStatus.PENDING_CONFIRMATION,
    notes: overrides.notes || null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}
