import {
  Prisma,
  ServiceStatus,
  MomoTransactionStatus,
  MomoTransactionDirection,
  ExpenseStatus,
  DepositStatus,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { formatCedi, toDecimal } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import {
  calculateHeldMoney,
  HeldMoneySummary,
} from "./calculator";

export interface FormattedHeldMoneySummary extends HeldMoneySummary {
  cashHeldFormatted: string;
  momoHeldFormatted: string;
  totalHeldFormatted: string;
  oldestUndepositedNotice: string;
}

export async function getHeldMoneySummary(): Promise<FormattedHeldMoneySummary> {
  // 1. Fetch counted / locked service records
  const serviceRecords = await prisma.serviceRecord.findMany({
    where: {
      status: {
        in: [ServiceStatus.COUNTED, ServiceStatus.LOCKED],
      },
    },
    include: {
      countSheets: true,
    },
    orderBy: {
      serviceDate: "asc",
    },
  });

  const serviceCashItems = serviceRecords.map((s) => {
    const cashTotal = s.countSheets.reduce(
      (sum, cs) => sum.add(cs.total),
      new Prisma.Decimal(0)
    );
    return {
      serviceDate: s.serviceDate,
      cashCounted: cashTotal,
    };
  });

  // 2. Fetch classified MoMo incoming transactions
  const momoTransactions = await prisma.momoTransaction.findMany({
    where: {
      direction: MomoTransactionDirection.IN,
      status: {
        in: [MomoTransactionStatus.AUTO, MomoTransactionStatus.CONFIRMED],
      },
    },
    select: {
      amount: true,
    },
  });

  // 3. Fetch paid expenses
  const paidExpenses = await prisma.expense.findMany({
    where: {
      status: ExpenseStatus.PAID,
    },
    select: {
      paymentMethod: true,
      amount: true,
      paidAt: true,
    },
  });

  // 4. Fetch deposits (both pending confirmation and confirmed)
  const deposits = await prisma.deposit.findMany({
    where: {
      status: {
        in: [DepositStatus.PENDING_CONFIRMATION, DepositStatus.CONFIRMED],
      },
    },
    select: {
      kind: true,
      amount: true,
      status: true,
      depositDate: true,
    },
  });

  // 5. Run calculation
  const summary = calculateHeldMoney({
    serviceRecords: serviceCashItems,
    momoIncomes: momoTransactions,
    paidExpenses,
    deposits,
  });

  // 6. Generate human-friendly notice for oldest undeposited cash
  let oldestUndepositedNotice = "All counted cash has been deposited in the bank.";
  if (summary.cashHeld.greaterThan(0)) {
    if (summary.oldestUndepositedCashDate) {
      const now = new Date();
      const diffMs = now.getTime() - summary.oldestUndepositedCashDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const dateStr = formatAccraDate(summary.oldestUndepositedCashDate, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      oldestUndepositedNotice = `Oldest undeposited cash held for ${diffDays} day${diffDays === 1 ? "" : "s"} (since ${dateStr}).`;
    } else {
      oldestUndepositedNotice = "Unbanked cash balance currently held in assembly custody.";
    }
  }

  return {
    ...summary,
    cashHeldFormatted: formatCedi(summary.cashHeld),
    momoHeldFormatted: formatCedi(summary.momoHeld),
    totalHeldFormatted: formatCedi(summary.totalHeld),
    oldestUndepositedNotice,
  };
}

export const getHeldMoneyLedger = getHeldMoneySummary;
export type FormattedHeldMoneyLedger = FormattedHeldMoneySummary;
export type HeldMoneyLedger = HeldMoneySummary;

