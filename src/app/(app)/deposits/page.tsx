import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { listDeposits } from "@/features/deposits/queries";
import { DepositsView } from "@/features/deposits/components/deposits-view";

export const metadata = {
  title: "Deposits — PUCA Finance",
};

export default async function DepositsPage() {
  const user = await requireUser();

  const [deposits, churchUsers] = await Promise.all([
    listDeposits({ limit: 100 }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DepositsView
      deposits={JSON.parse(JSON.stringify(deposits))}
      churchUsers={churchUsers}
      currentUser={{
        id: user.id,
        name: user.name || "User",
        role: user.role,
      }}
    />
  );
}

