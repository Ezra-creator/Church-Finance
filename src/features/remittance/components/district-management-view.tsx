"use client";

import React, { useState, useTransition } from "react";
import {
  DistrictRemittance,
  DistrictAllocationRule,
  GivingCategory,
  Role,
  DistrictRemittanceStatus,
} from "@prisma/client";
import { StatBlock } from "@/components/ui/stat-block";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCedi, toDecimal } from "@/lib/money";
import { formatAccraDate, nowUtc, toAccraDateString } from "@/lib/dates";
import { plural } from "@/lib/plural";
import { recordRemittancePaymentAction } from "@/features/remittance/actions";
import { createAllocationRuleAction } from "@/features/allocation/actions";
import { DistrictRemittanceSummary } from "@/features/remittance/service";
import Decimal from "decimal.js";

interface DistrictRemittanceWithPeriod extends DistrictRemittance {
  period: {
    id: string;
    weekEnding: Date;
    reportVersion: number;
  };
  payments: Array<{
    id: string;
    amount: { toString(): string };
    paidOn: Date;
    reference: string | null;
    createdAt: Date;
    recordedBy: {
      name: string | null;
      email: string | null;
    };
  }>;
}

interface DistrictRuleWithCategory extends DistrictAllocationRule {
  category: GivingCategory;
}

interface DistrictManagementViewProps {
  remittances: DistrictRemittanceWithPeriod[];
  summary: DistrictRemittanceSummary;
  rules: DistrictRuleWithCategory[];
  categories: GivingCategory[];
  userRole: Role;
}

