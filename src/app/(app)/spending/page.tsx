import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { listExpenses, listExpenseCategories } from "@/features/expenses/queries";
import { SpendingView } from "@/features/expenses/components/spending-view";

export const metadata = {
  title: "Spending — PUCA Finance",
};

export default async function SpendingPage() {
  const user = await requireUser();

  const [expenses, categories, churchUsers] = await Promise.all([
    listExpenses({ limit: 100 }),
    listExpenseCategories(),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SpendingView
      expenses={JSON.parse(JSON.stringify(expenses))}
      categories={categories}
      churchUsers={churchUsers}
      currentUser={{
        id: user.id,
        name: user.name || "User",
        role: user.role,
      }}
    />
  );
}

