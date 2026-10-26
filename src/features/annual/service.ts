import { prisma } from "@/server/db";
import {
  Prisma,
  ServiceStatus,
  ExpenseStatus,
  ReconciliationStatus,
  MomoTransactionStatus,
} from "@prisma/client";
import { formatCedi } from "@/lib/money";
import { nowUtc } from "@/lib/dates";

export interface AnnualCategoryMonthlyRow {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  monthlyAmounts: Prisma.Decimal[]; // 12 elements (Jan..Dec)
  rowTotal: Prisma.Decimal;
}

export interface AnnualExpenseCategoryRow {
  categoryId: string;
  categoryName: string;
  cashAmount: Prisma.Decimal;
  momoAmount: Prisma.Decimal;
  bankAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
}

export interface AnnualReportData {
  year: number;
  churchName: string;
  presbyteryName: string;
  generatedAt: string;
  income: {
    categories: AnnualCategoryMonthlyRow[];
    monthlyTotals: Prisma.Decimal[]; // 12 elements
    grandTotal: Prisma.Decimal;
  };
  expenses: {
    categories: AnnualExpenseCategoryRow[];
    cashTotal: Prisma.Decimal;
    momoTotal: Prisma.Decimal;
    bankTotal: Prisma.Decimal;
    grandTotal: Prisma.Decimal;
  };
  deposits: {
    cashDepositsTotal: Prisma.Decimal;
    momoTransfersTotal: Prisma.Decimal;
    totalDeposited: Prisma.Decimal;
    countDeposits: number;
  };
  districtRemittance: {
    totalDue: Prisma.Decimal;
    totalPaid: Prisma.Decimal;
    totalOutstanding: Prisma.Decimal;
  };
  netOperatingSurplus: Prisma.Decimal; // Income Total - Expense Total
}

