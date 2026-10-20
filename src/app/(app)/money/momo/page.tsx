import React from "react";
import { requireUser } from "@/server/guards";
import { listMomoTransactions, listGivingCategories, getNeedsReviewQueue } from "@/features/momo/queries";
import { MomoTransactionList } from "@/features/momo/components/momo-transaction-list";

export const metadata = {
  title: "Mobile Money Register — PUCA Finance",
};

export default async function MomoRegisterPage() {
  const user = await requireUser();

  const [transactionsData, categories, reviewQueue] = await Promise.all([
    listMomoTransactions({ pageSize: 300 }),
    listGivingCategories(),
    getNeedsReviewQueue(),
  ]);

  const transactions = transactionsData.items.map((tx) => ({
    id: tx.id,
    occurredAt: tx.occurredAt.toISOString(),
    direction: tx.direction,
    amount: tx.amount.toString(),
    externalRef: tx.externalRef,
    counterpartyName: tx.counterpartyName,
    counterpartyPhone: tx.counterpartyPhone,
    rawDescription: tx.rawDescription,
    status: tx.status,
    category: tx.category
      ? { id: tx.category.id, name: tx.category.name, code: tx.category.code }
      : null,
    member: tx.member
      ? { id: tx.member.id, fullName: tx.member.fullName }
      : null,
    matchedRule: tx.matchedRule
      ? { id: tx.matchedRule.id, pattern: tx.matchedRule.pattern }
      : null,
  }));

  return (
    <MomoTransactionList
      transactions={transactions}
      categories={categories}
      needsReviewCount={reviewQueue.length}
      userRole={user.role}
    />
  );
}
