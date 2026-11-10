import React from "react";
import { requireRole } from "@/server/guards";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { CountEntryFlow } from "@/features/counting/components/count-entry-flow";
import { nowUtc, toAccraDateString } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Record a count",
};

export default async function NewCountPage() {
  const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
  const defaultDate = toAccraDateString(nowUtc());

  const [denominations, categories] = await Promise.all([
    prisma.denomination.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        kind: true,
        value: true,
        sortOrder: true,
      },
    }),
    prisma.givingCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
  ]);

  return (
    <CountEntryFlow
      denominations={denominations.map((d) => ({
        id: d.id,
        kind: d.kind,
        value: d.value.toString(),
        name: `GH₵ ${d.value} ${d.kind === "NOTE" ? "note" : "coin"}`,
      }))}
      categories={categories}
      defaultDate={defaultDate}
      currentUserName={user.name || "Finance Secretary"}
    />
  );
}
