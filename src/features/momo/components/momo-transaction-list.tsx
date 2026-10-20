"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Role, MomoTransactionStatus } from "@prisma/client";
import { Upload, Tag, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, ShieldAlert } from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { StatusMark, StatusTone } from "@/components/ui/status-mark";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAccraDate } from "@/lib/dates";
import { formatCedi } from "@/lib/money";

export interface MomoTransactionItem {
  id: string;
  occurredAt: Date | string;
  direction: "IN" | "OUT";
  amount: string | number | { toString: () => string };
  externalRef: string | null;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  rawDescription: string;
  status: MomoTransactionStatus;
  category: { id: string; name: string; code: string } | null;
  member: { id: string; fullName: string } | null;
  matchedRule: { id: string; pattern: string } | null;
}

export interface MomoTransactionListProps {
  transactions: MomoTransactionItem[];
  categories: Array<{ id: string; name: string; code: string }>;
  needsReviewCount: number;
  userRole: Role;
}

function getWeekKeyAndLabel(dateObj: Date): { key: string; label: string } {
  const d = new Date(dateObj);
  // Normalize to Monday of this week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const key = monday.toISOString().slice(0, 10);
  const label = `${formatAccraDate(monday, { day: "numeric", month: "short" })} – ${formatAccraDate(sunday, { day: "numeric", month: "short", year: "numeric" })}`;
  return { key, label };
}

