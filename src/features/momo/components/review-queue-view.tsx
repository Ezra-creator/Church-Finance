"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import {
  Tag,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  SkipForward,
  BookmarkCheck,
  Check,
  Layers,
} from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatCedi } from "@/lib/money";
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

  // Active item for side panel and mobile single view
  const currentItem: ReviewQueueItem | undefined = queue[selectedIndex] || queue[0];

  // Handle single classification
  const handleClassify = (transactionId: string, categoryId: string, remember: boolean) => {
    if (!canClassify) return;

    startTransition(async () => {
      const res = await classifySingleTransactionAction({
        transactionId,
        categoryId,
        rememberRule: remember,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      const catName = categories.find((c) => c.id === categoryId)?.name || "Category";
      addToast(
        "success",
        remember ? `Classified as ${catName} and learned rule.` : `Classified as ${catName}.`
      );

      // Remove from queue
      setQueue((prev) => {
        const next = prev.filter((item) => item.id !== transactionId);
        if (selectedIndex >= next.length) {
          setSelectedIndex(Math.max(0, next.length - 1));
        }
        return next;
      });

      // Clear from bulk selection if present
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });

      // Reset remember wording for next transaction
      setRememberWording(false);
    });
  };

  // Handle bulk classification
  const handleBulkClassify = () => {
    if (!canClassify || selectedIds.size === 0 || !bulkCategoryId) return;

    startTransition(async () => {
      const idsToClassify = Array.from(selectedIds);
      const res = await bulkClassifyTransactionsAction({
        transactionIds: idsToClassify,
        categoryId: bulkCategoryId,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      const catName = categories.find((c) => c.id === bulkCategoryId)?.name || "Category";
      addToast("success", `Classified ${res.data.count} transactions as ${catName}.`);

      // Remove classified from queue
      setQueue((prev) => {
        const next = prev.filter((item) => !selectedIds.has(item.id));
        setSelectedIndex(0);
        return next;
      });

      setSelectedIds(new Set());
    });
  };

  // Toggle selection for bulk classify
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

  // Skip current
  const handleSkip = () => {
    if (queue.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % queue.length);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Running Count */}
      <RuleHeading
        eyebrow="Review Queue"
        title="Needs a label"
        description="Transactions requiring human classification due to zero matching rules or conflicting patterns."
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-ink/[0.04] border border-rule rounded-[2px]">
              <span className="w-2 h-2 rounded-[1px] bg-attention" />
              <span className="text-xs font-mono tabular-nums font-semibold text-attention">
                {queue.length} left
              </span>
            </div>
            <Link href="/money/momo">
              <Button variant="quiet" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to register
              </Button>
            </Link>
          </div>
        }
      />

      {/* Empty State when queue is empty */}
      {queue.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="Every Mobile Money payment has been classified. New transactions from future statement imports will appear here if they require review."
          action={
            <Link href="/money/momo">
              <Button variant="secondary">Return to MoMo register</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* MOBILE VIEW (Screen < lg): One transaction at a time */}
          <div className="block lg:hidden space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-ink-soft pb-2 border-b border-rule">
              <span>
                Transaction <span className="text-ink font-semibold">{selectedIndex + 1}</span> of {queue.length}
              </span>
              <span className="text-attention font-semibold">{queue.length} left</span>
            </div>

            {currentItem && (
              <div className="p-5 bg-paper border border-rule rounded-[2px] space-y-5">
                {/* Large Amount in Mono */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                    Payment Amount
                  </span>
                  <div className="text-3xl font-mono tabular-nums font-bold text-ink">
                    {formatCedi(currentItem.amount.toString())}
                  </div>
                </div>

                {/* Sender & Contact Details */}
                <div className="space-y-1 pb-3 border-b border-rule">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {currentItem.member?.fullName || currentItem.counterpartyName || "Unknown Sender"}
                    </span>
                    {currentItem.member && (
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-ink/5 text-ink-soft rounded-[1px]">
                        Parish Member
                      </span>
                    )}
                  </div>
                  {currentItem.counterpartyPhone && (
                    <p className="text-xs font-mono text-ink-soft">
                      {currentItem.counterpartyPhone}
                    </p>
                  )}
                  <p className="text-xs font-mono text-ink-soft">
                    {formatAccraDate(new Date(currentItem.occurredAt), { day: "numeric", month: "short", year: "numeric" })},{" "}
                    {formatTime(currentItem.occurredAt)}
                    {currentItem.externalRef ? ` • ref:${currentItem.externalRef}` : ""}
                  </p>
                </div>

                {/* Exact Description in Quotes */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                    Statement Narration
                  </span>
                  <div className="p-3 bg-ink/[0.02] border border-rule rounded-[2px] text-sm text-ink italic leading-relaxed">
                    "{currentItem.rawDescription}"
                  </div>
                </div>

                {/* "Remember this wording" Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={rememberWording}
                    onChange={(e) => setRememberWording(e.target.checked)}
                    className="rounded-[2px] border-rule text-ink focus:ring-0"
                  />
                  <span className="text-xs font-medium text-ink">
                    Remember this wording as a rule for future imports
                  </span>
                </label>

                {/* Category Chips as Large Tap Targets */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                    Choose Giving Category:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={!canClassify || isPending}
                        onClick={() => handleClassify(currentItem.id, cat.id, rememberWording)}
                        className="min-h-[48px] px-3 py-2.5 bg-paper border border-rule hover:border-ink hover:bg-ink/[0.03] active:bg-ink active:text-paper rounded-[2px] text-left transition-colors flex flex-col justify-center"
                      >
                        <span className="text-xs font-semibold text-ink leading-tight truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono text-ink-soft uppercase">
                          {cat.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skip and Navigation Row */}
                <div className="pt-3 border-t border-rule flex items-center justify-between">
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={selectedIndex === 0}
                    onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <Button variant="secondary" size="sm" onClick={handleSkip}>
                    Skip for now
                    <SkipForward className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP VIEW (Screen >= lg): Ruled list with side panel */}
          <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Ruled Queue List */}
            <div className="col-span-7 space-y-3">
              {/* Bulk classify toolbar if items are selected */}
              {selectedIds.size > 0 && (
                <div className="p-3 bg-paper border-2 border-ink rounded-[2px] flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-ink" />
                    <span className="text-xs font-mono font-semibold text-ink">
                      {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={bulkCategoryId}
                      onChange={(e) => setBulkCategoryId(e.target.value)}
                      className="text-xs bg-paper border border-rule rounded-[2px] px-2 py-1.5 text-ink font-mono focus:outline-none focus:border-ink"
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
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Classify selected
                    </Button>
                  </div>
                </div>
              )}

              {/* Header Row */}
              <div className="flex items-center justify-between px-3 py-2 border-b-2 border-rule-strong bg-ink/[0.01]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === queue.length}
                    onChange={toggleSelectAll}
                    className="rounded-[2px] border-rule text-ink focus:ring-0"
                    title="Select all"
                  />
                  <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
                    Transaction / Description
                  </span>
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-ink-soft text-right">
                  Amount
                </span>
              </div>

              {/* Ruled list items */}
              <div className="divide-y divide-rule border border-rule rounded-[2px] bg-paper">
                {queue.map((item, index) => {
                  const isSelectedInList = index === selectedIndex;
                  const isChecked = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelectedInList
                          ? "bg-ink/[0.04] border-l-2 border-l-ink"
                          : "hover:bg-ink/[0.015]"
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
                          className="rounded-[2px] border-rule text-ink focus:ring-0 flex-shrink-0"
                        />

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink truncate">
                              {item.member?.fullName || item.counterpartyName || item.counterpartyPhone || "Unknown"}
                            </span>
                            {item.member && (
                              <span className="text-[9px] font-mono px-1 py-0.2 bg-ink/5 text-ink-soft rounded-[1px]">
                                Member
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-soft truncate italic max-w-sm">
                            "{item.rawDescription}"
                          </p>
                          <p className="text-[10px] font-mono text-ink-soft">
                            {formatAccraDate(new Date(item.occurredAt), { day: "numeric", month: "short" })},{" "}
                            {formatTime(item.occurredAt)}
                          </p>
                        </div>
                      </div>

                      <div className="font-mono text-sm tabular-nums font-semibold text-ink text-right flex-shrink-0">
                        {formatCedi(item.amount.toString())}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Columns: Side Panel */}
            <div className="col-span-5 sticky top-6">
              {currentItem && (
                <div className="p-5 bg-paper border border-rule rounded-[2px] space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-rule">
                    <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
                      Transaction Focus
                    </span>
                    <span className="text-xs font-mono text-attention font-semibold">
                      {selectedIndex + 1} of {queue.length}
                    </span>
                  </div>

                  {/* Large Amount */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                      Payment Amount
                    </span>
                    <div className="text-3xl font-mono tabular-nums font-bold text-ink">
                      {formatCedi(currentItem.amount.toString())}
                    </div>
                  </div>

                  {/* Sender Details */}
                  <div className="space-y-1 pb-3 border-b border-rule">
                    <p className="text-sm font-semibold text-ink">
                      {currentItem.member?.fullName || currentItem.counterpartyName || "Unknown Sender"}
                    </p>
                    {currentItem.counterpartyPhone && (
                      <p className="text-xs font-mono text-ink-soft">
                        {currentItem.counterpartyPhone}
                      </p>
                    )}
                    <p className="text-xs font-mono text-ink-soft">
                      {formatAccraDate(new Date(currentItem.occurredAt), { day: "numeric", month: "short", year: "numeric" })},{" "}
                      {formatTime(currentItem.occurredAt)}
                      {currentItem.externalRef ? ` • ref:${currentItem.externalRef}` : ""}
                    </p>
                  </div>

                  {/* Exact Description in Quotes */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                      Statement Narration
                    </span>
                    <div className="p-3 bg-ink/[0.02] border border-rule rounded-[2px] text-xs text-ink italic leading-relaxed">
                      "{currentItem.rawDescription}"
                    </div>
                  </div>

                  {/* Remember wording checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberWording}
                      onChange={(e) => setRememberWording(e.target.checked)}
                      className="rounded-[2px] border-rule text-ink focus:ring-0"
                    />
                    <span className="text-xs font-medium text-ink">
                      Remember this wording as a rule for future imports
                    </span>
                  </label>

                  {/* Category Chips as Large Tap Targets */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                      Assign Category:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={!canClassify || isPending}
                          onClick={() => handleClassify(currentItem.id, cat.id, rememberWording)}
                          className="min-h-[48px] px-3 py-2 bg-paper border border-rule hover:border-ink hover:bg-ink/[0.03] active:bg-ink active:text-paper rounded-[2px] text-left transition-colors flex flex-col justify-center"
                        >
                          <span className="text-xs font-semibold text-ink leading-tight truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-mono text-ink-soft uppercase">
                            {cat.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skip Button */}
                  <div className="pt-3 border-t border-rule flex justify-end">
                    <Button variant="quiet" size="sm" onClick={handleSkip}>
                      Skip for now
                      <SkipForward className="w-4 h-4 ml-1.5" />
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
