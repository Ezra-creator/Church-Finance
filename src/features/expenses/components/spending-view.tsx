"use client";

import React, { useState, useMemo, useTransition } from "react";
import { Role, ExpenseStatus } from "@prisma/client";
import { Plus, Receipt, Clock, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatAccraDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { plural } from "@/lib/plural";
import { ExpenseEntrySheet, ExpenseCategoryItem } from "./expense-entry-sheet";
import { ExpenseApprovalSheet, ExpenseWithDetails } from "./expense-approval-sheet";
import { ChurchUserOption } from "@/features/deposits/components/deposit-entry-sheet";

export interface SpendingViewProps {
  expenses: any[];
  categories: ExpenseCategoryItem[];
  churchUsers: ChurchUserOption[];
  currentUser: {
    id: string;
    name: string;
    role: Role;
  };
}

export function SpendingView({
  expenses: initialExpenses,
  categories,
  churchUsers,
  currentUser,
}: SpendingViewProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isExpenseEntryOpen, setIsExpenseEntryOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isTreasurer = currentUser.role === Role.TREASURER;
  const isSecretary = currentUser.role === Role.FINANCE_SECRETARY;
  const canWrite = isSecretary || isTreasurer;

  const pendingApprovalsCount = useMemo(() => {
    return initialExpenses.filter((e) => e.status === ExpenseStatus.SUBMITTED).length;
  }, [initialExpenses]);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return initialExpenses.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (q) {
        const payee = (e.payee || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        const cat = (e.category?.name || "").toLowerCase();
        if (!payee.includes(q) && !desc.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [initialExpenses, statusFilter, searchQuery]);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1280px] 2xl:max-w-[1440px] w-full space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-text leading-[34px]">
            Spending
          </h1>
          <p className="text-[14px] text-muted leading-[20px] mt-0.5">
            Expense vouchers, disbursement approvals, and payment records.
          </p>
        </div>

        {canWrite && (
          <Button
            variant="primary"
            onClick={() => setIsExpenseEntryOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Record expense
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-surface border border-border rounded-control self-start">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "ALL"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            All <span className="num ml-1">({initialExpenses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("SUBMITTED")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "SUBMITTED"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Pending approval{" "}
            {pendingApprovalsCount > 0 && (
              <span className="num ml-1">({pendingApprovalsCount})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "APPROVED"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-control transition-colors ${
              statusFilter === "PAID"
                ? "bg-brand text-on-brand shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Paid
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payee or description..."
            className="w-full h-[40px] pl-9 pr-3 bg-surface border border-border-strong rounded-control text-[14px] text-text placeholder:text-muted focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          />
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Expenses Table */}
      {initialExpenses.length === 0 ? (
        <EmptyState
          title="No expenses recorded"
          description="Expense vouchers track disbursements for ministry operations, utilities, and services."
          actionLabel={canWrite ? "Record first expense" : undefined}
          onAction={canWrite ? () => setIsExpenseEntryOpen(true) : undefined}
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          title="No matching expenses found"
          description="Try adjusting your status filter or search query."
          actionLabel="Clear filters"
          onAction={() => {
            setStatusFilter("ALL");
            setSearchQuery("");
          }}
        />
      ) : (
        <div className="border border-border rounded-panel bg-surface overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium text-muted bg-hover/50">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payee & Purpose</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[14px]">
              {filteredExpenses.map((expense) => {
                const date = new Date(expense.createdAt);
                const statusTone =
                  expense.status === "PAID"
                    ? "balanced"
                    : expense.status === "APPROVED"
                    ? "balanced"
                    : expense.status === "SUBMITTED"
                    ? "attention"
                    : "neutral";

                return (
                  <tr
                    key={expense.id}
                    onClick={() => setSelectedExpense(expense)}
                    className="hover:bg-hover transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-text font-medium text-[13px]">
                      {formatAccraDate(date, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-medium text-text">
                        {expense.payee}
                      </div>
                      <div className="text-[12px] text-muted truncate max-w-sm">
                        {expense.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[13px] text-muted">
                      {expense.category?.name || "General"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[13px] text-muted">
                      {expense.paymentMethod || "CASH"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge tone={statusTone} label={expense.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold num text-text">
                      {formatMoney(expense.amount.toString())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense Entry Sheet */}
      <ExpenseEntrySheet
        isOpen={isExpenseEntryOpen}
        onClose={() => setIsExpenseEntryOpen(false)}
        categories={categories}
      />

      {/* Expense Approval / Detail Sheet */}
      {selectedExpense && (
        <ExpenseApprovalSheet
          isOpen={true}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          isTreasurer={isTreasurer}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
}
