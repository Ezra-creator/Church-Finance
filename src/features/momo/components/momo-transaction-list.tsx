"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, MomoTransactionStatus } from "@prisma/client";
import {
  Upload,
  Tag,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Check,
} from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { plural } from "@/lib/plural";
import {
  classifySingleTransactionAction,
  bulkClassifyTransactionsAction,
} from "@/features/momo/actions";

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

type TabFilter = "ALL" | "NEEDS_REVIEW" | "CLASSIFIED";

export function MomoTransactionList({
  transactions: initialTransactions,
  categories,
  needsReviewCount: initialNeedsReviewCount,
  userRole,
}: MomoTransactionListProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [transactions, setTransactions] = useState<MomoTransactionItem[]>(
    initialTransactions
  );
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");

  const canEdit =
    userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let needsReview = 0;
    let classified = 0;
    for (const tx of transactions) {
      if (tx.status === MomoTransactionStatus.NEEDS_REVIEW) {
        needsReview++;
      } else if (
        tx.status === MomoTransactionStatus.AUTO ||
        tx.status === MomoTransactionStatus.CONFIRMED
      ) {
        classified++;
      }
    }
    return {
      all: transactions.length,
      needsReview,
      classified,
    };
  }, [transactions]);

  // Filter transactions
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((tx) => {
      // Tab filter
      if (activeTab === "NEEDS_REVIEW") {
        if (tx.status !== MomoTransactionStatus.NEEDS_REVIEW) return false;
      } else if (activeTab === "CLASSIFIED") {
        if (
          tx.status !== MomoTransactionStatus.AUTO &&
          tx.status !== MomoTransactionStatus.CONFIRMED
        )
          return false;
      }

      // Category dropdown filter
      if (selectedCategory !== "ALL") {
        if (!tx.category || tx.category.id !== selectedCategory) return false;
      }

      // Search query filter
      if (q) {
        const counterparty = (
          tx.member?.fullName ||
          tx.counterpartyName ||
          tx.counterpartyPhone ||
          ""
        ).toLowerCase();
        const ref = (tx.externalRef || "").toLowerCase();
        const desc = (tx.rawDescription || "").toLowerCase();
        if (
          !counterparty.includes(q) &&
          !ref.includes(q) &&
          !desc.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, selectedCategory, searchQuery]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((tx) => tx.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Inline category update
  const handleInlineClassify = (txId: string, catId: string) => {
    if (!canEdit || !catId) return;

    startTransition(async () => {
      const res = await classifySingleTransactionAction({
        transactionId: txId,
        categoryId: catId,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      const targetCat = categories.find((c) => c.id === catId);
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id === txId) {
            return {
              ...tx,
              status: MomoTransactionStatus.CONFIRMED,
              category: targetCat
                ? { id: targetCat.id, name: targetCat.name, code: targetCat.code }
                : tx.category,
            };
          }
          return tx;
        })
      );
      addToast("success", "Payment classified");
    });
  };

  // Bulk classify
  const handleBulkApplyCategory = () => {
    if (!canEdit || !bulkCategoryId || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const res = await bulkClassifyTransactionsAction({
        transactionIds: ids,
        categoryId: bulkCategoryId,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      const targetCat = categories.find((c) => c.id === bulkCategoryId);
      setTransactions((prev) =>
        prev.map((tx) => {
          if (selectedIds.has(tx.id)) {
            return {
              ...tx,
              status: MomoTransactionStatus.CONFIRMED,
              category: targetCat
                ? { id: targetCat.id, name: targetCat.name, code: targetCat.code }
                : tx.category,
            };
          }
          return tx;
        })
      );

      addToast(
        "success",
        `Updated ${plural(ids.length, "payment", "payments")}`
      );
      setSelectedIds(new Set());
      setBulkCategoryId("");
    });
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1280px] 2xl:max-w-[1440px] w-full space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-text leading-[34px]">
            Mobile money
          </h1>
          <p className="text-[14px] text-muted leading-[20px] mt-0.5">
            Assembly mobile money payments, automatic classification, and review.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/money/momo/rules">
            <Button variant="secondary" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Rules
            </Button>
          </Link>

          <Link href="/money/momo/review">
            <Button variant="secondary" size="sm">
              <Tag className="w-4 h-4 mr-1.5" />
              Needs review
              {tabCounts.needsReview > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-warn-tint text-warn-ink font-semibold rounded-control text-[12px] num">
                  {tabCounts.needsReview}
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
      </div>

      {/* Filter Row: Segmented Tab Bar + Search + Category Select */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Segmented Control */}
        <div className="inline-flex p-1 bg-surface border border-border rounded-control self-start">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              activeTab === "ALL"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            All <span className="num ml-1">({tabCounts.all})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NEEDS_REVIEW")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              activeTab === "NEEDS_REVIEW"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Needs a category{" "}
            <span className="num ml-1">({tabCounts.needsReview})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CLASSIFIED")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              activeTab === "CLASSIFIED"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Classified <span className="num ml-1">({tabCounts.classified})</span>
          </button>
        </div>

        {/* Search and Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search counterparty or reference..."
              className="w-full h-[40px] pl-9 pr-3 bg-surface border border-border-strong rounded-control text-[14px] text-text placeholder:text-muted focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            />
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="w-[180px]">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: "ALL", label: "All categories" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Transaction Table */}
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
          title="No matching payments found"
          description="Try adjusting your tab, category filter, or search keywords."
          actionLabel="Clear filters"
          onAction={() => {
            setActiveTab("ALL");
            setSelectedCategory("ALL");
            setSearchQuery("");
          }}
        />
      ) : (
        <div className="border border-border rounded-panel bg-surface overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium text-muted bg-hover/50">
                {canEdit && (
                  <th className="py-3 px-4 w-10">
                    <Checkbox
                      checked={
                        selectedIds.size === filtered.length &&
                        filtered.length > 0
                      }
                      onChange={handleSelectAll}
                      aria-label="Select all payments"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Counterparty / Reference</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[14px]">
              {filtered.map((tx) => {
                const txDate = new Date(tx.occurredAt);
                const isOut = tx.direction === "OUT";
                const isSelected = selectedIds.has(tx.id);

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-hover transition-colors ${
                      isSelected ? "bg-hover/80" : ""
                    }`}
                  >
                    {canEdit && (
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tx.id)}
                          aria-label={`Select payment from ${
                            tx.counterpartyName || "Unknown"
                          }`}
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-text font-medium text-[13px]">
                        {formatAccraDate(txDate, {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                      <div className="text-[12px] text-muted num">
                        {txDate.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-text">
                          {tx.member?.fullName ||
                            tx.counterpartyName ||
                            tx.counterpartyPhone ||
                            "Unknown Counterparty"}
                        </span>
                        {tx.member && (
                          <Badge variant="neutral">Member</Badge>
                        )}
                      </div>
                      <div className="text-[12px] text-muted truncate max-w-sm">
                        {tx.externalRef && (
                          <span className="font-medium num mr-1.5">
                            ref:{tx.externalRef}
                          </span>
                        )}
                        <span>{tx.rawDescription}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 min-w-[180px]">
                      {canEdit ? (
                        <select
                          value={tx.category?.id || ""}
                          onChange={(e) =>
                            handleInlineClassify(tx.id, e.target.value)
                          }
                          disabled={isPending}
                          className="w-full h-[36px] px-2 bg-surface border border-border rounded-control text-[13px] text-text focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand cursor-pointer"
                        >
                          <option value="" disabled>
                            Select category...
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[13px] text-text font-medium">
                          {tx.category?.name || "Uncategorized"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div
                        className={`text-[15px] font-semibold num ${
                          isOut ? "text-bad-ink" : "text-text"
                        }`}
                      >
                        {isOut ? "-" : ""}
                        {formatMoney(tx.amount.toString())}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Bottom Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-sidebar bg-surface border-t border-border p-4 z-30 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-text num">
              {plural(selectedIds.size, "payment", "payments")} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-muted text-[13px]"
            >
              Clear selection
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-[200px]">
              <Select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                options={[
                  { value: "", label: "Assign category..." },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <Button
              variant="primary"
              disabled={!bulkCategoryId || isPending}
              onClick={handleBulkApplyCategory}
            >
              {isPending ? "Applying..." : "Apply category"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
