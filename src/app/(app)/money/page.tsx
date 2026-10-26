import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { getHeldMoneyLedger } from "@/features/banking/service";
import { listExpenses, listExpenseCategories } from "@/features/expenses/queries";
import { listDeposits } from "@/features/deposits/queries";
import { MoneyLandingView } from "@/features/banking/components/money-landing-view";

export const metadata = {
  title: "Money & Bank Deposits — PUCA Finance",
};

export default async function MoneyPage() {
  const user = await requireUser();

  const [ledger, expenses, deposits, categories, users] = await Promise.all([
    getHeldMoneyLedger(),
    listExpenses({ limit: 100 }),
    listDeposits({ limit: 100 }),
    listExpenseCategories(),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <MoneyLandingView
        ledger={ledger}
        expenses={expenses}
        deposits={deposits}
        categories={categories}
        churchUsers={users}
        currentUser={{
          id: user.id,
          name: user.name || "User",
          role: user.role,
        }}
      />
    </div>
  );
}
