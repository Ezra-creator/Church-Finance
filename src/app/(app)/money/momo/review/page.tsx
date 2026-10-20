import React from "react";
import { requireUser } from "@/server/guards";
import { getNeedsReviewQueue, listGivingCategories } from "@/features/momo/queries";
import { ReviewQueueView } from "@/features/momo/components/review-queue-view";

export const metadata = {
  title: "Classification Queue — PUCA Finance",
};

export default async function MomoReviewPage() {
  const user = await requireUser();

  const [queueData, categories] = await Promise.all([
    getNeedsReviewQueue(),
    listGivingCategories(),
  ]);

  const formattedQueue = queueData.map((item) => ({
    id: item.id,
    occurredAt: item.occurredAt.toISOString(),
    direction: item.direction,
    amount: item.amount.toString(),
    externalRef: item.externalRef,
    counterpartyName: item.counterpartyName,
    counterpartyPhone: item.counterpartyPhone,
    rawDescription: item.rawDescription,
    member: item.member
      ? { id: item.member.id, fullName: item.member.fullName }
      : null,
  }));

  return (
    <ReviewQueueView
      initialQueue={formattedQueue}
      categories={categories}
      userRole={user.role}
    />
  );
}
