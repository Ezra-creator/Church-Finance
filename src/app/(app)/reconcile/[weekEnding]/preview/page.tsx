import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { computePeriod } from "@/features/reconciliation/service";
import {
  buildReportData,
  ReconciliationSnapshot,
} from "@/features/reconciliation/report-data";
import { ReportPreviewView } from "@/features/reconciliation/components/report-preview-view";
import { ReconciliationStatus } from "@prisma/client";

export const metadata = {
  title: "Report Preview — PUCA Finance",
};

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ weekEnding: string }>;
}) {
  const user = await requireUser();
  const { weekEnding } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) {
    notFound();
  }

  const {
    period,
    weekRange,
    computation,
    parallelRunActive,
    churchSettings,
  } = await computePeriod(weekEnding);

  let snapshot: ReconciliationSnapshot;

  if (period.snapshot && typeof period.snapshot === "object") {
    snapshot = period.snapshot as unknown as ReconciliationSnapshot;
  } else {
    // Build prospective snapshot for draft preview
    snapshot = {
      weekEnding,
      weekRange: weekRange.formattedRange,
      churchName: churchSettings.churchName,
      presbyteryName: churchSettings.presbyteryName,
      preparedById: user.id,
      preparedByName: user.name || "Finance Secretary",
      submittedAt: new Date().toISOString(),
      version: period.reportVersion > 0 ? period.reportVersion : 1,
      parallelRunActive,
      categories: computation.categories.map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryCode: c.categoryCode,
        cashAmount: c.cashAmount.toString(),
        momoAmount: c.momoAmount.toString(),
        totalAmount: c.totalAmount.toString(),
      })),
      totals: {
        cashTotal: computation.totals.cashTotal.toString(),
        momoTotal: computation.totals.momoTotal.toString(),
        expectedTotal: computation.totals.expectedTotal.toString(),
        bookTotal: computation.totals.bookTotal
          ? computation.totals.bookTotal.toString()
          : null,
        variance: computation.totals.variance
          ? computation.totals.variance.toString()
          : null,
        varianceStatus: computation.totals.varianceStatus,
        varianceLabel: computation.totals.varianceLabel,
      },
      varianceReason: period.varianceReason,
    };
  }

  const reportData = buildReportData(snapshot);

  return (
    <ReportPreviewView
      reportData={reportData}
      periodId={period.id}
      isSubmitted={period.status === ReconciliationStatus.SUBMITTED}
      weekEnding={weekEnding}
    />
  );
}