export const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function getAnnualReportData(year: number): Promise<AnnualReportData> {
  const settings = await prisma.churchSettings.findUnique({
    where: { id: "singleton" },
  });

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  // 1. Fetch Giving Categories
  const categories = await prisma.givingCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  // Initialize monthly income matrix: 12 zeros per category
  const categoryRowsMap = new Map<string, AnnualCategoryMonthlyRow>();
  for (const cat of categories) {
    categoryRowsMap.set(cat.id, {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryCode: cat.code,
      monthlyAmounts: Array.from({ length: 12 }, () => new Prisma.Decimal(0)),
      rowTotal: new Prisma.Decimal(0),
    });
  }

  // 2. Aggregate Cash Giving Entries in COUNTED/LOCKED service records
  const cashGiving = await prisma.givingEntry.findMany({
    where: {
      serviceRecord: {
        serviceDate: {
          gte: startDate,
          lte: new Date(`${year}-12-31`),
        },
        status: { in: [ServiceStatus.COUNTED, ServiceStatus.LOCKED] },
      },
    },
    include: {
      serviceRecord: true,
      category: true,
    },
  });

  for (const entry of cashGiving) {
    const month = entry.serviceRecord.serviceDate.getUTCMonth(); // 0 to 11
    let row = categoryRowsMap.get(entry.categoryId);
    if (!row) {
      row = {
        categoryId: entry.categoryId,
        categoryName: entry.category.name,
        categoryCode: entry.category.code,
        monthlyAmounts: Array.from({ length: 12 }, () => new Prisma.Decimal(0)),
        rowTotal: new Prisma.Decimal(0),
      };
      categoryRowsMap.set(entry.categoryId, row);
    }
    row.monthlyAmounts[month] = row.monthlyAmounts[month].add(entry.amount);
    row.rowTotal = row.rowTotal.add(entry.amount);
  }

  // 3. Aggregate MoMo Giving in locked / confirmed periods
  const momoGiving = await prisma.momoTransaction.findMany({
    where: {
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: [MomoTransactionStatus.CONFIRMED, MomoTransactionStatus.AUTO] },
      categoryId: { not: null },
      OR: [
        { locked: true },
        { period: { status: ReconciliationStatus.SUBMITTED } },
        { import: { rolledBackAt: null } },
      ],
    },
    include: {
      category: true,
    },
  });

  for (const tx of momoGiving) {
    if (!tx.categoryId || !tx.category) continue;
    const month = tx.occurredAt.getUTCMonth();
    let row = categoryRowsMap.get(tx.categoryId);
    if (!row) {
      row = {
        categoryId: tx.categoryId,
        categoryName: tx.category.name,
        categoryCode: tx.category.code,
        monthlyAmounts: Array.from({ length: 12 }, () => new Prisma.Decimal(0)),
        rowTotal: new Prisma.Decimal(0),
      };
      categoryRowsMap.set(tx.categoryId, row);
    }
    row.monthlyAmounts[month] = row.monthlyAmounts[month].add(tx.amount);
    row.rowTotal = row.rowTotal.add(tx.amount);
  }

  const categoryRows = Array.from(categoryRowsMap.values());
  const monthlyTotals = Array.from({ length: 12 }, () => new Prisma.Decimal(0));
  let incomeGrandTotal = new Prisma.Decimal(0);

  for (let m = 0; m < 12; m++) {
    for (const row of categoryRows) {
      monthlyTotals[m] = monthlyTotals[m].add(row.monthlyAmounts[m]);
    }
    incomeGrandTotal = incomeGrandTotal.add(monthlyTotals[m]);
  }

  // 4. Aggregate Expenses for the year (status = PAID)
  const paidExpenses = await prisma.expense.findMany({
    where: {
      status: ExpenseStatus.PAID,
      paidAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      category: { name: "asc" },
    },
  });

  const expenseRowsMap = new Map<string, AnnualExpenseCategoryRow>();
  let expCashTotal = new Prisma.Decimal(0);
  let expMomoTotal = new Prisma.Decimal(0);
  let expBankTotal = new Prisma.Decimal(0);

  for (const exp of paidExpenses) {
    let row = expenseRowsMap.get(exp.categoryId);
    if (!row) {
      row = {
        categoryId: exp.categoryId,
        categoryName: exp.category.name,
        cashAmount: new Prisma.Decimal(0),
        momoAmount: new Prisma.Decimal(0),
        bankAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
      };
      expenseRowsMap.set(exp.categoryId, row);
    }

    if (exp.paymentMethod === "CASH") {
      row.cashAmount = row.cashAmount.add(exp.amount);
      expCashTotal = expCashTotal.add(exp.amount);
    } else if (exp.paymentMethod === "MOMO") {
      row.momoAmount = row.momoAmount.add(exp.amount);
      expMomoTotal = expMomoTotal.add(exp.amount);
    } else {
      row.bankAmount = row.bankAmount.add(exp.amount);
      expBankTotal = expBankTotal.add(exp.amount);
    }
    row.totalAmount = row.totalAmount.add(exp.amount);
  }

  const expenseRows = Array.from(expenseRowsMap.values());
  const expGrandTotal = expCashTotal.add(expMomoTotal).add(expBankTotal);

  // 5. Aggregate Deposits
  const deposits = await prisma.deposit.findMany({
    where: {
      depositDate: {
        gte: startDate,
        lte: new Date(`${year}-12-31`),
      },
    },
  });

  let cashDepositsTotal = new Prisma.Decimal(0);
  let momoTransfersTotal = new Prisma.Decimal(0);

  for (const dep of deposits) {
    if (dep.kind === "CASH_DEPOSIT") {
      cashDepositsTotal = cashDepositsTotal.add(dep.amount);
    } else {
      momoTransfersTotal = momoTransfersTotal.add(dep.amount);
    }
  }

  const totalDeposited = cashDepositsTotal.add(momoTransfersTotal);

  // 6. Aggregate District Remittances
  const remittances = await prisma.districtRemittance.findMany({
    where: {
      period: {
        weekEnding: {
          gte: startDate,
          lte: new Date(`${year}-12-31`),
        },
      },
    },
  });

  let districtTotalDue = new Prisma.Decimal(0);
  let districtTotalPaid = new Prisma.Decimal(0);

  for (const rem of remittances) {
    districtTotalDue = districtTotalDue.add(rem.amountDue);
    districtTotalPaid = districtTotalPaid.add(rem.amountPaid);
  }

  const districtTotalOutstanding = districtTotalDue.sub(districtTotalPaid);
  const netOperatingSurplus = incomeGrandTotal.sub(expGrandTotal);

  return {
    year,
    churchName: settings?.churchName || "Presbyterian Church of Ghana",
    presbyteryName: settings?.presbyteryName || "Local Presbytery",
    generatedAt: nowUtc().toISOString(),
    income: {
      categories: categoryRows,
      monthlyTotals,
      grandTotal: incomeGrandTotal,
    },
    expenses: {
      categories: expenseRows,
      cashTotal: expCashTotal,
      momoTotal: expMomoTotal,
      bankTotal: expBankTotal,
      grandTotal: expGrandTotal,
    },
    deposits: {
      cashDepositsTotal,
      momoTransfersTotal,
      totalDeposited,
      countDeposits: deposits.length,
    },
    districtRemittance: {
      totalDue: districtTotalDue,
      totalPaid: districtTotalPaid,
      totalOutstanding: districtTotalOutstanding,
    },
    netOperatingSurplus,
  };
}
