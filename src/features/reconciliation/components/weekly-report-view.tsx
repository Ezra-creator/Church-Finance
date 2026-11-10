"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, ReconciliationStatus } from "@prisma/client";
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/ui/money-text";
import { WeekSelector } from "@/components/ui/week-selector";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { formatAccraDate, formatAccraDateTime } from "@/lib/dates";
import {
  setBookTotalAction,
  setVarianceReasonAction,
  submitPeriodAction,
  unlockPeriodAction,
} from "@/features/reconciliation/actions";

export interface CategoryRow {
  id: string;
  name: string;
  code: string;
  cash: string;
  momo: string;
  total: string;
}

export interface BlockerItem {
  type: string;
  message: string;
  link?: string;
  count?: number;
}

export interface WeeklyReportViewProps {
  periodId: string;
  weekEnding: string;
  formattedRange: string;
  status: ReconciliationStatus;
  reportVersion: number;
  submittedAt: string | null;
  submittedByName: string | null;
  cashTotal: string;
  momoTotal: string;
  expectedTotal: string;
  initialBookTotal: string;
  initialVarianceReason: string;
  variance: string | null;
  varianceStatus: "BALANCED" | "SHORT" | "OVER" | "NO_BOOK_TOTAL";
  categories: CategoryRow[];
  blockers: BlockerItem[];
  canSubmit: boolean;
  userRole: Role;
  churchSettings: {
    assemblyName: string;
    parentBodyName: string;
    districtName?: string | null;
    areaName?: string | null;
    reportRecipientName?: string | null;
    signatoryTitles: string[];
  };
}

