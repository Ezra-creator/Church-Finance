import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { listRecentServices } from "@/features/services/queries";
import { TodayServiceList } from "@/features/services/components/today-service-list";
import { getHeldMoneyLedger } from "@/features/banking/service";
import { getDistrictOutstandingSummary } from "@/features/remittance/service";
import { MomoTransactionStatus, Role } from "@prisma/client";
import { nowUtc, toAccraDateString } from "@/lib/dates";

export const metadata = {
  title: "Today's Service Collections — PUCA Finance",
};

export default async function TodayPage() {
  const user = await requireUser();
  const todayStr = toAccraDateString(nowUtc());

  const [services, heldLedger, districtSummary, unreviewedMomoCount, lastBackup] =
    await Promise.all([
      listRecentServices(30),
      getHeldMoneyLedger(),
      getDistrictOutstandingSummary(),
      prisma.momoTransaction.count({
        where: { status: MomoTransactionStatus.NEEDS_REVIEW },
      }),
      user.role === Role.FINANCE_SECRETARY
        ? prisma.auditLog.findFirst({
            where: {
              action: {
                in: [
                  "DATABASE_BACKUP_COMPLETED",
                  "DATABASE_BACKUP_MANUALLY_RECORDED",
                ],
              },
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          })
        : null,
    ]);

  let lastBackupDate: string | null = null;
  let needsBackupReminder = false;

  if (user.role === Role.FINANCE_SECRETARY) {
    if (lastBackup) {
      lastBackupDate = lastBackup.createdAt.toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastBackup.createdAt < sevenDaysAgo) {
        needsBackupReminder = true;
      }
    } else {
      needsBackupReminder = true;
    }
  }

  return (
    <TodayServiceList
      services={JSON.parse(JSON.stringify(services))}
      userRole={user.role}
      todayAccraDateString={todayStr}
      heldAmount={heldLedger.totalHeld.toString()}
      districtOutstandingAmount={districtSummary.totalOutstanding.toString()}
      unreviewedMomoCount={unreviewedMomoCount}
      needsBackupReminder={needsBackupReminder}
      lastBackupDate={lastBackupDate}
    />
  );
}
