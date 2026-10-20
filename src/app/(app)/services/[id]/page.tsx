import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { getServiceRecord } from "@/features/services/queries";
import { ServiceCountView } from "@/features/counting/components/service-count-view";

export const metadata = {
  title: "Service Count & Tithe Register — PUCA Finance",
};

export default async function ServiceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [record, denominations, categories, members] = await Promise.all([
    getServiceRecord(id),
    prisma.denomination.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.givingCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.member.findMany({
      orderBy: { fullName: "asc" },
    }),
  ]);

  if (!record) {
    notFound();
  }

  // Format initial sheets
  const initialSheets = record.countSheets.map((sheet) => ({
    id: sheet.id,
    categoryId: sheet.categoryId,
    total: sheet.total.toFixed(2),
    lines: sheet.lines.map((line) => ({
      denominationId: line.denominationId,
      quantity: line.quantity,
      lineTotal: line.lineTotal.toFixed(2),
    })),
  }));

  // Format initial giving entries
  const initialGivingEntries = record.givingEntries.map((entry) => ({
    id: entry.id,
    categoryId: entry.categoryId,
    memberId: entry.memberId,
    payerName: entry.payerName,
    amount: entry.amount.toFixed(2),
    receiptId: entry.receiptId,
    receiptNumber: entry.receipt?.number || null,
    member: entry.member
      ? {
          id: entry.member.id,
          fullName: entry.member.fullName,
          memberNumber: entry.member.memberNumber,
          phone: entry.member.phone,
        }
      : null,
  }));

  return (
    <ServiceCountView
      serviceRecord={{
        id: record.id,
        serviceDate: record.serviceDate.toISOString(),
        serviceType: record.serviceType,
        title: record.title,
        status: record.status,
        witnessName: record.witnessName,
        countedBy: record.countedBy,
      }}
      denominations={denominations.map((d) => ({
        id: d.id,
        value: d.value.toFixed(2),
        kind: d.kind,
        sortOrder: d.sortOrder,
      }))}
      categories={categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        sortOrder: c.sortOrder,
      }))}
      initialSheets={initialSheets}
      initialGivingEntries={initialGivingEntries}
      initialMembers={members}
      userRole={user.role}
    />
  );
}