export function DistrictManagementView({
  remittances,
  summary,
  rules,
  categories,
  userRole,
}: DistrictManagementViewProps) {
  const [activeTab, setActiveTab] = useState<"remittances" | "rules">("remittances");
  const [selectedRemittance, setSelectedRemittance] =
    useState<DistrictRemittanceWithPeriod | null>(null);

  // Record Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(toAccraDateString(nowUtc()));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Allocation rule form state
  const [isRuleSheetOpen, setIsRuleSheetOpen] = useState(false);
  const [ruleCategoryId, setRuleCategoryId] = useState(categories[0]?.id || "");
  const [rulePercentage, setRulePercentage] = useState("10.00");
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState(
    toAccraDateString(nowUtc())
  );
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const canManage =
    userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER;

  const openPaymentSheet = (rem: DistrictRemittanceWithPeriod) => {
    const due = toDecimal(rem.amountDue) || new Decimal(0);
    const paid = toDecimal(rem.amountPaid) || new Decimal(0);
    const remaining = Decimal.max(0, due.minus(paid));
    setSelectedRemittance(rem);
    setPaymentAmount(remaining.toString());
    setPaymentDate(toAccraDateString(nowUtc()));
    setPaymentReference("");
    setPaymentError(null);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRemittance) return;
    setPaymentError(null);

    startTransition(async () => {
      const res = await recordRemittancePaymentAction({
        remittanceId: selectedRemittance.id,
        amount: paymentAmount,
        paidOn: paymentDate,
        reference: paymentReference || null,
      });

      if (!res.success) {
        setPaymentError(res.error.message);
        return;
      }

      addToast({ type: "success", message: "District remittance payment recorded." });
      setSelectedRemittance(null);
      window.location.reload();
    });
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError(null);

    startTransition(async () => {
      const res = await createAllocationRuleAction({
        categoryId: ruleCategoryId,
        percentage: rulePercentage,
        effectiveFrom: ruleEffectiveFrom,
      });

      if (!res.success) {
        setRuleError(res.error.message);
        return;
      }

      addToast({ type: "success", message: "District allocation rule established." });
      setIsRuleSheetOpen(false);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="District"
        description="Track weekly assessment allocations and payments to the district."
      />

      {/* Outstanding StatBlock */}
      <StatBlock
        label="Total outstanding due"
        value={formatCedi(summary.totalOutstanding)}
        hint={`${summary.countOutstanding} ${plural(summary.countOutstanding, "period", "periods")} awaiting settlement`}
      />

      {/* Tabs */}
      <div className="flex border-b border-border text-body">
        <button
          type="button"
          onClick={() => setActiveTab("remittances")}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors min-h-[44px] ${
            activeTab === "remittances"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Weekly remittances ({remittances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors min-h-[44px] ${
            activeTab === "rules"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Allocation rules ({rules.length})
        </button>
      </div>

      {/* TAB 1: REMITTANCE RECORDS */}
      {activeTab === "remittances" && (
        <div className="space-y-4">
          {remittances.length === 0 ? (
            <EmptyState
              title="No district remittances recorded"
              description="District obligations are automatically computed when weekly reconciliation periods are submitted."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block border border-border rounded-panel overflow-hidden bg-surface">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week ending</TableHead>
                      <TableHead className="text-right">Amount due</TableHead>
                      <TableHead className="text-right">Amount paid</TableHead>
                      <TableHead className="text-right">Balance due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remittances.map((rem) => {
                      const due = toDecimal(rem.amountDue) || new Decimal(0);
                      const paid = toDecimal(rem.amountPaid) || new Decimal(0);
                      const balance = due.minus(paid);
                      const isFullyPaid = rem.status === DistrictRemittanceStatus.PAID;

                      const statusVariant =
                        rem.status === DistrictRemittanceStatus.PAID
                          ? "balanced"
                          : rem.status === DistrictRemittanceStatus.PART_PAID
                          ? "attention"
                          : "neutral";

                      const statusLabel =
                        rem.status === DistrictRemittanceStatus.PAID
                          ? "Paid in full"
                          : rem.status === DistrictRemittanceStatus.PART_PAID
                          ? "Part-paid"
                          : "Due";

                      return (
                        <TableRow key={rem.id}>
                          <TableCell className="text-text">
                            <span className="font-medium">
                              {formatAccraDate(rem.period.weekEnding)}
                            </span>
                            <span className="text-caption text-muted ml-2 tnum">
                              (v{rem.period.reportVersion})
                            </span>
                          </TableCell>
                          <TableCell className="text-right tnum font-medium text-text">
                            {formatCedi(rem.amountDue)}
                          </TableCell>
                          <TableCell className="text-right tnum text-muted">
                            {formatCedi(rem.amountPaid)}
                          </TableCell>
                          <TableCell className="text-right tnum text-muted">
                            {isFullyPaid ? "—" : formatCedi(balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant} label={statusLabel} />
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage && !isFullyPaid && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openPaymentSheet(rem)}
                              >
                                Record payment
                              </Button>
                            )}
                            {isFullyPaid && (
                              <span className="text-muted text-caption">
                                Settled
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Collapsed Row View */}
              <div className="sm:hidden border border-border rounded-panel divide-y divide-border bg-surface">
                {remittances.map((rem) => {
                  const due = toDecimal(rem.amountDue) || new Decimal(0);
                  const paid = toDecimal(rem.amountPaid) || new Decimal(0);
                  const balance = due.minus(paid);
                  const isFullyPaid = rem.status === DistrictRemittanceStatus.PAID;

                  const statusVariant =
                    rem.status === DistrictRemittanceStatus.PAID
                      ? "balanced"
                      : rem.status === DistrictRemittanceStatus.PART_PAID
                      ? "attention"
                      : "neutral";

                  const statusLabel =
                    rem.status === DistrictRemittanceStatus.PAID
                      ? "Paid in full"
                      : rem.status === DistrictRemittanceStatus.PART_PAID
                      ? "Part-paid"
                      : "Due";

                  return (
                    <div key={rem.id} className="p-3.5 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-body text-text">
                          {formatAccraDate(rem.period.weekEnding)}
                        </span>
                        <span className="text-body font-medium text-text tnum">
                          {formatCedi(rem.amountDue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-caption text-muted">
                        <span className="tnum">
                          Balance: {isFullyPaid ? "Settled" : formatCedi(balance)}
                        </span>
                        <Badge variant={statusVariant} label={statusLabel} />
                      </div>
                      {canManage && !isFullyPaid && (
                        <div className="pt-1.5 flex justify-end border-t border-border">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openPaymentSheet(rem)}
                          >
                            Record payment
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: ALLOCATION RULES */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-lead font-semibold text-text">
                District assessment percentages
              </h2>
              <p className="text-caption text-muted">
                Percentage of weekly category revenue designated for district remittance.
              </p>
            </div>
            {canManage && (
              <Button variant="primary" onClick={() => setIsRuleSheetOpen(true)}>
                Add or change rule
              </Button>
            )}
          </div>

          <InlineAlert
            variant="info"
            title="Effective date guarantee: Rules never overwrite history. When you change a percentage, the existing active rule is closed on the prior day and the new percentage takes effect on the chosen date. Past reconciliation periods retain their locked calculations."
          />

          {rules.length === 0 ? (
            <EmptyState
              title="No allocation rules configured"
              description="No default percentages are configured. Set allocation percentage rules for giving categories to automatically calculate weekly amounts due."
              action={
                canManage ? (
                  <Button variant="secondary" onClick={() => setIsRuleSheetOpen(true)}>
                    Configure rule
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="border border-border rounded-panel overflow-hidden bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giving category</TableHead>
                    <TableHead className="text-right">District %</TableHead>
                    <TableHead>Effective from</TableHead>
                    <TableHead>Effective to</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const isActive = rule.effectiveTo === null;
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium text-text">
                          {rule.category.name}
                        </TableCell>
                        <TableCell className="text-right tnum font-medium text-text">
                          {rule.percentage.toString()}%
                        </TableCell>
                        <TableCell className="tnum text-muted">
                          {formatAccraDate(rule.effectiveFrom)}
                        </TableCell>
                        <TableCell className="tnum text-muted">
                          {rule.effectiveTo ? formatAccraDate(rule.effectiveTo) : "Current / Open"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isActive ? "balanced" : "neutral"}
                            label={isActive ? "Active" : "Closed"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Record Payment Sheet */}
      {selectedRemittance && (
        <Sheet
          isOpen={true}
          onClose={() => setSelectedRemittance(null)}
          title="Record district payment"
          description={`Record funds disbursed to the district for the week ending ${formatAccraDate(
            selectedRemittance.period.weekEnding
          )}.`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            {paymentError && (
              <InlineAlert variant="danger" title={paymentError} />
            )}

            {/* Summary Box */}
            <div className="p-3 bg-page border border-border rounded-panel space-y-1.5 text-caption text-muted">
              <div className="flex justify-between">
                <span>Total assessment:</span>
                <span className="font-medium text-text tnum">{formatCedi(selectedRemittance.amountDue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Previously paid:</span>
                <span className="tnum">{formatCedi(selectedRemittance.amountPaid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border font-medium text-text">
                <span>Remaining balance due:</span>
                <span className="tnum">
                  {formatCedi(
                    Decimal.max(
                      0,
                      (toDecimal(selectedRemittance.amountDue) || new Decimal(0)).minus(
                        toDecimal(selectedRemittance.amountPaid) || new Decimal(0)
                      )
                    )
                  )}
                </span>
              </div>
            </div>

            <TextField
              label="Payment amount (GH₵)"
              type="text"
              inputMode="decimal"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />

            <TextField
              label="Payment date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />

            <TextField
              label="Payment reference or cheque number"
              type="text"
              placeholder="e.g. CHQ-48291, MoMo Ref, or Bank Slip #"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />

            {/* Payment History if any */}
            {selectedRemittance.payments.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1">
                <p className="text-caption text-muted">
                  Previous partial payments
                </p>
                <div className="space-y-1">
                  {selectedRemittance.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-caption text-muted"
                    >
                      <span className="tnum">
                        {formatAccraDate(p.paidOn)} {p.reference ? `(${p.reference})` : ""}
                      </span>
                      <strong className="text-text tnum">{formatCedi(p.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setSelectedRemittance(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={isPending}>
                {isPending ? "Recording..." : "Confirm payment"}
              </Button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Add / Change Rule Sheet */}
      <Sheet
        isOpen={isRuleSheetOpen}
        onClose={() => setIsRuleSheetOpen(false)}
        title="Add or change allocation rule"
        description="Set the percentage of category revenue to be remitted to the district."
      >
        <form onSubmit={handleSaveRule} className="space-y-4 py-2">
          {ruleError && (
            <InlineAlert variant="danger" title={ruleError} />
          )}

          <Select
            label="Giving category"
            value={ruleCategoryId}
            onChange={(e) => setRuleCategoryId(e.target.value)}
            options={categories.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.code})`,
            }))}
          />

          <TextField
            label="District allocation percentage (%)"
            type="number"
            step="0.01"
            min="0.01"
            max="100.00"
            value={rulePercentage}
            onChange={(e) => setRulePercentage(e.target.value)}
            required
          />

          <TextField
            label="Effective from date"
            type="date"
            value={ruleEffectiveFrom}
            onChange={(e) => setRuleEffectiveFrom(e.target.value)}
            required
          />

          <InlineAlert
            variant="info"
            title="Automatic closure: If an open rule already exists for this category, it will automatically be closed the day before this new rule begins."
          />

          <div className="pt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsRuleSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={isPending}>
              {isPending ? "Saving..." : "Save rule"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
