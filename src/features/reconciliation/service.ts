import {
  Prisma,
  Role,
  ReconciliationStatus,
  ServiceStatus,
  MomoTransactionStatus,
  ReconciliationPeriod,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { parseCedi, formatCedi } from "@/lib/money";
import { nowUtc } from "@/lib/dates";
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
