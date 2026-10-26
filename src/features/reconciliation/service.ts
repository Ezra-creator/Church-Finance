import {
  Prisma,
  Role,
  ReconciliationStatus,
  ServiceStatus,
  MomoTransactionStatus,
  ReconciliationPeriod,
  ExpenseStatus,
  DepositStatus,
  DistrictRemittanceStatus,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { parseCedi, formatCedi } from "@/lib/money";
import { nowUtc } from "@/lib/dates";
import { getHeldMoneyLedger } from "@/features/banking/service";
import { computeRemittance } from "@/features/allocation/calculator";
import { computeWeekRange, WeekRange } from "./week-range";
import {
  calculateReconciliation,
  PureReconciliationResult,
} from "./calculator";
import {
  ReconciliationSnapshot,
  ReconciliationSnapshotCategory,
  ReconciliationSnapshotTotals,
} from "./report-data";
import {
  SetBookTotalInput,
  SetVarianceReasonInput,
  UnlockPeriodInput,
} from "./schemas";

export interface PeriodComputationResponse {
  period: ReconciliationPeriod;
  weekRange: WeekRange;
  computation: PureReconciliationResult;
  parallelRunActive: boolean;
  churchSettings: {
    churchName: string;
    presbyteryName: string;
    weekEndsOn: number;
    parallelRunActive: boolean;
  };
}

/**
 * Retrieves church settings singleton, creating it with sensible defaults if missing.
 */
export async function getChurchSettings() {
  let settings = await prisma.churchSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = await prisma.churchSettings.create({
      data: {
        id: "singleton",
        churchName: "Presbyterian Church of Ghana — PUCA Congregation",
        presbyteryName: "Ga West Presbytery",
        weekEndsOn: 0,
        parallelRunActive: true,
      },
    });
  }

  return settings;
}

/**
 * Computes full reconciliation for a given week-ending date string (YYYY-MM-DD).
 * Fetches counted cash, classified MoMo transactions, and calculates balances and blockers.
 */
export async function computePeriod(weekEndingStr: string): Promise<PeriodComputationResponse> {
  const weekRange = computeWeekRange(weekEndingStr);
  const settings = await getChurchSettings();

  // Find or create the ReconciliationPeriod row
  let period = await prisma.reconciliationPeriod.findUnique({
    where: { weekEnding: weekRange.weekEndingDate },
  });

  if (!period) {
    period = await prisma.reconciliationPeriod.create({
      data: {
        weekEnding: weekRange.weekEndingDate,
        status: ReconciliationStatus.DRAFT,
      },
    });
  }

  // Fetch active categories
  const categories = await prisma.givingCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  // Fetch ServiceRecords within the week range
  // serviceDate is a Date (@db.Date), so we query between startDate and weekEndingDate
  const serviceRecords = await prisma.serviceRecord.findMany({
    where: {
      serviceDate: {
        gte: weekRange.startDate,
        lte: weekRange.weekEndingDate,
      },
    },
    include: {
      countSheets: true,
    },
    orderBy: { serviceDate: "asc" },
  });

  // Fetch non-ignored MoMo transactions in range
  const momoTransactions = await prisma.momoTransaction.findMany({
    where: {
      occurredAt: {
        gte: weekRange.startDateUtc,
        lte: weekRange.endDateUtc,
      },
      status: {
        not: MomoTransactionStatus.IGNORED,
      },
    },
    orderBy: { occurredAt: "asc" },
  });

  // Run pure computation
  const computation = calculateReconciliation({
    categories,
    serviceRecords,
    momoTransactions,
    bookTotal: period.bookTotal,
    varianceReason: period.varianceReason,
    parallelRunActive: settings.parallelRunActive,
  });

  // If period is in DRAFT and canSubmit is true, update status to READY
  if (period.status === ReconciliationStatus.DRAFT && computation.canSubmit) {
    period = await prisma.reconciliationPeriod.update({
      where: { id: period.id },
      data: { status: ReconciliationStatus.READY },
    });
  } else if (
    period.status === ReconciliationStatus.READY &&
    !computation.canSubmit
  ) {
    period = await prisma.reconciliationPeriod.update({
      where: { id: period.id },
      data: { status: ReconciliationStatus.DRAFT },
    });
  }

  return {
    period,
    weekRange,
    computation,
    parallelRunActive: settings.parallelRunActive,
    churchSettings: {
      churchName: settings.churchName,
      presbyteryName: settings.presbyteryName,
      weekEndsOn: settings.weekEndsOn,
      parallelRunActive: settings.parallelRunActive,
    },
  };
}

