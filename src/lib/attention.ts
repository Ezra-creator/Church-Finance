import { prisma } from "@/server/db";
import { formatMoney } from "@/lib/money";
import { ServiceStatus, DepositStatus, MomoTransactionStatus } from "@prisma/client";
import { plural } from "@/lib/plural";

export interface AttentionItem {
  id: string;
  kind: "uncounted_service" | "unclassified_momo" | "unconfirmed_deposit" | "reconciliation_difference";
  message: string;
  actionLabel: string;
  href: string;
}

/**
 * Returns typed items needing attention for the specified week.
 * Read-only function computing from live database records.
 */
export async function getAttentionItems(weekStart: Date, weekEnd: Date): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  try {
    // 1. Service count not entered
    const uncountedService = await prisma.serviceRecord.findFirst({
      where: {
        serviceDate: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: ServiceStatus.OPEN,
      },
      select: {
        id: true,
        title: true,
        serviceType: true,
      },
    });

    if (uncountedService) {
      const typeLabel =
        uncountedService.serviceType === "SUNDAY"
          ? "Sunday service"
          : uncountedService.title || "Service";
      items.push({
        id: `uncounted-${uncountedService.id}`,
        kind: "uncounted_service",
        message: `${typeLabel} count not entered`,
        actionLabel: "Enter count",
        href: `/services/${uncountedService.id}`,
      });
    }

    // 2. Mobile money payments needing a category
    const unclassifiedMomoCount = await prisma.momoTransaction.count({
      where: {
        status: MomoTransactionStatus.NEEDS_REVIEW,
        occurredAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    if (unclassifiedMomoCount > 0) {
      items.push({
        id: "unclassified-momo",
        kind: "unclassified_momo",
        message: `${plural(unclassifiedMomoCount, "mobile money payment needs", "mobile money payments need")} a category`,
        actionLabel: "Classify",
        href: "/money/momo",
      });
    }

    // 3. Deposit not confirmed
    const unconfirmedDeposit = await prisma.deposit.findFirst({
      where: {
        status: DepositStatus.PENDING_CONFIRMATION,
        depositDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        id: true,
        amount: true,
      },
      orderBy: { depositDate: "desc" },
    });

    if (unconfirmedDeposit) {
      items.push({
        id: `deposit-${unconfirmedDeposit.id}`,
        kind: "unconfirmed_deposit",
        message: `Deposit of ${formatMoney(unconfirmedDeposit.amount)} not confirmed`,
        actionLabel: "Confirm",
        href: "/deposits",
      });
    }
  } catch (err) {
    // Return empty list if database is offline/unreachable
    return [];
  }

  return items;
}
