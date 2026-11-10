"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, ReconciliationStatus } from "@prisma/client";
import {
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Unlock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Sheet } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCedi, toDecimal } from "@/lib/money";
import { formatAccraDateTime } from "@/lib/dates";
import { plural } from "@/lib/plural";
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

  const isVarianceBalanced = varianceStatus === "BALANCED";
  const hasVarianceBlocker = parallelRunActive && !isVarianceBalanced;

  const handleSaveBookTotal = (val: string) => {
    if (!canEdit) return;

    startTransition(async () => {
      const res = await setBookTotalAction({
        periodId,
        amount: val,
      });

      if (!res.success) {
        addToast({ type: "error", message: res.error.message });
        return;
      }

      addToast({ type: "success", message: "Recorded book total updated." });
      router.refresh();
    });
  };

  const handleSaveVarianceReason = () => {
    if (!canEdit) return;

    startTransition(async () => {
      const res = await setVarianceReasonAction({
        periodId,
        reason: varianceReason,
      });

      if (!res.success) {
        addToast({ type: "error", message: res.error.message });
        return;
      }

      addToast({ type: "success", message: "Variance explanation recorded." });
      router.refresh();
    });
  };

  const handleSubmitPeriod = () => {
    if (!canEdit || !canSubmit || hasVarianceBlocker) return;

    startTransition(async () => {
      const res = await submitPeriodAction({ periodId });
      if (!res.success) {
        addToast({ type: "error", message: res.error.message });
        return;
      }

      addToast({
        type: "success",
        message: `Period submitted (Report v${res.data.version}).`,
      });
      router.refresh();
    });
  };

  const handleUnlockPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTreasurer || !unlockReason.trim()) return;

    startTransition(async () => {
      const res = await unlockPeriodAction({
        periodId,
        reason: unlockReason.trim(),
      });

      if (!res.success) {
        addToast({ type: "error", message: res.error.message });
        return;
      }

      addToast({
        type: "success",
        message: "Reconciliation period unlocked for correction.",
      });
      setIsUnlockSheetOpen(false);
      setUnlockReason("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={formattedRange}
        description={`Audit period ending ${weekEnding}. Consolidating physical service collections and verified Mobile money payments.`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/reconcile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                All weeks
              </Button>
            </Link>

            <Link href={`/reconcile/${weekEnding}/preview`}>
              <Button variant="secondary" size="sm">
                <FileText className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                Preview report
              </Button>
            </Link>

            {isSubmitted && isTreasurer && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsUnlockSheetOpen(true)}
              >
                <Unlock className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                Unlock for correction
              </Button>
            )}
          </div>
        }
      />

      {/* Submitted Confirmation Banner */}
      {isSubmitted && (
        <div className="p-4 bg-surface border border-ok rounded-panel space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-ok-ink font-medium text-body">
              <Check className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
              <span>
                Report submitted • Version {reportVersion}
              </span>
            </div>

            <div className="text-caption text-muted">
              {submittedAt ? formatAccraDateTime(submittedAt) : ""}{" "}
              {submittedByName ? `by ${submittedByName}` : ""}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3 border-t border-border flex-wrap">
            <a
              href={`/api/reports/reconciliation/${periodId}/docx`}
              download
              className="inline-block"
            >
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                Download Word (.docx)
              </Button>
            </a>

            <a
              href={`/api/reports/reconciliation/${periodId}/pdf`}
              download
              className="inline-block"
            >
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                Download PDF (.pdf)
              </Button>
            </a>

            <span className="text-caption text-muted">
              Snapshot figures are immutable and match generated exports.
            </span>
          </div>
        </div>
      )}

      {/* Expected / Banked / Difference strip */}
      <div className="p-6 bg-surface border border-border rounded-panel space-y-4">
        <h3 className="text-body font-medium text-text pb-2 border-b border-border">
          Weekly balance
        </h3>

        <div className="space-y-3 text-body">
          {/* Row 1: Cash counted */}
          <div className="flex items-center justify-between py-1">
            <span className="text-text">Cash counted (verified physical service sheets)</span>
            <span className="tabular-nums font-medium text-text tnum">
              {formatCedi(cashTotal)}
            </span>
          </div>

          {/* Row 2: MoMo received */}
          <div className="flex items-center justify-between py-1">
            <span className="text-text">Mobile money received (statement payments)</span>
            <span className="tabular-nums font-medium text-text tnum">
              {formatCedi(momoTotal)}
            </span>
          </div>

          {/* Row 3: Expected */}
          <div className="flex items-center justify-between py-2 border-t border-border font-medium">
            <span className="text-text">Expected total</span>
            <span className="tabular-nums text-lead text-text tnum">
              {formatCedi(expectedTotal)}
            </span>
          </div>

          {/* Row 4: Recorded in books (Parallel run) */}
          {parallelRunActive && (
            <div className="pt-2 pb-1 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-text font-medium">Recorded in books</span>
                <p className="text-caption text-muted">
                  Entered during parallel run comparison.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canEdit ? (
                  <AmountInput
                    value={bookTotal}
                    onChange={(val) => setBookTotal(val)}
                    onBlur={() => handleSaveBookTotal(bookTotal)}
                    placeholder="0.00"
                    className="w-40 text-right"
                  />
                ) : (
                  <span className="tabular-nums font-medium text-text text-body tnum">
                    {bookTotal ? formatCedi(bookTotal) : "—"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Row 5: Difference */}
          {parallelRunActive && varianceStatus !== "NO_BOOK_TOTAL" && (
            <div className="pt-3 pb-1 border-t border-border flex items-center justify-between">
              <span className="text-text font-medium">Difference</span>
              <div>
                {isVarianceBalanced ? (
                  <Badge variant="balanced" label="Balanced" />
                ) : (
                  <Badge variant="mismatch" amount={variance} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Variance Explanation Field */}
      {parallelRunActive && !isVarianceBalanced && varianceStatus !== "NO_BOOK_TOTAL" && (
        <div className="p-5 bg-surface border border-border rounded-panel space-y-3">
          <label className="text-caption font-medium text-text block">
            Explanation for book variance <span className="text-bad-ink">*</span>
          </label>
          <p className="text-caption text-muted">
            Explain the difference between the physical book entry and the audited system total.
          </p>

          <textarea
            rows={3}
            disabled={!canEdit || isPending}
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            placeholder="e.g. Counter arithmetic correction on physical collection sheet..."
            className="w-full text-body bg-page border border-border rounded-control p-2.5 text-text focus:outline-none focus:border-accent resize-none"
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

      {/* Income Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lead font-semibold text-text">
            Income breakdown ({categories.length})
          </h3>
          <span className="text-caption text-muted">
            Aggregated cash and Mobile money
          </span>
        </div>

        <div className="border border-border rounded-panel overflow-hidden bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Giving category</TableHead>
                <TableHead className="text-right">Cash counted</TableHead>
                <TableHead className="text-right">Mobile money</TableHead>
                <TableHead className="text-right">Total received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-text">
                    {c.name}{" "}
                    <span className="text-caption text-muted">({c.code})</span>
                  </TableCell>
                  <TableCell className="text-right text-text tnum">
                    {formatCedi(c.cash)}
                  </TableCell>
                  <TableCell className="text-right text-text tnum">
                    {formatCedi(c.momo)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-text tnum">
                    {formatCedi(c.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-border bg-page px-4 py-3 flex items-center justify-between text-body font-medium text-text">
            <span>Total income</span>
            <div className="flex items-center gap-6 text-right">
              <span className="tnum hidden sm:inline">{formatCedi(cashTotal)}</span>
              <span className="tnum hidden sm:inline">{formatCedi(momoTotal)}</span>
              <span className="tnum font-medium text-lead">{formatCedi(expectedTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Before You Submit Blockers List */}
      {!isSubmitted && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lead font-semibold text-text">
              Before you submit
            </h3>
            <span
              className={`text-caption font-medium ${
                blockers.length === 0 && !hasVarianceBlocker ? "text-ok-ink" : "text-warn-ink"
              }`}
            >
              {blockers.length === 0 && !hasVarianceBlocker
                ? "All requirements fulfilled"
                : `${plural(blockers.length + (hasVarianceBlocker ? 1 : 0), "blocker", "blockers")} remaining`}
            </span>
          </div>

          {blockers.length === 0 && !hasVarianceBlocker ? (
            <div className="p-4 bg-surface border border-ok rounded-panel flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-ok-ink text-body">
                <Check className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
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
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" strokeWidth={1.75} />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit report
                      <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={1.75} />
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-panel bg-surface">
              {hasVarianceBlocker && (
                <div className="p-3.5 flex items-center justify-between gap-3 text-caption">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-warn-ink flex-shrink-0" strokeWidth={1.75} />
                    <span className="text-text font-medium leading-relaxed">
                      Audited system total does not match recorded book total. Reconcile difference before submitting.
                    </span>
                  </div>
                </div>
              )}
              {blockers.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3.5 flex items-center justify-between gap-3 text-caption"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-warn-ink flex-shrink-0" strokeWidth={1.75} />
                    <span className="text-text font-medium leading-relaxed">
                      {b.message}
                    </span>
                  </div>

                  {b.link && (
                    <Link href={b.link}>
                      <Button variant="ghost" size="sm">
                        Resolve
                        <ExternalLink className="w-3.5 h-3.5 ml-1" strokeWidth={1.75} />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Treasurer Unlock Sheet */}
      <Sheet
        isOpen={isUnlockSheetOpen}
        onClose={() => setIsUnlockSheetOpen(false)}
        title="Unlock period for correction"
        description="Treasurer authorization required. Unlocking resets the period to draft and unlocks included service count sheets and Mobile money transactions for amendment."
      >
        <form onSubmit={handleUnlockPeriod} className="space-y-4 pt-3">
          <InlineAlert
            variant="warn"
            title={`When corrections are finished, resubmitting this period will increment the report to Version ${reportVersion + 1} with an updated immutable snapshot.`}
          />

          <div>
            <label className="text-caption font-medium text-muted block mb-1.5">
              Reason for correction <span className="text-bad-ink">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Correcting physical cash denomination entry..."
              className="w-full text-body bg-page border border-border rounded-control p-2.5 text-text focus:outline-none focus:border-accent resize-none"
            />
            <p className="text-caption text-muted mt-1">
              Minimum 5 characters. This explanation will be permanently recorded in the audit log.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUnlockSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isPending || unlockReason.trim().length < 5}
            >
              Authorize unlock
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
