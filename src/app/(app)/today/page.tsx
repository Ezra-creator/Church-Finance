import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { listRecentServices } from "@/features/services/queries";
import { TodayServiceList } from "@/features/services/components/today-service-list";
import { getHeldMoneyLedger } from "@/features/banking/service";
import { getDistrictOutstandingSummary } from "@/features/remittance/service";
import { MomoTransactionStatus } from "@prisma/client";
import { nowUtc, toAccraDateString } from "@/lib/dates";

export const metadata = {
  title: "Today's Service Collections — PUCA Finance",
};

export default async function TodayPage() {
  const user = await requireUser();
  const todayStr = toAccraDateString(nowUtc());

  const [services, heldLedger, districtSummary, unreviewedMomoCount] =
    await Promise.all([
      listRecentServices(30),
      getHeldMoneyLedger(),
      getDistrictOutstandingSummary(),
      prisma.momoTransaction.count({
        where: { status: MomoTransactionStatus.NEEDS_REVIEW },
      }),
    ]);

  return (
    <TodayServiceList
      services={services}
      userRole={user.role}
      todayAccraDateString={todayStr}
      heldAmount={heldLedger.totalHeld}
      districtOutstandingAmount={districtSummary.totalOutstanding}
      unreviewedMomoCount={unreviewedMomoCount}
    />
  );
}
