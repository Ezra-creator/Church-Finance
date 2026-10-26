"use client";

import React, { useState, useTransition } from "react";
import {
  DistrictRemittance,
  DistrictAllocationRule,
  GivingCategory,
  Role,
  DistrictRemittanceStatus,
} from "@prisma/client";
import {
  Coins,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ShieldAlert,
  Percent,
  Calendar,
  History,
} from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatCedi } from "@/lib/money";
import { formatAccraDate, nowUtc, toAccraDateString } from "@/lib/dates";
import { recordRemittancePaymentAction } from "@/features/remittance/actions";
import {
  createAllocationRuleAction,
  closeAllocationRuleAction,
} from "@/features/allocation/actions";
import { DistrictRemittanceSummary } from "@/features/remittance/service";

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
    const due = parseFloat(rem.amountDue.toString());
    const paid = parseFloat(rem.amountPaid.toString());
    const remaining = Math.max(0, due - paid);
    setSelectedRemittance(rem);
    setPaymentAmount(remaining.toFixed(2));
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

      addToast("success", "District remittance payment recorded successfully.");
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

      addToast("success", "District allocation rule established.");
      setIsRuleSheetOpen(false);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header with Total Outstanding in Large Mono */}
      <div className="pb-6 border-b border-rule flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-mono text-ink-soft">
            Headquarters & District Obligations
          </p>
          <h1 className="text-3xl font-serif font-normal text-ink mt-1">
            District Remittances
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Track weekly assessment allocations owed to the district and record payment disbursements.
          </p>
        </div>

        {/* Large Mono Outstanding Notice */}
        <div className="p-4 border border-rule bg-paper rounded-[2px] min-w-[240px]">
          <p className="text-[10px] uppercase font-mono tracking-wider text-ink-soft">
            Total Outstanding Due
          </p>
          <p className="text-3xl font-mono font-bold text-ink mt-0.5 tabular-nums">
            {formatCedi(summary.totalOutstanding)}
          </p>
          <p className="text-[11px] font-mono text-ink-soft mt-1">
            {summary.countOutstanding} period{summary.countOutstanding === 1 ? "" : "s"} awaiting settlement
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("remittances")}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === "remittances"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Weekly Remittances ({remittances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Allocation Rules ({rules.length})
        </button>
      </div>

      {/* TAB 1: REMITTANCES LEDGER */}
      {activeTab === "remittances" && (
        <div className="space-y-4">
          {remittances.length === 0 ? (
            <EmptyState
              title="No district remittances recorded"
              description="District obligations are automatically computed and created when weekly reconciliation periods are submitted."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-rule font-mono uppercase tracking-wider text-[11px] text-ink-soft">
                    <th className="py-2.5 pr-4 font-normal">Week Ending</th>
                    <th className="py-2.5 px-3 text-right font-normal">Amount Due</th>
                    <th className="py-2.5 px-3 text-right font-normal">Amount Paid</th>
                    <th className="py-2.5 px-3 text-right font-normal">Balance Due</th>
                    <th className="py-2.5 px-3 font-normal">Status</th>
                    <th className="py-2.5 pl-3 text-right font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-mono">
                  {remittances.map((rem) => {
                    const dueNum = parseFloat(rem.amountDue.toString());
                    const paidNum = parseFloat(rem.amountPaid.toString());
                    const balance = dueNum - paidNum;
                    const isFullyPaid = rem.status === DistrictRemittanceStatus.PAID;

                    const statusTone =
                      rem.status === DistrictRemittanceStatus.PAID
                        ? "balanced"
                        : rem.status === DistrictRemittanceStatus.PART_PAID
                        ? "neutral"
                        : "variance";

                    const statusLabel =
                      rem.status === DistrictRemittanceStatus.PAID
                        ? "Paid in full"
                        : rem.status === DistrictRemittanceStatus.PART_PAID
                        ? "Part-paid"
                        : "Due";

                    return (
                      <tr key={rem.id} className="hover:bg-ink/[0.02]">
                        <td className="py-3 pr-4 text-ink font-sans">
                          <span className="font-medium">
                            {formatAccraDate(rem.period.weekEnding)}
                          </span>
                          <span className="text-[10px] font-mono text-ink-soft ml-2">
                            (v{rem.period.reportVersion})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-ink font-semibold">
                          {formatCedi(rem.amountDue)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-ink">
                          {formatCedi(rem.amountPaid)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-ink">
                          {isFullyPaid ? "-" : formatCedi(balance.toFixed(2))}
                        </td>
                        <td className="py-3 px-3">
                          <StatusMark tone={statusTone} label={statusLabel} />
                        </td>
                        <td className="py-3 pl-3 text-right">
                          {canManage && !isFullyPaid && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openPaymentSheet(rem)}
                              className="text-xs"
                            >
                              Record payment
                            </Button>
                          )}
                          {isFullyPaid && (
                            <span className="text-ink-soft text-[11px] font-mono">
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALLOCATION RULES */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-rule">
            <div>
              <h2 className="text-base font-serif font-normal text-ink">
                District Assessment Percentages
              </h2>
              <p className="text-xs text-ink-soft">
                Percentage of weekly category revenue designated for district remittance.
              </p>
            </div>
            {canManage && (
              <Button variant="primary" onClick={() => setIsRuleSheetOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add or change rule
              </Button>
            )}
          </div>

          {/* Plain Explanation Banner */}
          <div className="p-3.5 bg-paper border border-rule text-xs font-mono space-y-1 text-ink-soft rounded-[2px]">
            <p className="font-semibold text-ink">Effective Date Guarantee:</p>
            <p>
              Rules never overwrite history. When you change a percentage, the existing active
              rule is closed on the prior day and the new percentage takes effect on the chosen
              date. All past submitted reconciliation periods retain their locked, historical calculations.
            </p>
          </div>

          {rules.length === 0 ? (
            <EmptyState
              title="No allocation rules configured"
              description="No default percentages are seeded. Set allocation percentage rules for giving categories (e.g. Tithe) to automatically calculate weekly amounts due."
              action={
                canManage ? (
                  <Button variant="secondary" onClick={() => setIsRuleSheetOpen(true)}>
                    Configure first rule
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-rule font-mono uppercase tracking-wider text-[11px] text-ink-soft">
                    <th className="py-2.5 pr-4 font-normal">Giving Category</th>
                    <th className="py-2.5 px-3 text-right font-normal">District %</th>
                    <th className="py-2.5 px-3 font-normal">Effective From</th>
                    <th className="py-2.5 px-3 font-normal">Effective To</th>
                    <th className="py-2.5 pl-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-mono">
                  {rules.map((rule) => {
                    const isActive = rule.effectiveTo === null;
                    return (
                      <tr key={rule.id} className="hover:bg-ink/[0.02]">
                        <td className="py-2.5 pr-4 text-ink font-sans font-medium">
                          {rule.category.name}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-ink">
                          {rule.percentage.toString()}%
                        </td>
                        <td className="py-2.5 px-3 text-ink">
                          {formatAccraDate(rule.effectiveFrom)}
                        </td>
                        <td className="py-2.5 px-3 text-ink-soft">
                          {rule.effectiveTo ? formatAccraDate(rule.effectiveTo) : "Current / Open"}
                        </td>
                        <td className="py-2.5 pl-3">
                          <StatusMark
                            tone={isActive ? "balanced" : "neutral"}
                            label={isActive ? "Active" : "Closed"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Payment Sheet */}
      {selectedRemittance && (
        <Sheet
          isOpen={true}
          onClose={() => setSelectedRemittance(null)}
          title="Record District Payment"
          description={`Record funds disbursed to the district for the week ending ${formatAccraDate(
            selectedRemittance.period.weekEnding
          )}.`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            {paymentError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-mono rounded-[2px]">
                {paymentError}
              </div>
            )}

            {/* Summary Box */}
            <div className="p-3 bg-paper border border-rule space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-ink-soft">Total Assessment:</span>
                <span className="font-semibold">{formatCedi(selectedRemittance.amountDue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Previously Paid:</span>
                <span>{formatCedi(selectedRemittance.amountPaid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-rule font-bold">
                <span>Remaining Balance Due:</span>
                <span className="text-ink">
                  {formatCedi(
                    (
                      parseFloat(selectedRemittance.amountDue.toString()) -
                      parseFloat(selectedRemittance.amountPaid.toString())
                    ).toFixed(2)
                  )}
                </span>
              </div>
            </div>

            <TextField
              label="Payment Amount (GH₵)"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />

            <TextField
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />

            <TextField
              label="Payment Reference / Cheque #"
              type="text"
              placeholder="e.g. CHQ-48291, MoMo Ref, or Bank Slip #"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />

            {/* Payment History if any */}
            {selectedRemittance.payments.length > 0 && (
              <div className="pt-2 border-t border-rule space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-wider text-ink-soft">
                  Previous Partial Payments
                </p>
                <div className="space-y-1">
                  {selectedRemittance.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-xs font-mono text-ink-soft"
                    >
                      <span>
                        {formatAccraDate(p.paidOn)} {p.reference ? `(${p.reference})` : ""}
                      </span>
                      <strong className="text-ink">{formatCedi(p.amount)}</strong>
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
                {isPending ? "Recording..." : "Confirm Payment"}
              </Button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Add / Change Rule Sheet */}
      <Sheet
        isOpen={isRuleSheetOpen}
        onClose={() => setIsRuleSheetOpen(false)}
        title="Add or Change Allocation Rule"
        description="Set the percentage of category revenue to be remitted to the district."
      >
        <form onSubmit={handleSaveRule} className="space-y-4 py-2">
          {ruleError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-mono rounded-[2px]">
              {ruleError}
            </div>
          )}

          <Select
            label="Giving Category"
            value={ruleCategoryId}
            onChange={(e) => setRuleCategoryId(e.target.value)}
            options={categories.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.code})`,
            }))}
          />

          <TextField
            label="District Allocation Percentage (%)"
            type="number"
            step="0.01"
            min="0.01"
            max="100.00"
            value={rulePercentage}
            onChange={(e) => setRulePercentage(e.target.value)}
            required
          />

          <TextField
            label="Effective From Date"
            type="date"
            value={ruleEffectiveFrom}
            onChange={(e) => setRuleEffectiveFrom(e.target.value)}
            required
          />

          <div className="p-3 bg-paper border border-rule text-xs font-mono text-ink-soft space-y-1">
            <p className="font-semibold text-ink">Automatic Closure:</p>
            <p>
              If an open rule already exists for this category, it will automatically be closed
              the day before this new rule begins.
            </p>
          </div>

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
              {isPending ? "Saving..." : "Save Rule"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
