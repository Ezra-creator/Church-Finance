"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Role, ExpenseStatus, DepositStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { formatCedi } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import {
  Plus,
  Coins,
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock,
  Landmark,
  ShieldAlert,
} from "lucide-react";
import { FormattedHeldMoneyLedger } from "../service";
import { ExpenseEntrySheet, ExpenseCategoryItem } from "@/features/expenses/components/expense-entry-sheet";
import { DepositEntrySheet, ChurchUserOption } from "@/features/deposits/components/deposit-entry-sheet";
import { ExpenseApprovalSheet, ExpenseWithDetails } from "@/features/expenses/components/expense-approval-sheet";
import { DepositConfirmationSheet, DepositWithDetails } from "@/features/deposits/components/deposit-confirmation-sheet";
import { markExpensePaidAction } from "@/features/expenses/actions";
import { useToast } from "@/components/ui/toast";

export interface MoneyLandingViewProps {
  ledger: FormattedHeldMoneyLedger;
  expenses: any[];
  deposits: any[];
  categories: ExpenseCategoryItem[];
  churchUsers: ChurchUserOption[];
  currentUser: {
    id: string;
    name: string;
    role: Role;
  };
}

export function MoneyLandingView({
  ledger,
  expenses: initialExpenses,
  deposits: initialDeposits,
  categories,
  churchUsers,
  currentUser,
}: MoneyLandingViewProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isTreasurer = currentUser.role === Role.TREASURER;
  const isSecretary = currentUser.role === Role.FINANCE_SECRETARY;
  const canWrite = isSecretary || isTreasurer;

  // Sheet states
  const [isExpenseEntryOpen, setIsExpenseEntryOpen] = useState(false);
  const [isDepositEntryOpen, setIsDepositEntryOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithDetails | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositWithDetails | null>(null);

  // Filters
  const [expenseFilter, setExpenseFilter] = useState<string>("ALL");
  const [depositFilter, setDepositFilter] = useState<string>("ALL");

  const pendingApprovalsCount = initialExpenses.filter(
    (e) => e.status === ExpenseStatus.SUBMITTED
  ).length;

  const pendingDepositsCount = initialDeposits.filter(
    (d) => d.status === DepositStatus.PENDING_CONFIRMATION
  ).length;

  const filteredExpenses = initialExpenses.filter((e) => {
    if (expenseFilter === "SUBMITTED") return e.status === ExpenseStatus.SUBMITTED;
    if (expenseFilter === "APPROVED") return e.status === ExpenseStatus.APPROVED;
    if (expenseFilter === "PAID") return e.status === ExpenseStatus.PAID;
    if (expenseFilter === "DRAFT") return e.status === ExpenseStatus.DRAFT;
    return true;
  });

  const filteredDeposits = initialDeposits.filter((d) => {
    if (depositFilter === "PENDING") return d.status === DepositStatus.PENDING_CONFIRMATION;
    if (depositFilter === "CONFIRMED") return d.status === DepositStatus.CONFIRMED;
    return true;
  });

  const handleQuickMarkPaid = (expenseId: string, paymentMethod: any, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await markExpensePaidAction({
        id: expenseId,
        paymentMethod,
      });
      if (res.success) {
        addToast({ type: "success", message: "Expense marked as paid." });
      } else {
        addToast({ type: "attention", message: res.error.message });
      }
    });
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-rule">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-soft">
            Parish Custody & Banking
          </p>
          <h1 className="text-3xl font-serif font-normal text-ink mt-1">
            Money & Bank Deposits
          </h1>
          <p className="text-xs text-ink-soft pt-1 max-w-xl leading-relaxed">
            Track held cash and mobile money balances, record disbursement approvals with receipts, and verify bank deposit slips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/money/momo"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium border border-rule hover:bg-ink/[0.04] text-ink rounded-[2px] transition-colors"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Mobile Money</span>
            <ArrowRight className="w-3 h-3 text-ink-soft" />
          </Link>

          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpenseEntryOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Record Expense
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDepositEntryOpen(true)}
              >
                <Landmark className="w-3.5 h-3.5 mr-1" />
                Record Bank Deposit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Held, Not Yet Banked Ledger */}
      <section className="p-6 bg-paper border border-rule rounded-[2px] space-y-6">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <h2 className="text-xs uppercase tracking-widest font-mono font-semibold text-ink-soft">
            Held, Not Yet Banked
          </h2>
          <span className="text-xs font-mono text-ink-soft">Live Church Custody</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Row 1: Cash in Hand */}
          <div className="p-5 bg-ink/[0.02] border border-rule rounded-[2px] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-ink-soft">
              <span>Cash Counted & Held</span>
              <span>Counted minus paid expenses & deposits</span>
            </div>
            <div className="text-3xl font-mono tabular-nums font-bold text-ink">
              {ledger.cashHeldFormatted}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-ink-soft pt-1">
              <span>Counted: {formatCedi(ledger.cashCounted)}</span>
              <span>•</span>
              <span>Expenses: {formatCedi(ledger.cashExpenses)}</span>
              <span>•</span>
              <span>Banked: {formatCedi(ledger.cashDeposits)}</span>
            </div>
          </div>

          {/* Row 2: Mobile Money Held */}
          <div className="p-5 bg-ink/[0.02] border border-rule rounded-[2px] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-ink-soft">
              <span>Mobile Money Held</span>
              <span>Classified minus MoMo expenses & transfers</span>
            </div>
            <div className="text-3xl font-mono tabular-nums font-bold text-ink">
              {ledger.momoHeldFormatted}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-ink-soft pt-1">
              <span>Received: {formatCedi(ledger.momoReceived)}</span>
              <span>•</span>
              <span>Expenses: {formatCedi(ledger.momoExpenses)}</span>
              <span>•</span>
              <span>Transferred: {formatCedi(ledger.momoTransfers)}</span>
            </div>
          </div>
        </div>

        {/* Beneath it: Plain line stating how long oldest undeposited cash has been held */}
        <div className="pt-2 border-t border-rule flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-ink">
            <Clock className="w-4 h-4 text-ink-soft flex-shrink-0" />
            <span>{ledger.oldestUndepositedNotice}</span>
          </div>
          <div className="text-ink-soft">
            Total unbanked funds: <strong className="text-ink">{ledger.totalHeldFormatted}</strong>
          </div>
        </div>
      </section>

      {/* Ruled Section 1: Expenses */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-rule-strong">
          <div>
            <h3 className="text-xl font-serif font-normal text-ink">
              Disbursements & Expenses
            </h3>
            <p className="text-xs text-ink-soft font-mono">
              Parish expenditures requiring treasurer approval and receipt evidence.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-ink/[0.03] p-1 rounded-[2px] self-start sm:self-auto text-xs font-mono">
            {[
              { id: "ALL", label: "All" },
              {
                id: "SUBMITTED",
                label: `For Approval${pendingApprovalsCount > 0 ? ` (${pendingApprovalsCount})` : ""}`,
              },
              { id: "APPROVED", label: "Approved" },
              { id: "PAID", label: "Paid" },
              { id: "DRAFT", label: "Drafts" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setExpenseFilter(f.id)}
                className={`px-2.5 py-1 rounded-[1px] transition-colors ${
                  expenseFilter === f.id
                    ? "bg-paper text-ink font-semibold shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 border border-dashed border-rule rounded-[2px] text-center space-y-2 bg-ink/[0.01]">
            <p className="text-sm font-medium text-ink">No expenses in this view</p>
            <p className="text-xs text-ink-soft font-mono max-w-sm mx-auto">
              Record church expenditures with payee details and attach photos of physical receipts for audit compliance.
            </p>
            {canWrite && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpenseEntryOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Record First Expense
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-rule rounded-[2px] overflow-hidden divide-y divide-rule bg-paper">
            {filteredExpenses.map((exp) => {
              const hasAttachment = exp.attachments && exp.attachments.length > 0;
              let tone: "neutral" | "balanced" | "attention" | "variance" = "neutral";
              let statusLabel = exp.status;

              if (exp.status === ExpenseStatus.PAID) {
                tone = "balanced";
                statusLabel = "Paid";
              } else if (exp.status === ExpenseStatus.APPROVED) {
                tone = "balanced";
                statusLabel = "Approved";
              } else if (exp.status === ExpenseStatus.SUBMITTED) {
                tone = "attention";
                statusLabel = "Awaiting Approval";
              } else if (exp.status === ExpenseStatus.REJECTED) {
                tone = "variance";
                statusLabel = "Rejected";
              } else if (exp.status === ExpenseStatus.VOIDED) {
                tone = "variance";
                statusLabel = "Voided";
              } else {
                statusLabel = "Draft";
              }

              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpense(exp)}
                  className="p-4 hover:bg-ink/[0.01] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5">
                      <StatusMark tone={tone} label={statusLabel} />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink truncate">
                          {exp.payee}
                        </span>
                        <span className="text-xs text-ink-soft font-mono">
                          ({exp.category.name})
                        </span>
                        {hasAttachment && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 bg-ink/5 text-ink-soft rounded-[1px]">
                            <FileText className="w-3 h-3" /> Receipt
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink-soft truncate max-w-lg">
                        {exp.description}
                      </p>

                      <p className="text-[10px] font-mono text-ink-soft">
                        {formatAccraDate(new Date(exp.expenseDate), { day: "numeric", month: "short", year: "numeric" })}
                        {" • "}
                        Method: {exp.paymentMethod}
                        {" • "}
                        Req by: {exp.requestedBy.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pl-7 sm:pl-0">
                    <div className="text-right">
                      <div className="text-base font-mono tabular-nums font-bold text-ink">
                        {formatCedi(exp.amount)}
                      </div>
                      {exp.status === ExpenseStatus.APPROVED && canWrite && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickMarkPaid(exp.id, exp.paymentMethod, e)}
                          className="text-[11px] font-mono text-balanced hover:underline font-semibold block mt-0.5"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ruled Section 2: Bank Deposits */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-rule-strong">
          <div>
            <h3 className="text-xl font-serif font-normal text-ink">
              Bank Deposit Log
            </h3>
            <p className="text-xs text-ink-soft font-mono">
              Cash deposits and MoMo transfers with verified bank slip documents.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-ink/[0.03] p-1 rounded-[2px] self-start sm:self-auto text-xs font-mono">
            {[
              { id: "ALL", label: "All" },
              {
                id: "PENDING",
                label: `Pending${pendingDepositsCount > 0 ? ` (${pendingDepositsCount})` : ""}`,
              },
              { id: "CONFIRMED", label: "Confirmed" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDepositFilter(f.id)}
                className={`px-2.5 py-1 rounded-[1px] transition-colors ${
                  depositFilter === f.id
                    ? "bg-paper text-ink font-semibold shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDeposits.length === 0 ? (
          <div className="py-12 border border-dashed border-rule rounded-[2px] text-center space-y-2 bg-ink/[0.01]">
            <p className="text-sm font-medium text-ink">No bank deposits logged</p>
            <p className="text-xs text-ink-soft font-mono max-w-sm mx-auto">
              Record physical cash banking with photos of bank deposit slips, or record transfers to the church account.
            </p>
            {canWrite && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDepositEntryOpen(true)}
                >
                  <Landmark className="w-3.5 h-3.5 mr-1" />
                  Record First Deposit
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-rule rounded-[2px] overflow-hidden divide-y divide-rule bg-paper">
            {filteredDeposits.map((dep) => {
              const isConfirmed = dep.status === DepositStatus.CONFIRMED;
              const hasAttachment = dep.attachments && dep.attachments.length > 0;

              return (
                <div
                  key={dep.id}
                  onClick={() => setSelectedDeposit(dep)}
                  className="p-4 hover:bg-ink/[0.01] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5">
                      <StatusMark
                        tone={isConfirmed ? "balanced" : "attention"}
                        label={isConfirmed ? "Confirmed" : "Pending Confirmation"}
                      />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">
                          {dep.kind === "CASH_DEPOSIT" ? "Cash Bank Deposit" : "MoMo Bank Transfer"}
                        </span>
                        <span className="text-xs font-mono text-ink-soft">
                          Ref: {dep.bankReference}
                        </span>
                        {hasAttachment && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 bg-ink/5 text-ink-soft rounded-[1px]">
                            <FileText className="w-3 h-3" /> Slip
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink-soft">
                        {dep.notes || `Carried by ${dep.carriedBy.name}`}
                      </p>

                      <p className="text-[10px] font-mono text-ink-soft">
                        Date: {formatAccraDate(new Date(dep.depositDate), { day: "numeric", month: "short", year: "numeric" })}
                        {dep.confirmedBy ? ` • Confirmed by ${dep.confirmedBy.name}` : " • Awaiting treasurer verification"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pl-7 sm:pl-0">
                    <div className="text-right">
                      <div className="text-base font-mono tabular-nums font-bold text-ink">
                        {formatCedi(dep.amount)}
                      </div>
                      {!isConfirmed && isTreasurer && (
                        <span className="text-[11px] font-mono text-attention font-semibold block mt-0.5">
                          Tap to verify slip & confirm
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sheets */}
      <ExpenseEntrySheet
        isOpen={isExpenseEntryOpen}
        onClose={() => setIsExpenseEntryOpen(false)}
        categories={categories}
      />

      <DepositEntrySheet
        isOpen={isDepositEntryOpen}
        onClose={() => setIsDepositEntryOpen(false)}
        users={churchUsers}
        cashHeld={ledger.cashHeld.toString()}
        momoHeld={ledger.momoHeld.toString()}
      />

      <ExpenseApprovalSheet
        expense={selectedExpense}
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        currentUserId={currentUser.id}
        isTreasurer={isTreasurer}
      />

      <DepositConfirmationSheet
        deposit={selectedDeposit}
        isOpen={Boolean(selectedDeposit)}
        onClose={() => setSelectedDeposit(null)}
        isTreasurer={isTreasurer}
      />
    </div>
  );
}
