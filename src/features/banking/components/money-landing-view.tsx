"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Role, ExpenseStatus, DepositStatus } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatBlock } from "@/components/ui/stat-block";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCedi, toDecimal } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import { plural } from "@/lib/plural";
import { ChevronRight, FileText } from "lucide-react";
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
  const [, startTransition] = useTransition();

  const isTreasurer = currentUser.role === Role.TREASURER;
  const isSecretary = currentUser.role === Role.FINANCE_SECRETARY;
  const canWrite = isSecretary || isTreasurer;

  const [mainTab, setMainTab] = useState<"expenses" | "deposits">("expenses");
  const [isExpenseEntryOpen, setIsExpenseEntryOpen] = useState(false);
  const [isDepositEntryOpen, setIsDepositEntryOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithDetails | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositWithDetails | null>(null);

  const [expenseFilter, setExpenseFilter] = useState<string>("ALL");
  const [depositFilter, setDepositFilter] = useState<string>("ALL");

  const pendingApprovalsCount = useMemo(
    () => initialExpenses.filter((e) => e.status === ExpenseStatus.SUBMITTED).length,
    [initialExpenses]
  );

  const pendingDepositsCount = useMemo(
    () => initialDeposits.filter((d) => d.status === DepositStatus.PENDING_CONFIRMATION).length,
    [initialDeposits]
  );

  const filteredExpenses = useMemo(() => {
    return initialExpenses.filter((e) => {
      if (expenseFilter === "SUBMITTED") return e.status === ExpenseStatus.SUBMITTED;
      if (expenseFilter === "APPROVED") return e.status === ExpenseStatus.APPROVED;
      if (expenseFilter === "PAID") return e.status === ExpenseStatus.PAID;
      if (expenseFilter === "DRAFT") return e.status === ExpenseStatus.DRAFT;
      return true;
    });
  }, [initialExpenses, expenseFilter]);

  const filteredDeposits = useMemo(() => {
    return initialDeposits.filter((d) => {
      if (depositFilter === "PENDING") return d.status === DepositStatus.PENDING_CONFIRMATION;
      if (depositFilter === "CONFIRMED") return d.status === DepositStatus.CONFIRMED;
      return true;
    });
  }, [initialDeposits, depositFilter]);

  const unbankedCashNotice = useMemo(() => {
    const dec = toDecimal(ledger.cashHeld);
    const isZeroOrNegative = dec ? dec.lte(0) : true;
    if (isZeroOrNegative) {
      return "All counted cash has been banked.";
    }
    if (ledger.oldestUndepositedCashDate) {
      const now = new Date();
      const diffMs = now.getTime() - new Date(ledger.oldestUndepositedCashDate).getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return `Oldest unbanked cash: ${plural(diffDays, "day", "days")}`;
    }
    return "Oldest unbanked cash: 0 days";
  }, [ledger.cashHeld, ledger.oldestUndepositedCashDate]);

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
        addToast({ type: "error", message: res.error.message });
      }
    });
  };

  const getExpenseBadge = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.PAID:
        return <Badge variant="balanced" label="Paid" />;
      case ExpenseStatus.APPROVED:
        return <Badge variant="neutral" label="Approved" />;
      case ExpenseStatus.SUBMITTED:
        return <Badge variant="attention" label="For approval" />;
      case ExpenseStatus.REJECTED:
        return <Badge variant="neutral" label="Rejected" />;
      case ExpenseStatus.VOIDED:
        return <Badge variant="neutral" label="Voided" />;
      default:
        return <Badge variant="neutral" label="Draft" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/money/momo"
              className="inline-flex items-center justify-center h-10 px-3 text-body font-medium border border-border hover:bg-hover text-text rounded-control transition-colors"
            >
              Mobile money
            </Link>

            {canWrite && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsExpenseEntryOpen(true)}
                >
                  Record expense
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDepositEntryOpen(true)}
                >
                  Record deposit
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Held, Not Yet Banked Section */}
      <section aria-labelledby="held-balances-heading" className="bg-surface border border-border rounded-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="held-balances-heading" className="text-body font-medium text-text">
            Held, not yet banked
          </h2>
          <span className="text-caption text-muted">
            Total unbanked: <span className="font-medium text-text tnum">{ledger.totalHeldFormatted}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="pb-4 md:pb-0 md:pr-6">
            <StatBlock
              label="Cash held"
              value={ledger.cashHeldFormatted}
              hint="Counted minus paid cash and banked cash."
            />
          </div>
          <div className="pt-4 md:pt-0 md:pl-6">
            <StatBlock
              label="Mobile money held"
              value={ledger.momoHeldFormatted}
              hint="Received minus paid and transfers."
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border text-caption text-muted">
          {unbankedCashNotice}
        </div>
      </section>

      {/* Expenses and Deposits Tables */}
      <section className="space-y-4" aria-label="Expenses and deposits records">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SegmentedControl
            options={[
              { value: "expenses", label: `Expenses (${initialExpenses.length})` },
              { value: "deposits", label: `Deposits (${initialDeposits.length})` },
            ]}
            value={mainTab}
            onChange={(v) => setMainTab(v as "expenses" | "deposits")}
          />

          {mainTab === "expenses" ? (
            <div className="overflow-x-auto pb-1">
              <SegmentedControl
                size="sm"
                options={[
                  { value: "ALL", label: "All" },
                  {
                    value: "SUBMITTED",
                    label: pendingApprovalsCount > 0 ? `For approval (${pendingApprovalsCount})` : "For approval",
                  },
                  { value: "APPROVED", label: "Approved" },
                  { value: "PAID", label: "Paid" },
                  { value: "DRAFT", label: "Drafts" },
                ]}
                value={expenseFilter}
                onChange={setExpenseFilter}
              />
            </div>
          ) : (
            <div className="overflow-x-auto pb-1">
              <SegmentedControl
                size="sm"
                options={[
                  { value: "ALL", label: "All" },
                  {
                    value: "PENDING",
                    label: pendingDepositsCount > 0 ? `Pending confirmation (${pendingDepositsCount})` : "Pending confirmation",
                  },
                  { value: "CONFIRMED", label: "Confirmed" },
                ]}
                value={depositFilter}
                onChange={setDepositFilter}
              />
            </div>
          )}
        </div>

        {mainTab === "expenses" && (
          filteredExpenses.length === 0 ? (
            <EmptyState
              title="No expenses match this filter"
              description="Record church expenditures with payee details and attach photos of physical receipts."
              action={
                canWrite ? (
                  <Button
                    variant="primary"
                    onClick={() => setIsExpenseEntryOpen(true)}
                  >
                    Record expense
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((exp) => {
                  const hasAttachment = exp.attachments && exp.attachments.length > 0;
                  return (
                    <TableRow
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedExpense(exp);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer"
                      aria-label={`View expense for ${exp.payee}, amount ${formatCedi(exp.amount)}`}
                    >
                      <TableCell className="text-muted whitespace-nowrap">
                        {formatAccraDate(new Date(exp.expenseDate), { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="font-medium text-text">
                        <div className="flex items-center gap-2">
                          <span>{exp.payee}</span>
                          {hasAttachment && (
                            <span className="inline-flex items-center gap-1 text-caption px-1.5 py-0.5 bg-hover text-muted rounded-control">
                              <FileText className="w-3 h-3" strokeWidth={1.75} />
                              <span className="sr-only">Receipt attached</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted">
                        {exp.category?.name || "Uncategorized"}
                      </TableCell>
                      <TableCell className="text-right font-medium tnum text-text whitespace-nowrap">
                        <div>{formatCedi(exp.amount)}</div>
                        {exp.status === ExpenseStatus.APPROVED && canWrite && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickMarkPaid(exp.id, exp.paymentMethod, e)}
                            className="text-caption text-ok-ink hover:underline font-medium block ml-auto mt-0.5 min-h-[44px] flex items-center"
                          >
                            Mark paid
                          </button>
                        )}
                      </TableCell>
                      <TableCell>{getExpenseBadge(exp.status)}</TableCell>
                      <TableCell className="text-right text-muted">
                        <ChevronRight className="w-4 h-4 ml-auto" strokeWidth={1.75} aria-hidden="true" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
        )}

        {mainTab === "deposits" && (
          filteredDeposits.length === 0 ? (
            <EmptyState
              title="No deposits match this filter"
              description="Record physical cash banking with photos of bank deposit slips, or transfers to church account."
              action={
                canWrite ? (
                  <Button
                    variant="primary"
                    onClick={() => setIsDepositEntryOpen(true)}
                  >
                    Record deposit
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.map((dep) => {
                  const isConfirmed = dep.status === DepositStatus.CONFIRMED;
                  const methodLabel = dep.kind === "CASH_DEPOSIT" ? "Cash" : "Mobile money";
                  const hasAttachment = dep.attachments && dep.attachments.length > 0;
                  return (
                    <TableRow
                      key={dep.id}
                      onClick={() => setSelectedDeposit(dep)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDeposit(dep);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer"
                      aria-label={`View deposit ${dep.bankReference}, amount ${formatCedi(dep.amount)}`}
                    >
                      <TableCell className="text-muted whitespace-nowrap">
                        {formatAccraDate(new Date(dep.depositDate), { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="font-medium text-text">
                        {methodLabel}
                      </TableCell>
                      <TableCell className="text-muted">
                        <div className="flex items-center gap-2">
                          <span className="tnum">{dep.bankReference}</span>
                          {hasAttachment && (
                            <span className="inline-flex items-center gap-1 text-caption px-1.5 py-0.5 bg-hover text-muted rounded-control">
                              <FileText className="w-3 h-3" strokeWidth={1.75} />
                              <span className="sr-only">Slip attached</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tnum text-text whitespace-nowrap">
                        <div>{formatCedi(dep.amount)}</div>
                        {!isConfirmed && isTreasurer && (
                          <span className="text-caption text-warn-ink font-medium block ml-auto mt-0.5">
                            Verify slip
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isConfirmed ? "balanced" : "attention"}
                          label={isConfirmed ? "Confirmed" : "Pending confirmation"}
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted">
                        <ChevronRight className="w-4 h-4 ml-auto" strokeWidth={1.75} aria-hidden="true" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
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