/**
 * Sets or updates the paper book total for a reconciliation period.
 */
export async function setBookTotal(
  input: SetBookTotalInput,
  actorId: string
): Promise<ReconciliationPeriod> {
  const period = await prisma.reconciliationPeriod.findUnique({
    where: { id: input.periodId },
  });

  if (!period) {
    throw new AppError("NOT_FOUND", "Reconciliation period not found.");
  }

  if (period.status === ReconciliationStatus.SUBMITTED) {
    throw new AppError(
      "LOCKED_RECORD",
      "This reconciliation period has already been submitted to the presbytery and cannot be edited without an unlock."
    );
  }

  const decimalVal = input.amount && input.amount.trim() !== ""
    ? parseCedi(input.amount.trim())
    : null;

  return withAudit(async (tx) => {
    const updated = await tx.reconciliationPeriod.update({
      where: { id: period.id },
      data: {
        bookTotal: decimalVal,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "RECONCILIATION_BOOK_TOTAL_SET",
        entityType: "ReconciliationPeriod",
        entityId: period.id,
        before: {
          bookTotal: period.bookTotal?.toString() || null,
        },
        after: {
          bookTotal: decimalVal?.toString() || null,
        },
      },
    };
  });
}

/**
 * Sets or updates the variance reason for a reconciliation period.
 */
export async function setVarianceReason(
  input: SetVarianceReasonInput,
  actorId: string
): Promise<ReconciliationPeriod> {
  const period = await prisma.reconciliationPeriod.findUnique({
    where: { id: input.periodId },
  });

  if (!period) {
    throw new AppError("NOT_FOUND", "Reconciliation period not found.");
  }

  if (period.status === ReconciliationStatus.SUBMITTED) {
    throw new AppError(
      "LOCKED_RECORD",
      "This reconciliation period has already been submitted to the presbytery and cannot be edited without an unlock."
    );
  }

  const cleanReason = input.reason?.trim() || null;

  return withAudit(async (tx) => {
    const updated = await tx.reconciliationPeriod.update({
      where: { id: period.id },
      data: {
        varianceReason: cleanReason,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "RECONCILIATION_VARIANCE_REASON_SET",
        entityType: "ReconciliationPeriod",
        entityId: period.id,
        before: {
          varianceReason: period.varianceReason,
        },
        after: {
          varianceReason: cleanReason,
        },
      },
    };
  });
}

/**
 * Submits a reconciliation period to the presbytery.
 * Allowed only with zero blockers.
 * Writes the immutable snapshot, sets SUBMITTED, increments reportVersion,
 * and locks every included ServiceRecord and MoMo transaction.
 */
export async function submitPeriod(
  periodId: string,
  actorId: string
): Promise<ReconciliationPeriod> {
  const period = await prisma.reconciliationPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw new AppError("NOT_FOUND", "Reconciliation period not found.");
  }

  if (period.status === ReconciliationStatus.SUBMITTED) {
    throw new AppError("CONFLICT", "This period is already submitted.");
  }

  // Compute live to ensure zero blockers exist at the moment of submission
  const weekEndingStr = period.weekEnding.toISOString().slice(0, 10);
  const computed = await computePeriod(weekEndingStr);

  if (computed.computation.blockers.length > 0) {
    const errorDetails = computed.computation.blockers.map((b) => b.message).join(" ");
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot submit period with unresolved blockers: ${errorDetails}`
    );
  }

  // Fetch actor user details for attribution
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
  });

  const nextVersion = period.reportVersion + 1;
  const submissionTime = nowUtc();

  // Build frozen snapshot JSON
  const snapshotCategories: ReconciliationSnapshotCategory[] =
    computed.computation.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryCode: c.categoryCode,
      cashAmount: c.cashAmount.toString(),
      momoAmount: c.momoAmount.toString(),
      totalAmount: c.totalAmount.toString(),
    }));

  const snapshotTotals: ReconciliationSnapshotTotals = {
    cashTotal: computed.computation.totals.cashTotal.toString(),
    momoTotal: computed.computation.totals.momoTotal.toString(),
    expectedTotal: computed.computation.totals.expectedTotal.toString(),
    bookTotal: computed.computation.totals.bookTotal
      ? computed.computation.totals.bookTotal.toString()
      : null,
    variance: computed.computation.totals.variance
      ? computed.computation.totals.variance.toString()
      : null,
    varianceStatus: computed.computation.totals.varianceStatus,
    varianceLabel: computed.computation.totals.varianceLabel,
  };

  // Phase 5: Fetch expenses paid during this week
  const weekPaidExpenses = await prisma.expense.findMany({
    where: {
      status: ExpenseStatus.PAID,
      paidAt: {
        gte: computed.weekRange.startDateUtc,
        lte: computed.weekRange.endDateUtc,
      },
    },
    include: {
      category: true,
    },
  });

  const expenseCatMap = new Map<
    string,
    {
      categoryName: string;
      cashAmount: Prisma.Decimal;
      momoAmount: Prisma.Decimal;
      bankAmount: Prisma.Decimal;
      totalAmount: Prisma.Decimal;
    }
  >();

  let expCashTotal = new Prisma.Decimal(0);
  let expMomoTotal = new Prisma.Decimal(0);
  let expBankTotal = new Prisma.Decimal(0);

  for (const exp of weekPaidExpenses) {
    const amt = exp.amount;
    const catName = exp.category.name;
    const existing = expenseCatMap.get(catName) || {
      categoryName: catName,
      cashAmount: new Prisma.Decimal(0),
      momoAmount: new Prisma.Decimal(0),
      bankAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(0),
    };

    if (exp.paymentMethod === "CASH") {
      existing.cashAmount = existing.cashAmount.add(amt);
      expCashTotal = expCashTotal.add(amt);
    } else if (exp.paymentMethod === "MOMO") {
      existing.momoAmount = existing.momoAmount.add(amt);
      expMomoTotal = expMomoTotal.add(amt);
    } else {
      existing.bankAmount = existing.bankAmount.add(amt);
      expBankTotal = expBankTotal.add(amt);
    }
    existing.totalAmount = existing.totalAmount.add(amt);
    expenseCatMap.set(catName, existing);
  }

  const snapshotExpenseCategories = Array.from(expenseCatMap.values()).map((ec) => ({
    categoryName: ec.categoryName,
    cashAmount: ec.cashAmount.toString(),
    momoAmount: ec.momoAmount.toString(),
    bankAmount: ec.bankAmount.toString(),
    totalAmount: ec.totalAmount.toString(),
  }));

  const expGrandTotal = expCashTotal.add(expMomoTotal).add(expBankTotal);

  // Phase 5: Fetch deposits made during this week
  const weekDeposits = await prisma.deposit.findMany({
    where: {
      depositDate: {
        gte: computed.weekRange.startDate,
        lte: computed.weekRange.weekEndingDate,
      },
    },
    orderBy: { depositDate: "asc" },
  });

  let totalDeposited = new Prisma.Decimal(0);
  const snapshotDeposits = weekDeposits.map((d) => {
    totalDeposited = totalDeposited.add(d.amount);
    return {
      date: d.depositDate.toISOString().slice(0, 10),
      kind: d.kind,
      amount: d.amount.toString(),
      bankReference: d.bankReference,
    };
  });

  const heldLedger = await getHeldMoneyLedger();

  // Phase 6: Compute District Remittance based on rules effective on week-ending date
  const allocationRules = await prisma.districtAllocationRule.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
  const remittanceComputation = computeRemittance(
    snapshotCategories.map((c) => ({
      categoryId: c.categoryId,
      totalAmount: c.totalAmount,
    })),
    allocationRules,
    weekEndingStr
  );
  const districtAmountDueStr = remittanceComputation.totalDue.toString();

  const snapshot: ReconciliationSnapshot = {
    weekEnding: weekEndingStr,
    weekRange: computed.weekRange.formattedRange,
    churchName: computed.churchSettings.churchName,
    presbyteryName: computed.churchSettings.presbyteryName,
    preparedById: actorId,
    preparedByName: actor?.name || "Finance Secretary",
    submittedAt: submissionTime.toISOString(),
    version: nextVersion,
    parallelRunActive: computed.parallelRunActive,
    categories: snapshotCategories,
    totals: snapshotTotals,
    varianceReason: period.varianceReason,
    expenses: {
      categories: snapshotExpenseCategories,
      totals: {
        cashTotal: expCashTotal.toString(),
        momoTotal: expMomoTotal.toString(),
        bankTotal: expBankTotal.toString(),
        grandTotal: expGrandTotal.toString(),
      },
    },
    banking: {
      deposits: snapshotDeposits,
      totalDeposited: totalDeposited.toString(),
      cashHeldAtEnd: heldLedger.cashHeld.toString(),
      momoHeldAtEnd: heldLedger.momoHeld.toString(),
      totalHeldAtEnd: heldLedger.totalHeld.toString(),
    },
    districtAmountDue: districtAmountDueStr,
  };

  return withAudit(async (tx) => {
    // 1. Lock all included ServiceRecords in range
    await tx.serviceRecord.updateMany({
      where: {
        serviceDate: {
          gte: computed.weekRange.startDate,
          lte: computed.weekRange.weekEndingDate,
        },
      },
      data: {
        status: ServiceStatus.LOCKED,
        periodId: period.id,
      },
    });

    // 2. Lock all included MoMo transactions in range
    await tx.momoTransaction.updateMany({
      where: {
        occurredAt: {
          gte: computed.weekRange.startDateUtc,
          lte: computed.weekRange.endDateUtc,
        },
        status: {
          not: MomoTransactionStatus.IGNORED,
        },
      },
      data: {
        locked: true,
        periodId: period.id,
      },
    });

    // 3. Update ReconciliationPeriod to SUBMITTED with snapshot
    const updatedPeriod = await tx.reconciliationPeriod.update({
      where: { id: period.id },
      data: {
        status: ReconciliationStatus.SUBMITTED,
        submittedAt: submissionTime,
        submittedById: actorId,
        reportVersion: nextVersion,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // 4. Phase 6: Create or update frozen DistrictRemittance
    await tx.districtRemittance.upsert({
      where: { periodId: period.id },
      update: {
        amountDue: remittanceComputation.totalDue,
      },
      create: {
        periodId: period.id,
        amountDue: remittanceComputation.totalDue,
        amountPaid: new Prisma.Decimal(0),
        status: DistrictRemittanceStatus.DUE,
      },
    });

    return {
      result: updatedPeriod,
      audit: {
        actorId,
        action: "RECONCILIATION_PERIOD_SUBMIT",
        entityType: "ReconciliationPeriod",
        entityId: period.id,
        after: {
          weekEnding: weekEndingStr,
          version: nextVersion,
          expectedTotal: snapshotTotals.expectedTotal,
          bookTotal: snapshotTotals.bookTotal,
          districtAmountDue: districtAmountDueStr,
          status: ReconciliationStatus.SUBMITTED,
        },
      },
    };
  });
}

/**
 * Unlocks a submitted reconciliation period for corrections.
 * TREASURER only, reason required.
 * Resets status to DRAFT and unlocks included records.
 */
export async function unlockPeriod(
  input: UnlockPeriodInput,
  actorId: string,
  actorRole: Role
): Promise<ReconciliationPeriod> {
  if (actorRole !== Role.TREASURER) {
    throw new AppError(
      "FORBIDDEN",
      "Only the Parish Treasurer has the authority to unlock a submitted reconciliation period."
    );
  }

  const period = await prisma.reconciliationPeriod.findUnique({
    where: { id: input.periodId },
  });

  if (!period) {
    throw new AppError("NOT_FOUND", "Reconciliation period not found.");
  }

  if (period.status !== ReconciliationStatus.SUBMITTED) {
    throw new AppError(
      "CONFLICT",
      "Only submitted reconciliation periods can be unlocked."
    );
  }

  const weekEndingStr = period.weekEnding.toISOString().slice(0, 10);
  const weekRange = computeWeekRange(weekEndingStr);

  return withAudit(async (tx) => {
    // 1. Record unlock audit row in PeriodUnlock table
    await tx.periodUnlock.create({
      data: {
        periodId: period.id,
        unlockedById: actorId,
        reason: input.reason.trim(),
      },
    });

    // 2. Unlock included ServiceRecords back to COUNTED
    await tx.serviceRecord.updateMany({
      where: {
        serviceDate: {
          gte: weekRange.startDate,
          lte: weekRange.weekEndingDate,
        },
      },
      data: {
        status: ServiceStatus.COUNTED,
      },
    });

    // 3. Unlock included MoMo transactions
    await tx.momoTransaction.updateMany({
      where: {
        occurredAt: {
          gte: weekRange.startDateUtc,
          lte: weekRange.endDateUtc,
        },
      },
      data: {
        locked: false,
      },
    });

    // 4. Reset period to DRAFT
    const updatedPeriod = await tx.reconciliationPeriod.update({
      where: { id: period.id },
      data: {
        status: ReconciliationStatus.DRAFT,
      },
    });

    return {
      result: updatedPeriod,
      audit: {
        actorId,
        action: "RECONCILIATION_PERIOD_UNLOCK",
        entityType: "ReconciliationPeriod",
        entityId: period.id,
        reason: input.reason.trim(),
        after: {
          status: ReconciliationStatus.DRAFT,
          unlockedByRole: Role.TREASURER,
        },
      },
    };
  });
}
