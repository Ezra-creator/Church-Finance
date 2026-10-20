"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { Scale, ArrowRight, CheckCircle2, FileText, ToggleLeft, ToggleRight, Download } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { StatusMark, StatusTone } from "@/components/ui/status-mark";
import { formatCedi } from "@/lib/money";
import { useToast } from "@/components/ui/toast";
import { WeekOverviewItem } from "../queries";
import { toggleParallelRunSettingAction } from "../actions";

export interface ReconciliationOverviewProps {
  currentWeekEnding: string;
  weeks: WeekOverviewItem[];
  userRole: Role;
  parallelRunActive: boolean;
}

export function ReconciliationOverview({
  currentWeekEnding,
  weeks,
  userRole,
  parallelRunActive,
}: ReconciliationOverviewProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isSecretaryOrTreasurer =
    userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  const currentWeek = weeks.find((w) => w.isCurrentWeek) || weeks[0];
  const pastWeeks = weeks.filter((w) => !w.isCurrentWeek);

  const handleToggleParallelRun = () => {
    if (!isSecretaryOrTreasurer) return;

    startTransition(async () => {
      const res = await toggleParallelRunSettingAction(!parallelRunActive);
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      addToast(
        "success",
        res.data.parallelRunActive
          ? "Parallel run active: paper book comparison field enabled."
          : "Parallel run retired: digital ledger operating standalone."
      );
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <RuleHeading
        eyebrow="Weekly Accounts Reconciliation"
        title="Presbytery Reconciliation Register"
        description="Consolidate physical cash counts and classified Mobile Money collections into weekly audited financial reports."
        action={
          isSecretaryOrTreasurer ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleParallelRun}
                disabled={isPending}
                className="text-xs font-mono px-2.5 py-1 rounded-[2px] border border-rule hover:border-ink bg-paper flex items-center gap-1.5 transition-colors"
                title="Toggle paper book comparison field"
              >
                {parallelRunActive ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-balanced" />
                    <span>Parallel run active</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-ink-soft" />
                    <span>Standalone ledger</span>
                  </>
                )}
              </button>
            </div>
          ) : undefined
        }
      />

      {/* CURRENT WEEK BANNER */}
      {currentWeek && (
        <div className="p-6 bg-paper border-2 border-ink rounded-[2px] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink-soft font-semibold">
                Current Week Range
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-normal text-ink">
                {currentWeek.formattedRange}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentWeek.status === "SUBMITTED" ? (
                <StatusMark
                  tone="balanced"
                  label={`Submitted (v${currentWeek.reportVersion})`}
                />
              ) : currentWeek.status === "READY" ? (
                <StatusMark tone="balanced" label="Ready to submit" />
              ) : (
                <StatusMark tone="attention" label="Reconciliation in progress" />
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rule">
            <p className="text-xs text-ink-soft">
              {currentWeek.status === "SUBMITTED"
                ? "This week has been finalized and submitted to the presbytery."
                : "Count cash, classify statement payments, and verify totals before submission."}
            </p>

            <Link href={`/reconcile/${currentWeek.weekEnding}`}>
              <Button variant="primary">
                {currentWeek.status === "SUBMITTED"
                  ? "View submitted return"
                  : "Reconcile current week"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* PAST WEEKS RULED LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b-2 border-rule-strong">
          <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-ink-soft">
            Previous Weeks
          </h3>
          <span className="text-xs font-mono text-ink-soft">
            {pastWeeks.length} past periods recorded
          </span>
        </div>

        <div className="divide-y divide-rule border border-rule rounded-[2px] bg-paper">
          {pastWeeks.map((week) => {
            let tone: StatusTone = "neutral";
            let statusLabel = "Unopened";

            if (week.status === "SUBMITTED") {
              tone = "balanced";
              statusLabel = `Submitted v${week.reportVersion}`;
            } else if (week.status === "READY") {
              tone = "attention";
              statusLabel = "Ready";
            } else if (week.status === "DRAFT") {
              tone = "neutral";
              statusLabel = "Draft";
            }

            return (
              <Link
                key={week.weekEnding}
                href={`/reconcile/${week.weekEnding}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-ink/[0.015] transition-colors gap-2"
              >
                {/* Left: Week Range */}
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-ink truncate">
                    {week.formattedRange}
                  </p>
                  <p className="text-xs font-mono text-ink-soft">
                    Week ending {week.weekEnding}
                  </p>
                </div>

                {/* Right: Status Mark, Totals & Link */}
                <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                  <StatusMark tone={tone} label={statusLabel} />

                  {week.expectedTotal ? (
                    <div className="font-mono text-sm tabular-nums text-right font-semibold text-ink">
                      {formatCedi(week.expectedTotal)}
                    </div>
                  ) : (
                    <div className="font-mono text-xs tabular-nums text-right text-ink-soft">
                      —
                    </div>
                  )}

                  <ArrowRight className="w-4 h-4 text-ink-soft hidden sm:block" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
