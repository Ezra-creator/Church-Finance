import React from "react";
import { requireUser } from "@/server/guards";
import { getAuditLogs, getDistinctAuditEntityTypes } from "@/features/audit/queries";
import { RuleHeading } from "@/components/ui/rule-heading";
import { AuditTable } from "@/features/audit/components/audit-table";

export const metadata = {
  title: "Audit Trail — PUCA Finance",
};

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    actorId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requireUser();
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const pageSize = resolvedParams.pageSize ? parseInt(resolvedParams.pageSize, 10) : 20;

  const [auditData, entityTypes] = await Promise.all([
    getAuditLogs({
      page,
      pageSize,
      actorId: resolvedParams.actorId,
      entityType: resolvedParams.entityType,
      startDate: resolvedParams.startDate,
      endDate: resolvedParams.endDate,
    }),
    getDistinctAuditEntityTypes(),
  ]);

  return (
    <div className="space-y-8">
      <RuleHeading
        eyebrow="Immutable Records"
        title="Audit Log"
        description="Chronological ledger of system modifications, authorization changes, and financial events."
      />

      <AuditTable
        items={auditData.items}
        total={auditData.total}
        currentPage={auditData.page}
        totalPages={auditData.totalPages}
        entityTypes={entityTypes}
      />
    </div>
  );
}
