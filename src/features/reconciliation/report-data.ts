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
  signatories: Array<{
    title: string;
    name: string;
  }>;
}

/**
 * Builds a typed report model from a frozen ReconciliationSnapshot.
 * This ensures exported reports (.docx and .pdf) and preview screens
 * represent the exact submitted snapshot and never change silently.
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
