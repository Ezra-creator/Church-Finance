"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Role, MomoTransactionStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MoneyText } from "@/components/ui/money-text";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { plural } from "@/lib/plural";
import { classifySingleTransactionAction, bulkClassifyTransactionsAction } from "../actions";

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
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const key = monday.toISOString().slice(0, 10);
  const label = `${formatAccraDate(monday, { day: "numeric", month: "short" })} · ${formatAccraDate(sunday, { day: "numeric", month: "short", year: "numeric" })}`;
  return { key, label };
}

export function MomoTransactionList({
  transactions: initialTransactions,
  categories,
  needsReviewCount,
  userRole,
}: MomoTransactionListProps) {
  const [transactions, setTransactions] = useState<MomoTransactionItem[]>(initialTransactions);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const canEdit = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  // Status counts for segmented control using plural()
  const statusCounts = useMemo(() => {
    let review = 0;
    let auto = 0;
    let confirmed = 0;
    let ignored = 0;
    for (const tx of transactions) {
      if (tx.status === MomoTransactionStatus.NEEDS_REVIEW) review++;
      else if (tx.status === MomoTransactionStatus.AUTO) auto++;
      else if (tx.status === MomoTransactionStatus.CONFIRMED) confirmed++;
      else if (tx.status === MomoTransactionStatus.IGNORED) ignored++;
    }
    return {
      all: transactions.length,
      review,
      auto,
      confirmed,
      ignored,
    };
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = tx.counterpartyName?.toLowerCase().includes(q);
        const matchesPhone = tx.counterpartyPhone?.toLowerCase().includes(q);
        const matchesRef = tx.externalRef?.toLowerCase().includes(q);
        const matchesDesc = tx.rawDescription.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesRef && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedStatus, selectedCategory, searchQuery]);

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

    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    for (const key of sortedKeys) {
      const val = map.get(key)!;
      groups.push({ key, label: val.label, items: val.items });
    }

    return groups;
  }, [filtered]);

  // Optimistic inline category assignment with rollback
  const handleCategoryChange = (txId: string, newCategoryId: string) => {
    const original = [...transactions];
    const targetCat = categories.find((c) => c.id === newCategoryId);

    // Optimistic update
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? {
              ...tx,
              category: targetCat || null,
              status: MomoTransactionStatus.CONFIRMED,
            }
          : tx
      )
    );

    startTransition(async () => {
      const res = await classifySingleTransactionAction({
        transactionId: txId,
        categoryId: newCategoryId,
      });

      if (!res.success) {
        // Rollback
        setTransactions(original);
        addToast("error", res.error.message);
      } else {
        addToast("success", "Category assigned and confirmed");
      }
    });
  };

  // Bulk category assign
  const handleBulkAssign = () => {
    if (!bulkCategoryId || selectedIds.length === 0) return;

    const original = [...transactions];
    const targetCat = categories.find((c) => c.id === bulkCategoryId);

    setTransactions((prev) =>
      prev.map((tx) =>
        selectedIds.includes(tx.id)
          ? {
              ...tx,
              category: targetCat || null,
              status: MomoTransactionStatus.CONFIRMED,
            }
          : tx
      )
    );

    const idsToUpdate = [...selectedIds];
    setSelectedIds([]);

    startTransition(async () => {
      const res = await bulkClassifyTransactionsAction({
        transactionIds: idsToUpdate,
        categoryId: bulkCategoryId,
      });
      if (!res.success) {
        setTransactions(original);
        addToast("error", res.error.message);
      } else {
        addToast("success", `${plural(idsToUpdate.length, "payment")} updated`);
      }
    });
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((t) => t.id));
    }
  };

  const getStatusBadge = (status: MomoTransactionStatus) => {
    switch (status) {
      case MomoTransactionStatus.CONFIRMED:
      case MomoTransactionStatus.AUTO:
        return <Badge variant="Balanced">Confirmed</Badge>;
      case MomoTransactionStatus.NEEDS_REVIEW:
        return <Badge variant="Needs attention">Needs review</Badge>;
      default:
        return <Badge variant="Neutral">Ignored</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <PageHeader
        title="Mobile money"
        description="Mobile money statements and automatic payment classification."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/money/momo/rules">
              <Button variant="secondary" size="sm">
                Rules
              </Button>
            </Link>

            <Link href="/money/momo/review">
              <Button
                variant={needsReviewCount > 0 ? "secondary" : "ghost"}
                size="sm"
              >
                Needs review {needsReviewCount > 0 ? `(${needsReviewCount})` : ""}
              </Button>
            </Link>

            {canEdit && (
              <Link href="/money/momo/import">
                <Button variant="primary" size="sm">
                  Import statement
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Segmented control with counts via plural() */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          value={selectedStatus}
          onChange={(v) => setSelectedStatus(v)}
          options={[
            { value: "ALL", label: `All (${plural(statusCounts.all, "transaction")})` },
            {
              value: MomoTransactionStatus.NEEDS_REVIEW,
              label: `Needs review (${plural(statusCounts.review, "transaction")})`,
            },
            {
              value: MomoTransactionStatus.CONFIRMED,
              label: `Confirmed (${plural(statusCounts.confirmed + statusCounts.auto, "transaction")})`,
            },
            {
              value: MomoTransactionStatus.IGNORED,
              label: `Ignored (${plural(statusCounts.ignored, "transaction")})`,
            },
          ]}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface border border-border rounded-panel">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Field */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by payer, phone or ref..."
              className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-control text-body text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 bg-surface border border-border rounded-control text-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="ALL">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-caption text-muted">
          Showing {plural(filtered.length, "payment")}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && canEdit && (
        <div className="p-3 bg-hover border border-border rounded-panel flex flex-wrap items-center justify-between gap-3">
          <span className="text-label font-medium text-text">
            {plural(selectedIds.length, "payment")} selected
          </span>

          <div className="flex items-center gap-2">
            <select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="h-9 px-3 bg-surface border border-border rounded-control text-label text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Assign category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="sm"
              disabled={!bulkCategoryId || isPending}
              onClick={handleBulkAssign}
            >
              Apply
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Grouped Table by Week */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions match this filter"
          description="Adjust your search criteria or import statements from your mobile money provider."
        />
      ) : (
        <div className="space-y-6">
          {groupedByWeek.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lead font-semibold text-text">
                  Week of {group.label}
                </h3>
                <span className="text-caption text-muted">
                  {plural(group.items.length, "payment")}
                </span>
              </div>

              <div className="border border-border rounded-panel bg-surface overflow-hidden divide-y divide-border">
                {group.items.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-hover transition-colors duration-120"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {canEdit && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="mt-1 w-4 h-4 rounded-control border-border text-accent focus-visible:ring-accent"
                          aria-label={`Select transaction ${tx.externalRef || tx.id}`}
                        />
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body font-medium text-text">
                            {tx.counterpartyName || "Anonymous payer"}
                          </span>
                          {tx.counterpartyPhone && (
                            <span className="text-caption text-muted tnum tabular-nums">
                              {tx.counterpartyPhone}
                            </span>
                          )}
                          {getStatusBadge(tx.status)}
                        </div>

                        <p className="text-caption text-muted truncate">
                          {tx.rawDescription}
                        </p>
                        {tx.externalRef && (
                          <span className="text-caption text-muted block tnum tabular-nums">
                            Ref: {tx.externalRef}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0">
                      {/* Inline Category Select */}
                      {canEdit ? (
                        <select
                          value={tx.category?.id || ""}
                          onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                          className="h-9 px-2.5 bg-surface border border-border rounded-control text-caption text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          aria-label="Assign giving category"
                        >
                          <option value="">Select category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-body text-muted">
                          {tx.category?.name || "Uncategorized"}
                        </span>
                      )}

                      <div className="text-right">
                        <div className="text-body font-semibold text-text tnum tabular-nums">
                          <MoneyText amount={tx.amount.toString()} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
