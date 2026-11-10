"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { classifySingleTransactionAction, bulkClassifyTransactionsAction } from "../actions";

export interface ReviewQueueItem {
  id: string;
  occurredAt: Date | string;
  direction: "IN" | "OUT";
  amount: string | number | { toString: () => string };
  externalRef: string | null;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  rawDescription: string;
  member: { id: string; fullName: string } | null;
}

export interface ReviewQueueViewProps {
  initialQueue: ReviewQueueItem[];
  categories: Array<{ id: string; name: string; code: string }>;
  userRole: Role;
}

function formatTime(dateObj: Date | string): string {
  const d = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ReviewQueueView({
  initialQueue,
  categories,
  userRole,
}: ReviewQueueViewProps) {
  const { addToast } = useToast();
  const [queue, setQueue] = useState<ReviewQueueItem[]>(initialQueue);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rememberWording, setRememberWording] = useState<boolean>(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>(
    categories.length > 0 ? categories[0].id : ""
  );

  const [isPending, startTransition] = useTransition();

  const canClassify = userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  const currentItem: ReviewQueueItem | undefined = queue[selectedIndex] || queue[0];

  const handleClassify = (transactionId: string, categoryId: string, remember: boolean) => {
    if (!canClassify) return;

    startTransition(async () => {
      const res = await classifySingleTransactionAction({
        transactionId,
        categoryId,
        rememberRule: remember,
      });

      if (!res.success) {
        addToast({ type: "bad", message: res.error.message });
        return;
      }

      const catName = categories.find((c) => c.id === categoryId)?.name || "Category";
      addToast({
        type: "ok",
        message: remember ? `Classified as ${catName} and learned rule.` : `Classified as ${catName}.`,
      });

      setQueue((prev) => {
        const next = prev.filter((item) => item.id !== transactionId);
        if (selectedIndex >= next.length) {
          setSelectedIndex(Math.max(0, next.length - 1));
        }
        return next;
      });

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });

      setRememberWording(false);
    });
  };

  const handleBulkClassify = () => {
    if (!canClassify || selectedIds.size === 0 || !bulkCategoryId) return;

    startTransition(async () => {
      const idsToClassify = Array.from(selectedIds);
      const res = await bulkClassifyTransactionsAction({
        transactionIds: idsToClassify,
        categoryId: bulkCategoryId,
      });

      if (!res.success) {
        addToast({ type: "bad", message: res.error.message });
        return;
      }

      const catName = categories.find((c) => c.id === bulkCategoryId)?.name || "Category";
      addToast({
        type: "ok",
        message: `Classified ${res.data.count} transactions as ${catName}.`,
      });

      setQueue((prev) => {
        const next = prev.filter((item) => !selectedIds.has(item.id));
        setSelectedIndex(0);
        return next;
      });

      setSelectedIds(new Set());
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === queue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map((item) => item.id)));
    }
  };

  const handleSkip = () => {
    if (queue.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % queue.length);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Review queue"
        description="Transactions requiring human classification due to zero matching rules or conflicting patterns."
        action={
          <div className="flex items-center gap-3">
            <Badge variant="Needs attention">
              {queue.length} left
            </Badge>
            <Link href="/money/momo">
              <Button variant="ghost" size="sm">
                Back to Mobile money
              </Button>
            </Link>
          </div>
        }
      />

      {/* Empty State */}
      {queue.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="Every Mobile money payment has been classified. New transactions from future statement imports will appear here if they require review."
          action={
            <Link href="/money/momo">
              <Button variant="secondary">Back to Mobile money</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile View: One at a time */}
          <div className="block lg:hidden space-y-4">
            <div className="flex items-center justify-between text-caption text-muted pb-2 border-b border-border">
              <span>
                Transaction <span className="text-text font-medium">{selectedIndex + 1}</span> of {queue.length}
              </span>
              <Badge variant="Needs attention">{queue.length} left</Badge>
            </div>

            {currentItem && (
              <div className="p-5 bg-surface border border-border rounded-panel space-y-4">
                <div className="space-y-0.5">
                  <span className="text-caption text-muted">
                    Payment amount
                  </span>
                  <div className="text-heading font-semibold text-text tnum">
                    {formatMoney(currentItem.amount.toString())}
                  </div>
                </div>

                <div className="space-y-1 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-text">
                      {currentItem.member?.fullName || currentItem.counterpartyName || "Unknown sender"}
                    </span>
                    {currentItem.member && (
                      <span className="text-caption px-1.5 py-0.5 bg-hover text-muted rounded-control">
                        Member
                      </span>
                    )}
                  </div>
                  {currentItem.counterpartyPhone && (
                    <p className="text-caption text-muted">
                      {currentItem.counterpartyPhone}
                    </p>
                  )}
                  <p className="text-caption text-muted">
                    {formatAccraDate(new Date(currentItem.occurredAt), { day: "numeric", month: "short", year: "numeric" })},{" "}
                    {formatTime(currentItem.occurredAt)}
                    {currentItem.externalRef ? ` • ref:${currentItem.externalRef}` : ""}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-caption text-muted font-medium">
                    Statement narration
                  </span>
                  <div className="p-3 bg-hover border border-border rounded-panel text-body text-text leading-relaxed">
                    {`"${currentItem.rawDescription}"`}
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={rememberWording}
                    onChange={(e) => setRememberWording(e.target.checked)}
                    className="w-4 h-4 rounded-control border-border text-accent focus:ring-accent"
                  />
                  <span className="text-caption text-text">
                    Remember this wording as a rule for future imports
                  </span>
                </label>

                <div className="space-y-2 pt-2">
                  <span className="text-caption text-muted font-medium block">
                    Choose giving category:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={!canClassify || isPending}
                        onClick={() => handleClassify(currentItem.id, cat.id, rememberWording)}
                        className="min-h-[44px] px-3 py-2 bg-surface border border-border hover:border-border-strong hover:bg-hover rounded-control text-left transition-colors flex flex-col justify-center"
                      >
                        <span className="text-caption font-medium text-text leading-tight truncate">
                          {cat.name}
                        </span>
                        <span className="text-caption text-muted">
                          {cat.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={selectedIndex === 0}
                    onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
                  >
                    Previous
                  </Button>

                  <Button variant="secondary" size="sm" onClick={handleSkip}>
                    Skip for now
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop View: List with side panel */}
          <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Queue List */}
            <div className="col-span-7 space-y-3">
              {/* Bulk classify toolbar if items are selected */}
              {selectedIds.size > 0 && (
                <div className="p-3 bg-surface border border-border rounded-panel flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium text-text">
                      {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Category for selected transactions"
                      value={bulkCategoryId}
                      onChange={(e) => setBulkCategoryId(e.target.value)}
                      className="text-caption bg-surface border border-border rounded-control px-2.5 py-1.5 text-text focus:outline-none focus:border-border-strong"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!canClassify || isPending}
                      onClick={handleBulkClassify}
                    >
                      <Check className="w-3.5 h-3.5 mr-1 stroke-[1.75]" />
                      Classify selected
                    </Button>
                  </div>
                </div>
              )}

              {/* Header Row */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-hover rounded-t-panel">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === queue.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-control border-border text-accent focus:ring-accent"
                    title="Select all"
                  />
                  <span className="text-caption text-muted font-medium">
                    Transaction or description
                  </span>
                </div>
                <span className="text-caption text-muted font-medium text-right">
                  Amount
                </span>
              </div>

              {/* List items */}
              <div className="divide-y divide-border border border-border rounded-b-panel bg-surface">
                {queue.map((item, index) => {
                  const isSelectedInList = index === selectedIndex;
                  const isChecked = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                        isSelectedInList
                          ? "bg-accent-tint border-l-2 border-l-accent"
                          : "hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                          className="w-4 h-4 rounded-control border-border text-accent focus:ring-accent flex-shrink-0"
                        />

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-medium text-text truncate">
                              {item.member?.fullName || item.counterpartyName || item.counterpartyPhone || "Unknown"}
                            </span>
                            {item.member && (
                              <span className="text-caption px-1.5 py-0.5 bg-hover text-muted rounded-control">
                                Member
                              </span>
                            )}
                          </div>
                          <p className="text-caption text-muted truncate max-w-sm">
                            {`"${item.rawDescription}"`}
                          </p>
                          <p className="text-caption text-muted">
                            {formatAccraDate(new Date(item.occurredAt), { day: "numeric", month: "short" })},{" "}
                            {formatTime(item.occurredAt)}
                          </p>
                        </div>
                      </div>

                      <div className="text-body tabular-nums font-medium text-text text-right flex-shrink-0 tnum">
                        {formatMoney(item.amount.toString())}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Columns: Side Panel */}
            <div className="col-span-5 sticky top-6">
              {currentItem && (
                <div className="p-5 bg-surface border border-border rounded-panel space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-caption text-muted font-medium">
                      Transaction focus
                    </span>
                    <Badge variant="Needs attention">
                      {selectedIndex + 1} of {queue.length}
                    </Badge>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-caption text-muted">
                      Payment amount
                    </span>
                    <div className="text-heading font-semibold text-text tnum">
                      {formatMoney(currentItem.amount.toString())}
                    </div>
                  </div>

                  <div className="space-y-1 pb-3 border-b border-border">
                    <p className="text-body font-medium text-text">
                      {currentItem.member?.fullName || currentItem.counterpartyName || "Unknown sender"}
                    </p>
                    {currentItem.counterpartyPhone && (
                      <p className="text-caption text-muted">
                        {currentItem.counterpartyPhone}
                      </p>
                    )}
                    <p className="text-caption text-muted">
                      {formatAccraDate(new Date(currentItem.occurredAt), { day: "numeric", month: "short", year: "numeric" })},{" "}
                      {formatTime(currentItem.occurredAt)}
                      {currentItem.externalRef ? ` • ref:${currentItem.externalRef}` : ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-caption text-muted font-medium">
                      Statement narration
                    </span>
                    <div className="p-3 bg-hover border border-border rounded-panel text-caption text-text leading-relaxed">
                      {`"${currentItem.rawDescription}"`}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberWording}
                      onChange={(e) => setRememberWording(e.target.checked)}
                      className="w-4 h-4 rounded-control border-border text-accent focus:ring-accent"
                    />
                    <span className="text-caption text-text">
                      Remember this wording as a rule for future imports
                    </span>
                  </label>

                  <div className="space-y-2 pt-2">
                    <span className="text-caption text-muted font-medium block">
                      Assign category:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={!canClassify || isPending}
                          onClick={() => handleClassify(currentItem.id, cat.id, rememberWording)}
                          className="min-h-[44px] px-3 py-2 bg-surface border border-border hover:border-border-strong hover:bg-hover rounded-control text-left transition-colors flex flex-col justify-center"
                        >
                          <span className="text-caption font-medium text-text leading-tight truncate">
                            {cat.name}
                          </span>
                          <span className="text-caption text-muted">
                            {cat.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end">
                    <Button variant="ghost" size="sm" onClick={handleSkip}>
                      Skip for now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
