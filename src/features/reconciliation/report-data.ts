import { formatCedi } from "@/lib/money";
import { formatAccraDate, formatAccraDateTime } from "@/lib/dates";

export interface ReconciliationSnapshotCategory {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  cashAmount: string;
  momoAmount: string;
  totalAmount: string;
}

export interface ReconciliationSnapshotTotals {
  cashTotal: string;
  momoTotal: string;
  expectedTotal: string;
  bookTotal: string | null;
  variance: string | null;
  varianceStatus: string;
  varianceLabel: string;
}

export interface ReconciliationSnapshotExpenseCategory {
  categoryName: string;
  cashAmount: string;
  momoAmount: string;
  bankAmount: string;
  totalAmount: string;
}

export interface ReconciliationSnapshotExpenseTotals {
  cashTotal: string;
  momoTotal: string;
  bankTotal: string;
  grandTotal: string;
}

export interface ReconciliationSnapshotDepositItem {
  date: string;
  kind: "CASH_DEPOSIT" | "MOMO_TRANSFER";
  amount: string;
  bankReference: string;
}

export interface ReconciliationSnapshotBanking {
  deposits: ReconciliationSnapshotDepositItem[];
  totalDeposited: string;
  cashHeldAtEnd: string;
  momoHeldAtEnd: string;
  totalHeldAtEnd: string;
}

export interface ReconciliationSnapshot {
  weekEnding: string;
  weekRange: string;
  churchName: string;
  presbyteryName: string;
  preparedById: string;
  preparedByName: string;
  submittedAt: string;
  version: number;
  parallelRunActive: boolean;
  categories: ReconciliationSnapshotCategory[];
  totals: ReconciliationSnapshotTotals;
  varianceReason: string | null;

  // Phase 5 additions
  expenses?: {
    categories: ReconciliationSnapshotExpenseCategory[];
    totals: ReconciliationSnapshotExpenseTotals;
  };
  banking?: ReconciliationSnapshotBanking;

  // Phase 6 addition
  districtAmountDue?: string;
}

export interface ReconciliationReportCategoryRow {
  name: string;
  code: string;
  cashFormatted: string;
  momoFormatted: string;
  totalFormatted: string;
}

export interface ReconciliationReportTotals {
  cashFormatted: string;
  momoFormatted: string;
  expectedFormatted: string;
  bookFormatted: string | null;
  varianceFormatted: string | null;
  varianceLabel: string | null;
}

export interface ReconciliationReportExpenseCategoryRow {
  name: string;
  cashFormatted: string;
  momoFormatted: string;
  bankFormatted: string;
  totalFormatted: string;
}

export interface ReconciliationReportExpenseTotals {
  cashFormatted: string;
  momoFormatted: string;
  bankFormatted: string;
  grandTotalFormatted: string;
}

export interface ReconciliationReportDepositRow {
  dateFormatted: string;
  kindLabel: string;
  amountFormatted: string;
  bankReference: string;
}

export interface ReconciliationReportBankingSection {
  deposits: ReconciliationReportDepositRow[];
  totalDepositedFormatted: string;
  cashHeldFormatted: string;
  momoHeldFormatted: string;
  totalHeldFormatted: string;
}

export interface ReconciliationReportData {
  churchName: string;
  presbyteryName: string;
  weekRange: string;
  weekEnding: string;
  version: number;
  preparedByName: string;
  submittedAtFormatted: string;
  filenameBase: string; // e.g. "PUCA-weekly-2026-10-18-v1"
  incomeCategories: ReconciliationReportCategoryRow[];
  totals: ReconciliationReportTotals;
  varianceReason: string | null;

  // Phase 5 optional sections
  expenseCategories: ReconciliationReportExpenseCategoryRow[];
  expenseTotals: ReconciliationReportExpenseTotals | null;
  banking: ReconciliationReportBankingSection | null;

  // Phase 6 optional district amount due
  districtAmountDueFormatted: string | null;

  signatories: Array<{
    title: string;
    name: string;
  }>;
}

