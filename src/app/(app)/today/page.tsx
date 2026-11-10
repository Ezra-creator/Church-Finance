import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { listRecentServices } from "@/features/services/queries";
import { TodayServiceList } from "@/features/services/components/today-service-list";
import { getHeldMoneyLedger } from "@/features/banking/service";
import { getDistrictOutstandingSummary } from "@/features/remittance/service";
import { getChurchSettings } from "@/features/auth/service";
import { MomoTransactionStatus, Role } from "@prisma/client";
import { nowUtc, toAccraDateString } from "@/lib/dates";
import { getNeedsAttentionItems } from "@/lib/attention";

export const metadata = {
  title: "Home · PUCA Finance",
};

export default async function TodayPage() {
  const user = await requireUser();
  const todayStr = toAccraDateString(nowUtc());

  const [services, heldLedger, districtSummary, unreviewedMomoCount, lastBackup, churchSettings] =
    await Promise.all([
      listRecentServices(8), // Limit recent collections to 8 per specification
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
      getChurchSettings(),
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

  // Derive attention items via lib/attention.ts
  const attentionItems = getNeedsAttentionItems({
    unreviewedMomoCount,
    cashHeldAmount: heldLedger.cashHeld.toString(),
    districtOutstandingAmount: districtSummary.totalOutstanding.toString(),
    needsBackupReminder,
  });

  return (
    <TodayServiceList
      services={JSON.parse(JSON.stringify(services))}
      userRole={user.role}
      todayAccraDateString={todayStr}
      churchName={churchSettings?.churchName}
      cashHeldFormatted={heldLedger.cashHeldFormatted}
      momoHeldFormatted={heldLedger.momoHeldFormatted}
      totalHeldFormatted={heldLedger.totalHeldFormatted}
      attentionItems={attentionItems}
      needsBackupReminder={needsBackupReminder}
      lastBackupDate={lastBackupDate}
    />
  );
}
