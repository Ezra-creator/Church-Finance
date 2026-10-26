import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { getMemberAnnualLedger, getMemberStatementHistory } from "@/features/statements/service";
import { MemberDetailView } from "@/features/members/components/member-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { fullName: true },
  });

  return {
    title: member ? `${member.fullName} — Giving Ledger` : "Member Not Found",
  };
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { year: yearParam } = await searchParams;

  const currentYear = new Date().getUTCFullYear();
  const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;

  const member = await prisma.member.findUnique({
    where: { id },
  });

  if (!member) {
    notFound();
  }

  const [ledger, statementHistory] = await Promise.all([
    getMemberAnnualLedger(member.id, selectedYear),
    getMemberStatementHistory(member.id),
  ]);

  return (
    <MemberDetailView
      member={JSON.parse(JSON.stringify(member))}
      year={selectedYear}
      months={JSON.parse(JSON.stringify(ledger.months))}
      categoryTotals={JSON.parse(JSON.stringify(ledger.categoryTotals))}
      grandTotal={ledger.grandTotal.toString()}
      statementHistory={JSON.parse(JSON.stringify(statementHistory))}
      userRole={user.role}
    />
  );
}
