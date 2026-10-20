import React from "react";
import { requireUser } from "@/server/guards";
import { listRecentServices } from "@/features/services/queries";
import { TodayServiceList } from "@/features/services/components/today-service-list";
import { nowUtc, toAccraDateString } from "@/lib/dates";

export const metadata = {
  title: "Today's Service Collections — PUCA Finance",
};

export default async function TodayPage() {
  const user = await requireUser();
  const services = await listRecentServices(30);
  const todayStr = toAccraDateString(nowUtc());

  return (
    <TodayServiceList
      services={services}
      userRole={user.role}
      todayAccraDateString={todayStr}
    />
  );
}