export function WeeklyReportView({
  periodId,
  weekEnding,
  formattedRange,
  status,
  reportVersion,
  submittedAt,
  submittedByName,
  cashTotal,
  momoTotal,
  expectedTotal,
  initialBookTotal,
  initialVarianceReason,
  variance,
  varianceStatus,
  categories,
  blockers,
  canSubmit,
  userRole,
  churchSettings,
}: WeeklyReportViewProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [bookTotal, setBookTotal] = useState<string>(initialBookTotal);
  const [varianceReason, setVarianceReason] = useState<string>(
    initialVarianceReason
  );
  const [isBookSaved, setIsBookSaved] = useState<boolean>(true);
  const [isReasonSaved, setIsReasonSaved] = useState<boolean>(true);

  // Sheets state
  const [isSubmitSheetOpen, setIsSubmitSheetOpen] = useState(false);
  const [isUnlockSheetOpen, setIsUnlockSheetOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");

  const isTreasurer = userRole === Role.TREASURER;
  const isSecretary = userRole === Role.FINANCE_SECRETARY;
  const isReviewer = userRole === Role.REVIEWER;
  const isSubmitted = status === ReconciliationStatus.SUBMITTED;
  const canEdit = !isSubmitted && (isSecretary || isTreasurer);

  // Compute difference
  const expNum = parseFloat(expectedTotal) || 0;
  const bookNum = parseFloat(bookTotal) || 0;
  const diffNum = bookTotal ? bookNum - expNum : 0;
  const isBalanced = bookTotal ? Math.abs(diffNum) < 0.005 : false;

  const handleSaveBookTotal = () => {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await setBookTotalAction({
        periodId,
        amount: bookTotal,
      });
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }
      setIsBookSaved(true);
      addToast("success", "Banked total recorded.");
      router.refresh();
    });
  };

  const handleSaveReason = () => {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await setVarianceReasonAction({
        periodId,
        reason: varianceReason,
      });
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }
      setIsReasonSaved(true);
      addToast("success", "Difference explanation saved.");
      router.refresh();
    });
  };

  const handleSubmitPeriod = () => {
    if (!canSubmit || !isTreasurer) return;
    startTransition(async () => {
      const res = await submitPeriodAction({ periodId });
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }
      setIsSubmitSheetOpen(false);
      addToast("success", "Weekly report successfully approved and signed.");
      router.refresh();
    });
  };

  const handleUnlockPeriod = () => {
    if (!isTreasurer || !unlockReason.trim()) return;
    startTransition(async () => {
      const res = await unlockPeriodAction({
        periodId,
        reason: unlockReason,
      });
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }
      setIsUnlockSheetOpen(false);
      setUnlockReason("");
      addToast("success", "Reconciliation unlocked for adjustment.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-text leading-[34px]">
            Weekly finance report
          </h1>
          <p className="text-[14px] text-muted leading-[20px] mt-0.5">
            Audit week ending {weekEnding} • {formattedRange}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/reconcile/${weekEnding}/preview`}>
            <Button variant="secondary" size="sm">
              <FileText className="w-4 h-4 mr-1.5" />
              Preview return
            </Button>
          </Link>

          {isSubmitted ? (
            <>
              <a
                href={`/api/reports/reconciliation/${periodId}/docx`}
                download
                className="inline-block"
              >
                <Button variant="secondary" size="sm">
                  <Download className="w-4 h-4 mr-1.5" />
                  Download .docx
                </Button>
              </a>
              <a
                href={`/api/reports/reconciliation/${periodId}/pdf`}
                download
                className="inline-block"
              >
                <Button variant="secondary" size="sm">
                  <Download className="w-4 h-4 mr-1.5" />
                  Download PDF
                </Button>
              </a>
              {isTreasurer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUnlockSheetOpen(true)}
                  className="text-bad-ink hover:bg-bad-tint"
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  Unlock
                </Button>
              )}
            </>
          ) : (
            isTreasurer && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSubmitSheetOpen(true)}
                disabled={!canSubmit}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve & sign
              </Button>
            )
          )}
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <WeekSelector currentWeekStartString={weekEnding} />
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isSubmitted
                ? "balanced"
                : isBalanced
                ? "balanced"
                : bookTotal
                ? "mismatch"
                : "neutral"
            }
          >
            {isSubmitted
              ? "Approved & Finalized"
              : isBalanced
              ? "Balanced"
              : bookTotal
              ? "Mismatch"
              : "Draft"}
          </Badge>
        </div>
      </div>

      {/* Blockers alert banner if uncounted/unclassified */}
      {blockers.length > 0 && !isSubmitted && (
        <div className="p-4 bg-warn-tint border border-warn/30 rounded-panel space-y-2">
          <div className="flex items-center gap-2 text-warn-ink font-semibold text-[14px]">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>Items requiring attention before report approval</span>
          </div>
          <ul className="list-disc list-inside text-[13px] text-warn-ink space-y-1">
            {blockers.map((b, idx) => (
              <li key={idx}>
                {b.link ? (
                  <Link href={b.link} className="underline font-medium">
                    {b.message}
                  </Link>
                ) : (
                  b.message
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3-Figure Reconciliation Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Expected */}
        <div className="p-5 bg-surface border border-border rounded-panel space-y-1">
          <p className="text-[12px] font-medium text-muted">
            Expected Collections
          </p>
          <div className="text-[26px] font-semibold text-text num">
            <MoneyText amount={expectedTotal} />
          </div>
          <p className="text-[12px] text-muted">
            Counted cash ({formatMoney(cashTotal)}) + Mobile money ({formatMoney(momoTotal)})
          </p>
        </div>

        {/* Card 2: Banked */}
        <div className="p-5 bg-surface border border-border rounded-panel space-y-1">
          <p className="text-[12px] font-medium text-muted">
            Banked / Physical Return
          </p>
          <div className="text-[26px] font-semibold text-text num">
            <MoneyText amount={bookTotal || "0.00"} />
          </div>
          <p className="text-[12px] text-muted">
            Physical bank deposit slip total
          </p>
        </div>

        {/* Card 3: Difference with Status Mark */}
        <div className="p-5 bg-surface border border-border rounded-panel space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-muted">
              Difference
            </p>
            <Badge
              variant={
                !bookTotal
                  ? "neutral"
                  : isBalanced
                  ? "balanced"
                  : "mismatch"
              }
            >
              {!bookTotal ? "Awaiting Bank Total" : isBalanced ? "Balanced" : "Mismatch"}
            </Badge>
          </div>
          <div
            className={`text-[26px] font-semibold num ${
              !bookTotal
                ? "text-muted"
                : isBalanced
                ? "text-ok-ink"
                : "text-bad-ink"
            }`}
          >
            {bookTotal ? (
              <span>
                {diffNum > 0 ? "+" : ""}
                {formatMoney(diffNum)}
              </span>
            ) : (
              "—"
            )}
          </div>
          <p className="text-[12px] text-muted">
            {isBalanced
              ? "Physical deposits exactly match expected intake"
              : !bookTotal
              ? "Enter physical deposit slip figure to verify"
              : `Variance of ${formatMoney(Math.abs(diffNum))}`}
          </p>
        </div>
      </div>

      {/* Side-by-side Panels: Expected vs Banked (stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Expected Breakdown */}
        <div className="p-6 bg-surface border border-border rounded-panel space-y-4">
          <h2 className="text-[16px] font-semibold text-text leading-[24px]">
            Expected Collections Breakdown
          </h2>

          <div className="divide-y divide-border text-[14px]">
            {categories.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-text">{c.name}</span>
                  <div className="text-[12px] text-muted num">
                    Cash: {formatMoney(c.cash)} • MoMo: {formatMoney(c.momo)}
                  </div>
                </div>
                <span className="font-semibold num text-text">
                  {formatMoney(c.total)}
                </span>
              </div>
            ))}

            <div className="pt-3 flex items-center justify-between font-semibold text-[15px]">
              <span className="text-text">Total Expected</span>
              <span className="num text-text">{formatMoney(expectedTotal)}</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Banked Input & Variance Reason */}
        <div className="p-6 bg-surface border border-border rounded-panel space-y-4">
          <h2 className="text-[16px] font-semibold text-text leading-[24px]">
            Bank Deposit Verification
          </h2>

          <div className="space-y-4">
            <div>
              <AmountInput
                id="book-total"
                label="Physical Bank Deposit Total (GH₵)"
                value={bookTotal}
                onChange={(val) => {
                  setBookTotal(val);
                  setIsBookSaved(false);
                }}
                disabled={!canEdit}
                placeholder="0.00"
              />
              {canEdit && !isBookSaved && (
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveBookTotal}
                    disabled={isPending}
                  >
                    Save banked figure
                  </Button>
                </div>
              )}
            </div>

            {!isBalanced && bookTotal && (
              <div className="p-3 bg-bad-tint text-bad-ink border border-bad/30 rounded-control text-[13px] space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>A difference explanation is required before approval</span>
                </div>
                <TextField
                  label="Explanation for difference"
                  value={varianceReason}
                  onChange={(e) => {
                    setVarianceReason(e.target.value);
                    setIsReasonSaved(false);
                  }}
                  disabled={!canEdit}
                  placeholder="e.g. Bank charge of GH₵ 5 deducted at counter"
                />
                {canEdit && !isReasonSaved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveReason}
                    disabled={isPending || !varianceReason.trim()}
                  >
                    Save explanation
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Weekly Report Panel */}
      <div className="p-6 sm:p-8 bg-surface border border-border rounded-panel space-y-6">
        {/* Assembly Identity Header */}
        <div className="border-b border-border pb-4 space-y-1">
          <p className="text-[12px] font-medium text-muted">
            {churchSettings.parentBodyName}
            {churchSettings.districtName ? ` • ${churchSettings.districtName}` : ""}
            {churchSettings.areaName ? ` • ${churchSettings.areaName}` : ""}
          </p>
          <h2 className="text-[20px] sm:text-[22px] font-semibold text-text leading-[28px]">
            {churchSettings.assemblyName}
          </h2>
          <p className="text-[13px] text-brand font-medium">
            Weekly Financial Return — Week Ending {weekEnding}
          </p>
          {churchSettings.reportRecipientName && (
            <p className="text-[12px] text-muted">
              Submitted to: {churchSettings.reportRecipientName}
            </p>
          )}
        </div>

        {/* Category Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium text-muted">
                <th className="py-2.5 px-3">Fund / Category</th>
                <th className="py-2.5 px-3 text-right">Cash Counted</th>
                <th className="py-2.5 px-3 text-right">Mobile Money</th>
                <th className="py-2.5 px-3 text-right">Total Intake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 px-3 font-medium text-text">{c.name}</td>
                  <td className="py-2.5 px-3 text-right num text-text">
                    {formatMoney(c.cash)}
                  </td>
                  <td className="py-2.5 px-3 text-right num text-text">
                    {formatMoney(c.momo)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold num text-text">
                    {formatMoney(c.total)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold text-text bg-hover/50">
                <td className="py-3 px-3">Total Intake</td>
                <td className="py-3 px-3 text-right num">
                  {formatMoney(cashTotal)}
                </td>
                <td className="py-3 px-3 text-right num">
                  {formatMoney(momoTotal)}
                </td>
                <td className="py-3 px-3 text-right num text-[15px]">
                  {formatMoney(expectedTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatories Section */}
        <div className="pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-8 text-[13px]">
          <div className="space-y-4">
            <div className="w-48 border-b border-border-strong pt-8" />
            <div>
              <p className="font-semibold text-text">
                {churchSettings.signatoryTitles[0] || "Finance Secretary"}
              </p>
              <p className="text-[12px] text-muted">
                Prepared by: {submittedByName || "Finance Officer"}
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:text-right">
            <div className="w-48 sm:ml-auto border-b border-border-strong pt-8" />
            <div>
              <p className="font-semibold text-text">
                {churchSettings.signatoryTitles[1] || "Assembly Treasurer"}
              </p>
              <p className="text-[12px] text-muted">
                {isSubmitted
                  ? `Approved on ${submittedAt ? formatAccraDate(new Date(submittedAt)) : ""}`
                  : "Verification & Approval Signature"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approve & Sign Sheet */}
      <Sheet
        isOpen={isSubmitSheetOpen}
        onClose={() => setIsSubmitSheetOpen(false)}
        title="Approve & Sign Weekly Return"
        description="Once approved, snapshot figures become immutable and official Word and PDF documents are produced."
      >
        <div className="space-y-4 py-3 text-[14px]">
          {!isBalanced && (
            <div className="p-3 bg-bad-tint text-bad-ink rounded-control border border-bad/30 flex items-start gap-2 text-[13px]">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Note: A non-zero difference of GH₵ {Math.abs(diffNum).toFixed(2)} exists. Your explanation will be permanently recorded on the signed document.
              </span>
            </div>
          )}

          <div className="p-3 bg-surface border border-border rounded-control space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">Expected Intake:</span>
              <span className="font-semibold num text-text">GH₵ {expectedTotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Physical Bank Total:</span>
              <span className="font-semibold num text-text">GH₵ {bookTotal}</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setIsSubmitSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitPeriod}
              disabled={isPending}
            >
              {isPending ? "Signing..." : "Confirm & approve report"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Unlock Sheet */}
      <Sheet
        isOpen={isUnlockSheetOpen}
        onClose={() => setIsUnlockSheetOpen(false)}
        title="Unlock Weekly Return"
        description="Unlocking re-opens this week for adjustments. An audit reason is required."
      >
        <div className="space-y-4 py-3">
          <TextField
            label="Reason for unlocking"
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            required
            placeholder="e.g. Correcting physical deposit voucher allocation"
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setIsUnlockSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleUnlockPeriod}
              disabled={isPending || !unlockReason.trim()}
            >
              {isPending ? "Unlocking..." : "Unlock return"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
