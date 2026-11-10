import React from "react";
import { requireUser } from "@/server/guards";
import { getChurchSettings, computePeriod } from "@/features/reconciliation/service";
import { getCurrentWeekEnding } from "@/features/reconciliation/week-range";
import { getAssemblySettings } from "@/lib/assembly";
import { WeeklyReportView } from "@/features/reconciliation/components/weekly-report-view";

export const metadata = {
  title: "Weekly Finance Report — PUCA Finance",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const { week: weekParam } = await searchParams;

  const dbSettings = await getChurchSettings();
  const assemblySettings = await getAssemblySettings();

  const currentWeek = getCurrentWeekEnding(dbSettings.weekEndsOn);
  const targetWeek =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : currentWeek;

  const {
    period,
    weekRange,
    computation,
  } = await computePeriod(targetWeek);

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
    <WeeklyReportView
      periodId={period.id}
      weekEnding={targetWeek}
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
      categories={formattedCategories}
      blockers={formattedBlockers}
      canSubmit={computation.canSubmit}
      userRole={user.role}
      churchSettings={{
        assemblyName: assemblySettings.assemblyName,
        parentBodyName: assemblySettings.parentBodyName,
        districtName: assemblySettings.districtName,
        areaName: assemblySettings.areaName,
        reportRecipientName: assemblySettings.reportRecipientName,
        signatoryTitles:
          assemblySettings.signatoryTitles.length > 0
            ? assemblySettings.signatoryTitles
            : ["Finance Secretary", "Assembly Treasurer"],
      }}
    />
  );
}
