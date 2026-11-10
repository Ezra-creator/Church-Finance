import { prisma } from "@/server/db";
import { Prisma, MomoTransactionDirection, MomoTransactionStatus } from "@prisma/client";
import { sumCedi } from "@/lib/money";
import { format } from "date-fns";

export interface HomeCollectionItem {
  id: string;
  dateLabel: string;
  type: string;
  source: "Cash" | "Mobile money";
  amount: Prisma.Decimal;
}

export interface HomeWeeklyData {
  cashCounted: Prisma.Decimal;
  mobileMoney: Prisma.Decimal;
  totalThisWeek: Prisma.Decimal;
  recentCollections: HomeCollectionItem[];
}

export async function getHomeWeeklyData(weekStart: Date, weekEnd: Date): Promise<HomeWeeklyData> {
  try {
    // 1. Fetch cash collections in week
    const serviceRecords = await prisma.serviceRecord.findMany({
      where: {
        serviceDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        countSheets: {
          include: {
            category: { select: { name: true } },
          },
        },
        givingEntries: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { serviceDate: "desc" },
    });

    const cashSheetTotals: Prisma.Decimal[] = [];
    const cashItems: HomeCollectionItem[] = [];

    for (const record of serviceRecords) {
      const dateLabel = format(record.serviceDate, "EEE d MMM");

      // Use giving entries if any; otherwise count sheets
      if (record.givingEntries.length > 0) {
        for (const entry of record.givingEntries) {
          cashSheetTotals.push(entry.amount);
          cashItems.push({
            id: `giving-${entry.id}`,
            dateLabel,
            type: entry.category.name,
            source: "Cash",
            amount: entry.amount,
          });
        }
      } else {
        for (const sheet of record.countSheets) {
          cashSheetTotals.push(sheet.total);
          cashItems.push({
            id: `sheet-${sheet.id}`,
            dateLabel,
            type: sheet.category.name,
            source: "Cash",
            amount: sheet.total,
          });
        }
      }
    }

    const cashCounted = sumCedi(cashSheetTotals);

    // 2. Fetch mobile money collections in week
    const momoTransactions = await prisma.momoTransaction.findMany({
      where: {
        direction: MomoTransactionDirection.IN,
        status: {
          in: [MomoTransactionStatus.CONFIRMED, MomoTransactionStatus.AUTO],
        },
        occurredAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        category: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
    });

    const momoTotals = momoTransactions.map((tx) => tx.amount);
    const mobileMoney = sumCedi(momoTotals);

    const momoItems: HomeCollectionItem[] = momoTransactions.map((tx) => ({
      id: `momo-${tx.id}`,
      dateLabel: format(tx.occurredAt, "EEE d MMM"),
      type: tx.category?.name || "General Offering",
      source: "Mobile money",
      amount: tx.amount,
    }));

    // Combine and sort latest 8 entries
    const combined = [...cashItems, ...momoItems].slice(0, 8);

    const totalThisWeek = cashCounted.plus(mobileMoney);

    return {
      cashCounted,
      mobileMoney,
      totalThisWeek,
      recentCollections: combined,
    };
  } catch (err) {
    return {
      cashCounted: new Prisma.Decimal(0),
      mobileMoney: new Prisma.Decimal(0),
      totalThisWeek: new Prisma.Decimal(0),
      recentCollections: [],
    };
  }
}
