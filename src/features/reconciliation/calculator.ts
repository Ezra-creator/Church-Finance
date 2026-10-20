import { Prisma, ServiceStatus, MomoTransactionStatus } from "@prisma/client";
import { formatCedi, sumCedi, parseCedi } from "@/lib/money";

export interface CategoryReconciliationItem {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  cashAmount: Prisma.Decimal;
  momoAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
}

export interface ReconciliationTotals {
  cashTotal: Prisma.Decimal;
  momoTotal: Prisma.Decimal;
  expectedTotal: Prisma.Decimal;
  bookTotal: Prisma.Decimal | null;
  variance: Prisma.Decimal | null;
  varianceStatus: "BALANCED" | "SHORT" | "OVER" | "NO_BOOK_TOTAL";
  varianceLabel: string;
}

export interface ReconciliationBlocker {
  type: "MOMO_NEEDS_REVIEW" | "SERVICE_NOT_COUNTED" | "UNEXPLAINED_VARIANCE";
  message: string;
  link?: string;
  count?: number;
}

export interface PureReconciliationResult {
  categories: CategoryReconciliationItem[];
  totals: ReconciliationTotals;
  blockers: ReconciliationBlocker[];
  canSubmit: boolean;
}

export interface RawServiceRecordForCalc {
  id: string;
  serviceDate: Date;
  status: ServiceStatus;
  title: string | null;
  countSheets: Array<{
    categoryId: string;
    total: Prisma.Decimal | string | number;
  }>;
}

export interface RawMomoTransactionForCalc {
  id: string;
  occurredAt: Date;
  amount: Prisma.Decimal | string | number;
  direction: "IN" | "OUT";
  status: MomoTransactionStatus;
  categoryId: string | null;
  rawDescription: string;
}

export interface RawCategoryForCalc {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
}

/**
 * Pure calculation function for weekly reconciliation.
 * Aggregates cash count sheets and classified MoMo transactions by category,
 * computes expected total, book variance, and evaluates any submission blockers.
 */
