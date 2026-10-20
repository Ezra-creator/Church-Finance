import { prisma } from "@/server/db";
import { computeWeekRange, getCurrentWeekEnding } from "./week-range";
import { ReconciliationStatus } from "@prisma/client";

export interface WeekOverviewItem {
  weekEnding: string;
  formattedRange: string;
  status: ReconciliationStatus | "UNINITIALIZED";
  bookTotal: string | null;
  expectedTotal: string | null;
  varianceLabel: string | null;
  reportVersion: number;
  isCurrentWeek: boolean;
}

/**
 * Lists past and current reconciliation periods for the main Reconcile view.
 */
export async function listReconciliationPeriodsOverview(
  weekEndsOn: number = 0,
  weeksCount: number = 12
): Promise<{ currentWeekEnding: string; weeks: WeekOverviewItem[] }> {
  const currentWeekEnding = getCurrentWeekEnding(weekEndsOn);

  // Generate list of week-ending strings for the last N weeks
  const weekEndingList: string[] = [];
  const [currY, currM, currD] = currentWeekEnding.split("-").map(Number);
  const currDate = new Date(Date.UTC(currY, currM - 1, currD));

  for (let i = 0; i < weeksCount; i++) {
    const d = new Date(currDate);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weekEndingList.push(d.toISOString().slice(0, 10));
  }

  // Fetch all existing period records matching these dates
  const dates = weekEndingList.map((str) => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  });

  const existingPeriods = await prisma.reconciliationPeriod.findMany({
    where: {
      weekEnding: { in: dates },
    },
    include: {
      submittedBy: {
        select: { id: true, name: true, email: true },
      },
      unlocks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const periodMap = new Map<string, (typeof existingPeriods)[0]>();
  for (const p of existingPeriods) {
    const key = p.weekEnding.toISOString().slice(0, 10);
    periodMap.set(key, p);
  }

  const weeks: WeekOverviewItem[] = weekEndingList.map((wStr) => {
    const range = computeWeekRange(wStr);
    const existing = periodMap.get(wStr);

    let status: WeekOverviewItem["status"] = "UNINITIALIZED";
    let bookTotal: string | null = null;
    let expectedTotal: string | null = null;
    let varianceLabel: string | null = null;
    let reportVersion = 0;

    if (existing) {
      status = existing.status;
      reportVersion = existing.reportVersion;
      bookTotal = existing.bookTotal ? existing.bookTotal.toString() : null;

      // Extract frozen expected total and variance label if snapshot exists
      if (existing.snapshot && typeof existing.snapshot === "object") {
        const snap = existing.snapshot as Record<string, any>;
        if (snap.totals) {
          expectedTotal = snap.totals.expectedTotal || null;
          varianceLabel = snap.totals.varianceLabel || null;
        }
      }
    }

    return {
      weekEnding: wStr,
      formattedRange: range.formattedRange,
      status,
      bookTotal,
      expectedTotal,
      varianceLabel,
      reportVersion,
      isCurrentWeek: wStr === currentWeekEnding,
    };
  });

  return {
    currentWeekEnding,
    weeks,
  };
}

/**
 * Retrieves a ReconciliationPeriod by its ID.
 */
export async function getReconciliationPeriodById(id: string) {
  return prisma.reconciliationPeriod.findUnique({
    where: { id },
    include: {
      submittedBy: {
        select: { id: true, name: true, email: true },
      },
      unlocks: {
        include: {
          unlockedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