/**
 * Builds a typed report model from a frozen ReconciliationSnapshot.
 * Backward compatible with Phase 4 snapshots that lack expense/banking sections.
 */
export function buildReportData(snapshot: ReconciliationSnapshot): ReconciliationReportData {
  const categories: ReconciliationReportCategoryRow[] = snapshot.categories.map((c) => ({
    name: c.categoryName,
    code: c.categoryCode,
    cashFormatted: formatCedi(c.cashAmount),
    momoFormatted: formatCedi(c.momoAmount),
    totalFormatted: formatCedi(c.totalAmount),
  }));

  const totals: ReconciliationReportTotals = {
    cashFormatted: formatCedi(snapshot.totals.cashTotal),
    momoFormatted: formatCedi(snapshot.totals.momoTotal),
    expectedFormatted: formatCedi(snapshot.totals.expectedTotal),
    bookFormatted: snapshot.totals.bookTotal ? formatCedi(snapshot.totals.bookTotal) : null,
    varianceFormatted: snapshot.totals.variance ? formatCedi(snapshot.totals.variance) : null,
    varianceLabel: snapshot.totals.varianceLabel,
  };

  // Phase 5: Map expense categories if present
  let expenseCategories: ReconciliationReportExpenseCategoryRow[] = [];
  let expenseTotals: ReconciliationReportExpenseTotals | null = null;

  if (snapshot.expenses) {
    expenseCategories = snapshot.expenses.categories.map((ec) => ({
      name: ec.categoryName,
      cashFormatted: formatCedi(ec.cashAmount),
      momoFormatted: formatCedi(ec.momoAmount),
      bankFormatted: formatCedi(ec.bankAmount),
      totalFormatted: formatCedi(ec.totalAmount),
    }));

    expenseTotals = {
      cashFormatted: formatCedi(snapshot.expenses.totals.cashTotal),
      momoFormatted: formatCedi(snapshot.expenses.totals.momoTotal),
      bankFormatted: formatCedi(snapshot.expenses.totals.bankTotal),
      grandTotalFormatted: formatCedi(snapshot.expenses.totals.grandTotal),
    };
  }

  // Phase 5: Map banking section if present
  let banking: ReconciliationReportBankingSection | null = null;
  if (snapshot.banking) {
    const depositRows: ReconciliationReportDepositRow[] = snapshot.banking.deposits.map((d) => ({
      dateFormatted: formatAccraDate(new Date(d.date), { day: "numeric", month: "short" }),
      kindLabel: d.kind === "CASH_DEPOSIT" ? "Cash Deposit" : "MoMo Bank Transfer",
      amountFormatted: formatCedi(d.amount),
      bankReference: d.bankReference,
    }));

    banking = {
      deposits: depositRows,
      totalDepositedFormatted: formatCedi(snapshot.banking.totalDeposited),
      cashHeldFormatted: formatCedi(snapshot.banking.cashHeldAtEnd),
      momoHeldFormatted: formatCedi(snapshot.banking.momoHeldAtEnd),
      totalHeldFormatted: formatCedi(snapshot.banking.totalHeldAtEnd),
    };
  }

  const filenameBase = `PUCA-weekly-${snapshot.weekEnding}-v${snapshot.version}`;

  return {
    churchName: snapshot.churchName,
    presbyteryName: snapshot.presbyteryName,
    weekRange: snapshot.weekRange,
    weekEnding: snapshot.weekEnding,
    version: snapshot.version,
    preparedByName: snapshot.preparedByName,
    submittedAtFormatted: formatAccraDateTime(snapshot.submittedAt),
    filenameBase,
    incomeCategories: categories,
    totals,
    varianceReason: snapshot.varianceReason,
    expenseCategories,
    expenseTotals,
    banking,
    districtAmountDueFormatted: snapshot.districtAmountDue
      ? formatCedi(snapshot.districtAmountDue)
      : null,
    signatories: [
      {
        title: "Finance Secretary",
        name: snapshot.preparedByName,
      },
      {
        title: "Parish Treasurer",
        name: "", // For physical signoff
      },
    ],
  };
}
