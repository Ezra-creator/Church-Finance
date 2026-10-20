import React from "react";
import { requireUser } from "@/server/guards";
import { getChurchSettings } from "@/features/reconciliation/service";
import { listReconciliationPeriodsOverview } from "@/features/reconciliation/queries";
import { ReconciliationOverview } from "@/features/reconciliation/components/reconciliation-overview";

export const metadata = {
  title: "Weekly Reconciliation — PUCA Finance",
};

export default async function ReconcileIndexPage() {
  const user = await requireUser();
  const settings = await getChurchSettings();

  const overview = await listReconciliationPeriodsOverview(
    settings.weekEndsOn,
    16
  );

  return (
    <ReconciliationOverview
      currentWeekEnding={overview.currentWeekEnding}
      weeks={overview.weeks}
      userRole={user.role}
      parallelRunActive={settings.parallelRunActive}
    />
  );
}
