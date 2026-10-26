import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import {
  getDistrictRemittances,
  getDistrictOutstandingSummary,
} from "@/features/remittance/service";
import { getAllocationRules } from "@/features/allocation/service";
import { DistrictManagementView } from "@/features/remittance/components/district-management-view";

export const metadata = {
  title: "District Remittances & Allocation Rules — PUCA Finance",
};

export default async function DistrictPage() {
  const user = await requireUser();

  const [remittances, summary, rules, categories] = await Promise.all([
    getDistrictRemittances(),
    getDistrictOutstandingSummary(),
    getAllocationRules(),
    prisma.givingCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <DistrictManagementView
      remittances={JSON.parse(JSON.stringify(remittances))}
      summary={JSON.parse(JSON.stringify(summary))}
      rules={rules as any}
      categories={categories}
      userRole={user.role}
    />
  );
}
