import React from "react";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { formatAccraDate, nowUtc } from "@/lib/dates";
import { RuleHeading } from "@/components/ui/rule-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusMark } from "@/components/ui/status-mark";
import { Role } from "@prisma/client";

export const metadata = {
  title: "Today's Service — PUCA Finance",
};

export default async function TodayPage() {
  const user = await requireUser();
  const todayStr = formatAccraDate(nowUtc(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [denominations, categories] = await Promise.all([
    prisma.denomination.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.givingCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const canStartCount = user.role === Role.FINANCE_SECRETARY;

  return (
    <div className="space-y-10">
      {/* Ledger Header */}
      <RuleHeading
        eyebrow={todayStr}
        title="Today's Service"
        description="Daily offering collections and verified count entries."
        action={
          canStartCount ? (
            <Button variant="primary">
              Begin new count
            </Button>
          ) : undefined
        }
      />

      {/* Honest Empty State: No Mock Data */}
      <EmptyState
        title="No offering counts recorded today"
        description="Physical cash counts have not been submitted for today's service. The Finance Secretary initiates counts after the service collection concludes."
        action={
          canStartCount ? (
            <Button variant="secondary">
              Prepare offering count
            </Button>
          ) : (
            <span className="text-xs text-ink-soft font-mono">
              Waiting for Finance Secretary to begin collection
            </span>
          )
        }
      />

      {/* Reference Data Overview */}
      <div className="space-y-6 pt-6 border-t border-rule">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-soft">
            Active Giving Categories ({categories.length})
          </h2>
          <div className="mt-3 border border-rule rounded-[2px] divide-y divide-rule bg-paper">
            {categories.map((cat) => (
              <LedgerRow
                key={cat.id}
                label={cat.name}
                detail={`Code: ${cat.code}`}
                right={<StatusMark tone="balanced" label="Active" />}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-soft">
            Configured Denominations ({denominations.length})
          </h2>
          <div className="mt-3 border border-rule rounded-[2px] divide-y divide-rule bg-paper">
            {denominations.map((denom) => (
              <LedgerRow
                key={denom.id}
                label={`GH₵ ${denom.value.toFixed(2)}`}
                detail={`Kind: ${denom.kind}`}
                right={<StatusMark tone="neutral" label={`Order ${denom.sortOrder}`} />}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
