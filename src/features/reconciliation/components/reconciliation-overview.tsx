"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconcile"
        description="Check each week's cash and Mobile money before submitting."
        action={
          parallelRunActive ? (
            <Badge variant="neutral" label="Parallel run active" />
          ) : undefined
        }
      />

      {/* This week section */}
      {currentWeek && (
        <div className="p-6 bg-surface border border-border rounded-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-caption font-medium text-muted">
                This week
              </span>
              <h2 className="text-lead font-semibold text-text">
                {currentWeek.formattedRange}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentWeek.status === "SUBMITTED" ? (
                <Badge variant="balanced" label={`Submitted (v${currentWeek.reportVersion})`} />
              ) : currentWeek.status === "READY" ? (
                <Badge variant="balanced" label="Ready to submit" />
              ) : (
                <Badge variant="attention" label="In progress" />
              )}
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border">
            <p className="text-caption text-muted">
              {currentWeek.status === "SUBMITTED"
                ? "This week has been finalized and submitted."
                : "Verify cash and statement payments before submitting."}
            </p>

            <Link href={`/reconcile/${currentWeek.weekEnding}`}>
              <Button variant="primary">
                {currentWeek.status === "SUBMITTED"
                  ? "View submitted report"
                  : "Reconcile this week"}
                <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={1.75} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Previous Weeks Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lead font-semibold text-text">
            Previous weeks
          </h3>
          <span className="text-caption text-muted">
            {pastWeeks.length} past periods recorded
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block border border-border rounded-panel overflow-hidden bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week range</TableHead>
                <TableHead>Week ending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Expected total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastWeeks.map((week) => {
                const isSubmitted = week.status === "SUBMITTED";
                const isReady = week.status === "READY";
                return (
                  <TableRow key={week.weekEnding}>
                    <TableCell className="font-medium text-text">
                      <Link
                        href={`/reconcile/${week.weekEnding}`}
                        className="hover:underline text-text"
                      >
                        {week.formattedRange}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted text-caption">
                      {week.weekEnding}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isSubmitted ? "balanced" : isReady ? "attention" : "neutral"}
                        label={isSubmitted ? `Submitted v${week.reportVersion}` : isReady ? "Ready" : "Draft"}
                      />
                    </TableCell>
                    <TableCell className="text-right text-text font-medium tnum">
                      {week.expectedTotal ? formatCedi(week.expectedTotal) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/reconcile/${week.weekEnding}`}
                        aria-label={`View reconciliation for ${week.formattedRange}`}
                      >
                        <ArrowRight className="w-4 h-4 text-muted hover:text-text inline-block" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Stacked List */}
        <div className="sm:hidden border border-border rounded-panel divide-y divide-border bg-surface">
          {pastWeeks.map((week) => {
            const isSubmitted = week.status === "SUBMITTED";
            const isReady = week.status === "READY";
            return (
              <Link
                key={week.weekEnding}
                href={`/reconcile/${week.weekEnding}`}
                className="block p-3.5 hover:bg-page transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body font-medium text-text truncate">
                    {week.formattedRange}
                  </span>
                  <span className="text-body font-medium text-text tnum">
                    {week.expectedTotal ? formatCedi(week.expectedTotal) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-caption text-muted">
                    Week ending {week.weekEnding}
                  </span>
                  <Badge
                    variant={isSubmitted ? "balanced" : isReady ? "attention" : "neutral"}
                    label={isSubmitted ? `Submitted v${week.reportVersion}` : isReady ? "Ready" : "Draft"}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