function formatTime(dateObj: Date | string): string {
  const d = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function MomoTransactionList({
  transactions,
  categories,
  needsReviewCount,
  userRole,
}: MomoTransactionListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedWeek, setSelectedWeek] = useState<string>("ALL");

  const canEdit = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  // Compute all available weeks for filtering
  const availableWeeks = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) {
      const { key, label } = getWeekKeyAndLabel(new Date(tx.occurredAt));
      if (!map.has(key)) {
        map.set(key, label);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedStatus !== "ALL" && tx.status !== selectedStatus) {
        return false;
      }
      if (selectedCategory !== "ALL") {
        if (!tx.category || tx.category.id !== selectedCategory) {
          return false;
        }
      }
      if (selectedWeek !== "ALL") {
        const { key } = getWeekKeyAndLabel(new Date(tx.occurredAt));
        if (key !== selectedWeek) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedStatus, selectedCategory, selectedWeek]);

  // Group filtered transactions by week
  const groupedByWeek = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: MomoTransactionItem[] }> = [];
    const map = new Map<string, { label: string; items: MomoTransactionItem[] }>();

    for (const tx of filtered) {
      const { key, label } = getWeekKeyAndLabel(new Date(tx.occurredAt));
      let entry = map.get(key);
      if (!entry) {
        entry = { label, items: [] };
        map.set(key, entry);
      }
      entry.items.push(tx);
    }

    // Sort groups descending by week key
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    for (const key of sortedKeys) {
      const val = map.get(key)!;
      groups.push({ key, label: val.label, items: val.items });
    }

    return groups;
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <RuleHeading
        eyebrow="Mobile Money Ledger"
        title="MoMo Statements & Register"
        description="Parish mobile money statements, automatic payment classification and review register."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/money/momo/rules">
              <Button variant="secondary" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                Rules
              </Button>
            </Link>

            <Link href="/money/momo/review">
              <Button
                variant={needsReviewCount > 0 ? "secondary" : "quiet"}
                size="sm"
                className={needsReviewCount > 0 ? "border-attention text-attention font-medium" : ""}
              >
                <Tag className="w-4 h-4 mr-1.5" />
                Needs review
                {needsReviewCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-attention/15 text-attention font-mono rounded-[1px] text-xs">
                    {needsReviewCount}
                  </span>
                )}
              </Button>
            </Link>

            {canEdit && (
              <Link href="/money/momo/import">
                <Button variant="primary" size="sm">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Import statement
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-ink/[0.02] border border-rule rounded-[2px]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider text-ink-soft font-mono">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-paper border border-rule rounded-[2px] px-2 py-1 text-ink focus:outline-none focus:border-ink font-mono"
            >
              <option value="ALL">All statuses</option>
              <option value={MomoTransactionStatus.NEEDS_REVIEW}>Needs Review</option>
              <option value={MomoTransactionStatus.AUTO}>Auto-Classified</option>
              <option value={MomoTransactionStatus.CONFIRMED}>Confirmed</option>
              <option value={MomoTransactionStatus.IGNORED}>Ignored</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider text-ink-soft font-mono">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-paper border border-rule rounded-[2px] px-2 py-1 text-ink focus:outline-none focus:border-ink font-mono max-w-[160px] truncate"
            >
              <option value="ALL">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Week filter */}
          {availableWeeks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider text-ink-soft font-mono">Week:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="text-xs bg-paper border border-rule rounded-[2px] px-2 py-1 text-ink focus:outline-none focus:border-ink font-mono"
              >
                <option value="ALL">All weeks</option>
                {availableWeeks.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-xs font-mono text-ink-soft text-right tabular-nums">
          {filtered.length} of {transactions.length} rows
        </div>
      </div>

      {/* Ruled Transaction List Grouped By Week */}
      {transactions.length === 0 ? (
        <EmptyState
          title="No Mobile Money transactions"
          description="Statements have not been imported yet. Upload an MTN MoMo or Vodafone Cash statement to begin automatic classification."
          action={
            canEdit ? (
              <Link href="/money/momo/import">
                <Button variant="primary">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Import statement
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching transactions"
          description="No transactions match the selected status, category or week filters. Try resetting the filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedStatus("ALL");
                setSelectedCategory("ALL");
                setSelectedWeek("ALL");
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {groupedByWeek.map((group) => (
            <div key={group.key} className="space-y-1">
              {/* Week header rule */}
              <div className="flex items-center justify-between pb-2 border-b-2 border-rule-strong">
                <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-ink-soft">
                  {group.label}
                </h3>
                <span className="text-xs font-mono text-ink-soft tabular-nums">
                  {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* Transactions in this week */}
              <div className="divide-y divide-rule">
                {group.items.map((tx) => {
                  const txDate = new Date(tx.occurredAt);
                  const isOut = tx.direction === "OUT";

                  let tone: StatusTone = "neutral";
                  let statusLabel = "Uncategorized";

                  if (tx.status === MomoTransactionStatus.NEEDS_REVIEW) {
                    tone = "attention";
                    statusLabel = "Needs Label";
                  } else if (tx.status === MomoTransactionStatus.IGNORED) {
                    tone = "neutral";
                    statusLabel = "Ignored";
                  } else if (tx.category) {
                    tone = tx.status === MomoTransactionStatus.AUTO ? "balanced" : "balanced";
                    statusLabel = tx.category.name;
                  }

                  const counterparty =
                    tx.member?.fullName ||
                    tx.counterpartyName ||
                    tx.counterpartyPhone ||
                    "Unknown Counterparty";

                  return (
                    <div
                      key={tx.id}
                      className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-ink/[0.015] transition-colors"
                    >
                      {/* Left: Date, Time & Counterparty */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Direction icon */}
                        <div
                          className={`mt-0.5 sm:mt-0 p-1 rounded-[1px] flex-shrink-0 ${
                            isOut
                              ? "bg-variance/10 text-variance"
                              : "bg-balanced/10 text-balanced"
                          }`}
                          title={isOut ? "Outgoing payment" : "Incoming payment"}
                        >
                          {isOut ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-ink truncate">
                              {counterparty}
                            </span>
                            {tx.member && (
                              <span className="text-[10px] font-mono px-1 py-0.2 bg-ink/5 text-ink-soft rounded-[1px]">
                                Member
                              </span>
                            )}
                            {tx.externalRef && (
                              <span className="text-[10px] font-mono text-ink-soft truncate">
                                ref:{tx.externalRef}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-ink-soft truncate">
                            <span className="font-mono tabular-nums">
                              {formatAccraDate(txDate, { day: "numeric", month: "short" })},{" "}
                              {formatTime(txDate)}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[280px] sm:max-w-md italic">
                              {`"${tx.rawDescription}"`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Category Mark & Amount in Mono Right-Aligned */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 pl-7 sm:pl-0">
                        <StatusMark tone={tone} label={statusLabel} />

                        <div
                          className={`font-mono text-sm tabular-nums text-right font-semibold ${
                            isOut ? "text-ink-soft" : "text-ink"
                          }`}
                        >
                          {isOut ? `-${formatCedi(tx.amount.toString())}` : formatCedi(tx.amount.toString())}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
