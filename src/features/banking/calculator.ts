import { Prisma } from "@prisma/client";
import { toDecimal } from "@/lib/money";

export interface ServiceCashItem {
  serviceDate: Date;
  cashCounted: Prisma.Decimal | string | number;
}

export interface MomoIncomeItem {
  amount: Prisma.Decimal | string | number;
}

export interface ExpenseItem {
  paymentMethod: "CASH" | "MOMO" | "BANK";
  amount: Prisma.Decimal | string | number;
  paidAt?: Date | null;
}

export interface DepositItem {
  kind: "CASH_DEPOSIT" | "MOMO_TRANSFER";
  amount: Prisma.Decimal | string | number;
  status: "PENDING_CONFIRMATION" | "CONFIRMED";
  depositDate: Date;
}

export interface HeldMoneyLedger {
  // Cash breakdown
  cashCounted: Prisma.Decimal;
  cashExpenses: Prisma.Decimal;
  cashDeposits: Prisma.Decimal;
  cashHeld: Prisma.Decimal;
  oldestUndepositedCashDate: Date | null;

  // MoMo breakdown
  momoReceived: Prisma.Decimal;
  momoExpenses: Prisma.Decimal;
  momoTransfers: Prisma.Decimal;
  momoHeld: Prisma.Decimal;

  // Total funds held
  totalHeld: Prisma.Decimal;
}

/**
 * Pure calculator for church money held (not yet banked):
 * - Cash held = counted cash (all COUNTED / LOCKED services) minus cash-paid expenses minus all cash deposits (confirmed + pending).
 * - MoMo held = classified MoMo received minus MoMo-paid expenses minus MoMo bank transfers.
 * - Oldest undeposited cash date = earliest service date whose counted cash has not been fully absorbed by cash outflows (FIFO).
 */
export function calculateHeldMoney(params: {
  serviceRecords: ServiceCashItem[];
  momoIncomes: MomoIncomeItem[];
  paidExpenses: ExpenseItem[];
  deposits: DepositItem[];
}): HeldMoneyLedger {
  const zero = new Prisma.Decimal(0);

  // 1. Calculate Cash Counted
  let cashCounted = zero;
  for (const s of params.serviceRecords) {
    cashCounted = cashCounted.add(toDecimal(s.cashCounted));
  }

  // 2. Calculate Cash & MoMo Expenses
  let cashExpenses = zero;
  let momoExpenses = zero;
  for (const exp of params.paidExpenses) {
    const amt = toDecimal(exp.amount);
    if (exp.paymentMethod === "CASH") {
      cashExpenses = cashExpenses.add(amt);
    } else if (exp.paymentMethod === "MOMO") {
      momoExpenses = momoExpenses.add(amt);
    }
  }

  // 3. Calculate Cash Deposits & MoMo Transfers (both CONFIRMED and PENDING_CONFIRMATION)
  let cashDeposits = zero;
  let momoTransfers = zero;
  for (const dep of params.deposits) {
    const amt = toDecimal(dep.amount);
    if (dep.kind === "CASH_DEPOSIT") {
      cashDeposits = cashDeposits.add(amt);
    } else if (dep.kind === "MOMO_TRANSFER") {
      momoTransfers = momoTransfers.add(amt);
    }
  }

  // 4. Calculate Net Cash Held
  const totalCashOutflows = cashExpenses.add(cashDeposits);
  const cashHeld = cashCounted.sub(totalCashOutflows);

  // 5. Calculate Oldest Undeposited Cash Date (FIFO over chronological services)
  let oldestUndepositedCashDate: Date | null = null;
  if (cashHeld.greaterThan(0)) {
    // Sort services chronologically ascending
    const sortedServices = [...params.serviceRecords].sort(
      (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime()
    );

    let remainingOutflow = totalCashOutflows;

    for (const service of sortedServices) {
      const sAmt = toDecimal(service.cashCounted);
      if (sAmt.lessThanOrEqualTo(0)) continue;

      if (remainingOutflow.greaterThanOrEqualTo(sAmt)) {
        remainingOutflow = remainingOutflow.sub(sAmt);
      } else {
        // Outflows did not fully consume this service's cash
        oldestUndepositedCashDate = new Date(service.serviceDate);
        break;
      }
    }
  }

  // 6. Calculate MoMo Received & Net MoMo Held
  let momoReceived = zero;
  for (const m of params.momoIncomes) {
    momoReceived = momoReceived.add(toDecimal(m.amount));
  }

  const momoHeld = momoReceived.sub(momoExpenses).sub(momoTransfers);

  return {
    cashCounted,
    cashExpenses,
    cashDeposits,
    cashHeld,
    oldestUndepositedCashDate,
    momoReceived,
    momoExpenses,
    momoTransfers,
    momoHeld,
    totalHeld: cashHeld.add(momoHeld),
  };
}
