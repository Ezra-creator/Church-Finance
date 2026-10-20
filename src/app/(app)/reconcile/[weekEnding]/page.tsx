import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { computePeriod } from "@/features/reconciliation/service";
import { WeekReconciliationView } from "@/features/reconciliation/components/week-reconciliation-view";

export const metadata = {
  title: "Week Reconciliation — PUCA Finance",
};

export default async function WeekReconciliationPage({
  params,
}: {
  params: Promise<{ weekEnding: string }>;
}) {
  const user = await requireUser();
  const { weekEnding } = await params;

  // Validate format (YYYY-MM-DD)
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

  const formattedCategories = computation.categories.map((c) => ({
    id: c.categoryId,
    name: c.categoryName,
    code: c.categoryCode,
    cash: c.cashAmount.toString(),
    momo: c.momoAmount.toString(),
    total: c.totalAmount.toString(),
  }));

  const formattedBlockers = computation.blockers.map((b) => ({
    type: b.type,
    message: b.message,
    link: b.link,
    count: b.count,
  }));

  return (
    <WeekReconciliationView
      periodId={period.id}
      weekEnding={weekEnding}
      formattedRange={weekRange.formattedRange}
      status={period.status}
      reportVersion={period.reportVersion}
      submittedAt={period.submittedAt ? period.submittedAt.toISOString() : null}
      submittedByName={period.submittedById ? "Finance Secretary" : null}
      cashTotal={computation.totals.cashTotal.toString()}
      momoTotal={computation.totals.momoTotal.toString()}
      expectedTotal={computation.totals.expectedTotal.toString()}
      initialBookTotal={period.bookTotal ? period.bookTotal.toString() : ""}
      initialVarianceReason={period.varianceReason || ""}
      variance={computation.totals.variance ? computation.totals.variance.toString() : null}
      varianceStatus={computation.totals.varianceStatus}
      varianceLabel={computation.totals.varianceLabel}
      categories={formattedCategories}
      blockers={formattedBlockers}
      canSubmit={computation.canSubmit}
      parallelRunActive={parallelRunActive}
      userRole={user.role}
    />
  );
}
