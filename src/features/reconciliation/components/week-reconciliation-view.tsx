"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, ReconciliationStatus } from "@prisma/client";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Lock,
  Unlock,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { RuleHeading } from "@/components/ui/rule-heading";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { StatusMark } from "@/components/ui/status-mark";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatCedi } from "@/lib/money";
import { formatAccraDateTime } from "@/lib/dates";
import {
  setBookTotalAction,
  setVarianceReasonAction,
  submitPeriodAction,
  unlockPeriodAction,
} from "../actions";

export interface CategoryBreakdownRow {
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

export interface WeekReconciliationViewProps {
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
  varianceLabel: string;
  categories: CategoryBreakdownRow[];
  blockers: BlockerItem[];
  canSubmit: boolean;
  parallelRunActive: boolean;
  userRole: Role;
}

export function WeekReconciliationView({
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
  varianceLabel,
  categories,
  blockers,
  canSubmit,
  parallelRunActive,
  userRole,
}: WeekReconciliationViewProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [bookTotal, setBookTotal] = useState<string>(initialBookTotal);
  const [varianceReason, setVarianceReason] = useState<string>(initialVarianceReason);
  const [isUnlockSheetOpen, setIsUnlockSheetOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const isSubmitted = status === ReconciliationStatus.SUBMITTED;
  const isTreasurer = userRole === Role.TREASURER;
  const canEdit =
    !isSubmitted &&
    (userRole === Role.FINANCE_SECRETARY || userRole === Role.TREASURER);

  // Update book total
  const handleSaveBookTotal = (val: string) => {
    if (!canEdit) return;

    startTransition(async () => {
      const res = await setBookTotalAction({
        periodId,
        amount: val,
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      addToast("success", "Paper book total updated.");
      router.refresh();
    });
  };

  // Update variance reason
  const handleSaveVarianceReason = () => {
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

      addToast("success", "Variance reason recorded.");
      router.refresh();
    });
  };

  // Submit period
  const handleSubmitPeriod = () => {
    if (!canEdit || !canSubmit) return;

    startTransition(async () => {
      const res = await submitPeriodAction({ periodId });
      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      addToast("success", `Period submitted successfully (Report v${res.data.version}).`);
      router.refresh();
    });
  };

  // Unlock period
  const handleUnlockPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTreasurer || !unlockReason.trim()) return;

    startTransition(async () => {
      const res = await unlockPeriodAction({
        periodId,
        reason: unlockReason.trim(),
      });

      if (!res.success) {
        addToast("error", res.error.message);
        return;
      }

      addToast("success", "Reconciliation period unlocked for correction.");
      setIsUnlockSheetOpen(false);
      setUnlockReason("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <RuleHeading
        eyebrow="Weekly Reconciliation"
        title={formattedRange}
        description={`Audit period ending ${weekEnding}. Consolidating Sunday services, midweek collections, and verified Mobile Money payments.`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/reconcile">
              <Button variant="quiet" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                All weeks
              </Button>
            </Link>

            <Link href={`/reconcile/${weekEnding}/preview`}>
              <Button variant="secondary" size="sm">
                <FileText className="w-4 h-4 mr-1.5" />
                Preview return
              </Button>
            </Link>

            {isSubmitted && isTreasurer && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsUnlockSheetOpen(true)}
                className="text-variance border-variance/40 hover:bg-variance/5"
              >
                <Unlock className="w-4 h-4 mr-1.5" />
                Unlock for correction
              </Button>
            )}
          </div>
        }
      />

      {/* SUBMITTED CONFIRMATION BANNER */}
      {isSubmitted && (
        <div className="p-4 bg-balanced/10 border border-balanced rounded-[2px] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-balanced font-medium text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>
                Submitted to Presbytery • Report Version {reportVersion}
              </span>
            </div>

            <div className="text-xs font-mono text-ink-soft">
              {submittedAt ? formatAccraDateTime(submittedAt) : ""}{" "}
              {submittedByName ? `by ${submittedByName}` : ""}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3 border-t border-balanced/20 flex-wrap">
            <a
              href={`/api/reports/reconciliation/${periodId}/docx`}
              download
              className="inline-block"
            >
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Download Word (.docx)
              </Button>
            </a>

            <a
              href={`/api/reports/reconciliation/${periodId}/pdf`}
              download
              className="inline-block"
            >
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF (.pdf)
              </Button>
            </a>

            <span className="text-xs text-ink-soft">
              Snapshot figures are immutable and match generated exports.
            </span>
          </div>
        </div>
      )}

      {/* THE RECONCILIATION LEDGER */}
      <div className="p-6 bg-paper border border-rule rounded-[2px] space-y-4">
        <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-ink-soft pb-2 border-b border-rule">
          Weekly Balance Ledger
        </h3>

        <div className="space-y-3 text-sm">
          {/* Row 1: Cash counted */}
          <div className="flex items-center justify-between py-1">
            <span className="text-ink">Cash counted (verified physical service sheets)</span>
            <span className="font-mono tabular-nums font-medium text-ink">
              {formatCedi(cashTotal)}
            </span>
          </div>

          {/* Row 2: MoMo received */}
          <div className="flex items-center justify-between py-1">
            <span className="text-ink">Mobile Money received (classified statement payments)</span>
            <span className="font-mono tabular-nums font-medium text-ink">
              {formatCedi(momoTotal)}
            </span>
          </div>

          {/* Row 3: Expected (Bold) */}
          <div className="flex items-center justify-between py-2 border-t border-rule font-semibold">
            <span className="text-ink">Expected System Total</span>
            <span className="font-mono tabular-nums text-base text-ink">
              {formatCedi(expectedTotal)}
            </span>
          </div>

          {/* Row 4: Recorded in books (Parallel run) */}
          {parallelRunActive && (
            <div className="pt-2 pb-1 border-t border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-ink font-medium">Recorded in physical books</span>
                <p className="text-xs text-ink-soft">
                  Entered from paper ledger books during the parallel-run period.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canEdit ? (
                  <AmountInput
                    value={bookTotal}
                    onChange={(val) => setBookTotal(val)}
                    onBlur={() => handleSaveBookTotal(bookTotal)}
                    placeholder="GH₵ 0.00"
                    className="w-40 text-right font-mono text-sm"
                  />
                ) : (
                  <span className="font-mono tabular-nums font-medium text-ink text-sm">
                    {bookTotal ? formatCedi(bookTotal) : "—"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STATE BAND: Balanced at 0.00 or Short / Over with amount */}
        {parallelRunActive && varianceStatus !== "NO_BOOK_TOTAL" && (
          <div className="pt-2">
            {varianceStatus === "BALANCED" ? (
              <div className="p-4 bg-balanced/10 border border-balanced rounded-[2px] text-balanced flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Balanced with physical record books</span>
                </div>
                <span className="font-mono tabular-nums font-bold text-sm">
                  GH₵ 0.00
                </span>
              </div>
            ) : (
              <div className="p-4 bg-variance/10 border border-variance rounded-[2px] text-variance flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>{varianceStatus === "SHORT" ? "Short by" : "Over by"}</span>
                </div>
                <span className="font-mono tabular-nums font-bold text-sm">
                  {variance ? (varianceStatus === "SHORT" ? formatCedi(variance.replace("-", "")) : formatCedi(variance)) : "—"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VARIANCE REASON FIELD (when variance is non-zero) */}
      {parallelRunActive && varianceStatus !== "BALANCED" && varianceStatus !== "NO_BOOK_TOTAL" && (
        <div className="p-5 bg-paper border border-rule rounded-[2px] space-y-3">
          <label className="text-xs font-mono uppercase tracking-wider text-ink font-semibold block">
            Explanation for Book Variance <span className="text-variance">*</span>
          </label>
          <p className="text-xs text-ink-soft">
            Explain the difference between the physical paper book count and the audited system total for the presbytery return.
          </p>

          <textarea
            rows={3}
            disabled={!canEdit || isPending}
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            placeholder="e.g. Counter arithmetic correction on physical collection sheet page 12..."
            className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2.5 text-ink font-mono focus:outline-none focus:border-ink"
          />

          {canEdit && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending || varianceReason === initialVarianceReason}
                onClick={handleSaveVarianceReason}
              >
                Save explanation
              </Button>
            </div>
          )}
        </div>
      )}

      {/* CATEGORY BREAKDOWN TABLE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b-2 border-rule-strong">
          <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-ink-soft">
            Income Breakdown by Fund ({categories.length})
          </h3>
          <span className="text-xs font-mono text-ink-soft">
            Aggregated Cash & MoMo
          </span>
        </div>

        <div className="border border-rule rounded-[2px] overflow-x-auto bg-paper">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-ink/[0.02] border-b border-rule">
              <tr>
                <th className="py-2.5 px-3 text-ink-soft font-normal">Giving Category</th>
                <th className="py-2.5 px-3 text-ink-soft font-normal text-right">Cash Counted</th>
                <th className="py-2.5 px-3 text-ink-soft font-normal text-right">Mobile Money</th>
                <th className="py-2.5 px-3 text-ink-soft font-normal text-right">Total Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-ink/[0.01]">
                  <td className="py-2.5 px-3 text-ink font-medium">
                    {c.name}{" "}
                    <span className="text-[10px] text-ink-soft uppercase">({c.code})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                    {formatCedi(c.cash)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-ink">
                    {formatCedi(c.momo)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-ink">
                    {formatCedi(c.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-rule-strong bg-ink/[0.02] font-semibold text-ink">
              <tr>
                <td className="py-2.5 px-3">TOTAL INCOME</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{formatCedi(cashTotal)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{formatCedi(momoTotal)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-bold">{formatCedi(expectedTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* "BEFORE YOU SUBMIT" BLOCKERS LIST */}
      {!isSubmitted && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-rule">
            <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-ink">
              Before You Submit
            </h3>
            <span
              className={`text-xs font-mono font-semibold ${
                blockers.length === 0 ? "text-balanced" : "text-attention"
              }`}
            >
              {blockers.length === 0
                ? "All requirements fulfilled"
                : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} remaining`}
            </span>
          </div>

          {blockers.length === 0 ? (
            <div className="p-4 bg-balanced/5 border border-balanced/30 rounded-[2px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-balanced text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  No blockers remain. Physical counts are finalized and all statement payments are classified.
                </span>
              </div>

              {canEdit && (
                <Button
                  variant="primary"
                  disabled={isPending}
                  onClick={handleSubmitPeriod}
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit to presbytery
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-rule border border-rule rounded-[2px] bg-paper">
              {blockers.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-attention flex-shrink-0" />
                    <span className="text-ink font-medium leading-relaxed">
                      {b.message}
                    </span>
                  </div>

                  {b.link && (
                    <Link href={b.link}>
                      <Button variant="quiet" size="sm" className="text-ink hover:text-ink">
                        Resolve
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TREASURER UNLOCK SHEET */}
      <Sheet
        isOpen={isUnlockSheetOpen}
        onClose={() => setIsUnlockSheetOpen(false)}
        title="Unlock Period for Correction"
        description="Treasurer authorization required. Unlocking resets the period to DRAFT and unlocks included service count sheets and MoMo transactions for amendment."
      >
        <form onSubmit={handleUnlockPeriod} className="space-y-4 pt-3">
          <div className="p-3 bg-attention/10 border border-attention text-attention text-xs rounded-[2px] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              When corrections are finished, resubmitting this period will increment the report to Version {reportVersion + 1} with an updated immutable snapshot.
            </p>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
              Reason for Correction <span className="text-variance">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Correcting physical cash denomination entry for Sunday 18 Oct service..."
              className="w-full text-sm bg-paper border border-rule rounded-[2px] p-2 text-ink font-mono focus:outline-none focus:border-ink"
            />
            <p className="text-[11px] text-ink-soft mt-1">
              Minimum 5 characters. This explanation will be permanently recorded in the immutable audit log.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-rule">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsUnlockSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={isPending || unlockReason.trim().length < 5}
              className="text-variance border-variance"
            >
              Authorize unlock
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
