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
  HeldMoneyLedger,
} from "./calculator";

export interface FormattedHeldMoneyLedger extends HeldMoneyLedger {
  cashHeldFormatted: string;
  momoHeldFormatted: string;
  totalHeldFormatted: string;
  oldestUndepositedNotice: string;
}

export async function getHeldMoneyLedger(): Promise<FormattedHeldMoneyLedger> {
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
  const ledger = calculateHeldMoney({
    serviceRecords: serviceCashItems,
    momoIncomes: momoTransactions,
    paidExpenses,
    deposits,
  });

  // 6. Generate human-friendly notice for oldest undeposited cash
  let oldestUndepositedNotice = "All counted cash has been deposited in the bank.";
  if (ledger.cashHeld.greaterThan(0)) {
    if (ledger.oldestUndepositedCashDate) {
      const now = new Date();
      const diffMs = now.getTime() - ledger.oldestUndepositedCashDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const dateStr = formatAccraDate(ledger.oldestUndepositedCashDate, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      oldestUndepositedNotice = `Oldest undeposited cash held for ${diffDays} day${diffDays === 1 ? "" : "s"} (since ${dateStr}).`;
    } else {
      oldestUndepositedNotice = "Unbanked cash balance currently held in parish custody.";
    }
  }

  return {
    ...ledger,
    cashHeldFormatted: formatCedi(ledger.cashHeld),
    momoHeldFormatted: formatCedi(ledger.momoHeld),
    totalHeldFormatted: formatCedi(ledger.totalHeld),
    oldestUndepositedNotice,
  };
}
