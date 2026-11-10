import React from "react";
import { requireUser } from "@/server/guards";
import { startOfWeek, endOfWeek, parseISO } from "date-fns";
import { getHomeWeeklyData } from "@/features/services/home-queries";
import { getAttentionItems } from "@/lib/attention";
import { HomeView } from "@/features/services/components/home-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home",
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireUser();
  const { week } = await searchParams;

  const today = new Date();
  const baseDate = week ? parseISO(week) : today;
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  const [weeklyData, attentionItems] = await Promise.all([
    getHomeWeeklyData(weekStart, weekEnd),
    getAttentionItems(weekStart, weekEnd),
  ]);

  return (
    <HomeView
      cashCounted={weeklyData.cashCounted.toString()}
      mobileMoney={weeklyData.mobileMoney.toString()}
      totalThisWeek={weeklyData.totalThisWeek.toString()}
      attentionItems={attentionItems}
      recentCollections={weeklyData.recentCollections}
    />
  );
}