export function calculateReconciliation(params: {
  categories: RawCategoryForCalc[];
  serviceRecords: RawServiceRecordForCalc[];
  momoTransactions: RawMomoTransactionForCalc[];
  bookTotal: Prisma.Decimal | null;
  varianceReason: string | null;
  parallelRunActive: boolean;
}): PureReconciliationResult {
  const {
    categories,
    serviceRecords,
    momoTransactions,
    bookTotal,
    varianceReason,
    parallelRunActive,
  } = params;

  // Initialize per-category map
  const categoryMap = new Map<
    string,
    {
      category: RawCategoryForCalc;
      cashAmount: Prisma.Decimal;
      momoAmount: Prisma.Decimal;
    }
  >();

  for (const cat of categories) {
    categoryMap.set(cat.id, {
      category: cat,
      cashAmount: new Prisma.Decimal(0),
      momoAmount: new Prisma.Decimal(0),
    });
  }

  // Aggregate cash amounts from service count sheets
  for (const sr of serviceRecords) {
    for (const sheet of sr.countSheets) {
      let entry = categoryMap.get(sheet.categoryId);
      if (!entry) {
        // In case sheet belongs to an unlisted active category
        entry = {
          category: {
            id: sheet.categoryId,
            name: "Other Giving",
            code: "OTHER",
            sortOrder: 999,
          },
          cashAmount: new Prisma.Decimal(0),
          momoAmount: new Prisma.Decimal(0),
        };
        categoryMap.set(sheet.categoryId, entry);
      }
      const sheetTotal =
        sheet.total instanceof Prisma.Decimal
          ? sheet.total
          : new Prisma.Decimal(sheet.total.toString());
      entry.cashAmount = entry.cashAmount.plus(sheetTotal);
    }
  }

  // Aggregate MoMo amounts (only non-ignored incoming transactions that are AUTO or CONFIRMED)
  for (const tx of momoTransactions) {
    if (
      tx.direction === "IN" &&
      tx.status !== MomoTransactionStatus.IGNORED &&
      tx.categoryId
    ) {
      let entry = categoryMap.get(tx.categoryId);
      if (!entry) {
        entry = {
          category: {
            id: tx.categoryId,
            name: "Other Giving",
            code: "OTHER",
            sortOrder: 999,
          },
          cashAmount: new Prisma.Decimal(0),
          momoAmount: new Prisma.Decimal(0),
        };
        categoryMap.set(tx.categoryId, entry);
      }
      const txAmount =
        tx.amount instanceof Prisma.Decimal
          ? tx.amount
          : new Prisma.Decimal(tx.amount.toString());
      entry.momoAmount = entry.momoAmount.plus(txAmount);
    }
  }

  // Produce sorted category breakdown list
  const categoryList: CategoryReconciliationItem[] = Array.from(
    categoryMap.values()
  )
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder)
    .map((item) => {
      const total = item.cashAmount.plus(item.momoAmount);
      return {
        categoryId: item.category.id,
        categoryName: item.category.name,
        categoryCode: item.category.code,
        cashAmount: item.cashAmount,
        momoAmount: item.momoAmount,
        totalAmount: total,
      };
    });

  // Calculate totals
  const cashTotal = categoryList.reduce(
    (acc, c) => acc.plus(c.cashAmount),
    new Prisma.Decimal(0)
  );
  const momoTotal = categoryList.reduce(
    (acc, c) => acc.plus(c.momoAmount),
    new Prisma.Decimal(0)
  );
  const expectedTotal = cashTotal.plus(momoTotal);

  // Determine variance and status
  let variance: Prisma.Decimal | null = null;
  let varianceStatus: ReconciliationTotals["varianceStatus"] = "NO_BOOK_TOTAL";
  let varianceLabel = "No book record";

  if (bookTotal !== null) {
    // Variance = Book Total - Expected Total
    // If book is 1050 and expected is 1000: variance is +50 ("Over by GH₵ 50.00")
    // If book is 950 and expected is 1000: variance is -50 ("Short by GH₵ 50.00")
    variance = bookTotal.minus(expectedTotal);

    if (variance.isZero()) {
      varianceStatus = "BALANCED";
      varianceLabel = "Balanced";
    } else if (variance.isNegative()) {
      varianceStatus = "SHORT";
      varianceLabel = `Short by ${formatCedi(variance.abs())}`;
    } else {
      varianceStatus = "OVER";
      varianceLabel = `Over by ${formatCedi(variance)}`;
    }
  }

  const totals: ReconciliationTotals = {
    cashTotal,
    momoTotal,
    expectedTotal,
    bookTotal,
    variance,
    varianceStatus,
    varianceLabel,
  };

  // Evaluate blockers
  const blockers: ReconciliationBlocker[] = [];

  // Blocker 1: Any MoMo transaction in NEEDS_REVIEW
  const needsReviewMomo = momoTransactions.filter(
    (tx) => tx.direction === "IN" && tx.status === MomoTransactionStatus.NEEDS_REVIEW
  );
  if (needsReviewMomo.length > 0) {
    blockers.push({
      type: "MOMO_NEEDS_REVIEW",
      message: `${needsReviewMomo.length} Mobile Money payment${
        needsReviewMomo.length === 1 ? "" : "s"
      } need classification before reconciliation.`,
      link: "/money/momo/review",
      count: needsReviewMomo.length,
    });
  }

  // Blocker 2: Any ServiceRecord in the range not COUNTED or LOCKED (e.g. OPEN)
  const uncountedServices = serviceRecords.filter(
    (sr) => sr.status === ServiceStatus.OPEN
  );
  for (const sr of uncountedServices) {
    const titlePart = sr.title ? ` (${sr.title})` : "";
    blockers.push({
      type: "SERVICE_NOT_COUNTED",
      message: `Service record on ${sr.serviceDate.toISOString().slice(0, 10)}${titlePart} is uncounted.`,
      link: `/services/${sr.id}`,
    });
  }

  // Blocker 3: Non-zero variance with no reason (only when parallel run is active and bookTotal is entered)
  if (
    parallelRunActive &&
    bookTotal !== null &&
    variance !== null &&
    !variance.isZero() &&
    (!varianceReason || varianceReason.trim().length === 0)
  ) {
    blockers.push({
      type: "UNEXPLAINED_VARIANCE",
      message: "A non-zero variance between system total and paper book requires an explanation note.",
    });
  }

  return {
    categories: categoryList,
    totals,
    blockers,
    canSubmit: blockers.length === 0,
  };
}
