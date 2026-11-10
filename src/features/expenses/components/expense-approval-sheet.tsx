"use client";

import React, { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { useToast } from "@/components/ui/toast";
import { formatCedi } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import { approveExpenseAction, rejectExpenseAction, voidExpenseAction } from "../actions";
import { AttachmentViewerModal } from "@/features/attachments/components/attachment-viewer-modal";
import { FileText, AlertTriangle } from "lucide-react";

export interface ExpenseWithDetails {
  id: string;
  expenseDate: Date;
  payee: string;
  description: string;
  amount: any;
  paymentMethod: string;
  status: string;
  rejectionReason?: string | null;
  voidReason?: string | null;
  category: { id: string; name: string };
  requestedBy: { id: string; name: string; email: string };
  approvedBy?: { id: string; name: string; email: string } | null;
  attachments?: Array<{ id: string; contentType: string; storageKey: string }>;
}

export interface ExpenseApprovalSheetProps {
  expense: ExpenseWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  isTreasurer: boolean;
  onSuccess?: () => void;
}

export function ExpenseApprovalSheet({
  expense,
  isOpen,
  onClose,
  currentUserId,
  isTreasurer,
  onSuccess,
}: ExpenseApprovalSheetProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [viewerAttachmentId, setViewerAttachmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!expense) return null;

  const isSelfRequested = expense.requestedBy.id === currentUserId;
  const canApprove = isTreasurer && expense.status === "SUBMITTED" && !isSelfRequested;
  const canReject = isTreasurer && expense.status === "SUBMITTED";
  const canVoid = isTreasurer && (expense.status === "APPROVED" || expense.status === "PAID");

  const handleApprove = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await approveExpenseAction({ id: expense.id });
      if (res.success) {
        addToast({ type: "success", message: `Expense for ${expense.payee} approved.` });
        onClose();
        onSuccess?.();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setErrorMessage("Enter a reason for rejecting this expense.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await rejectExpenseAction({
        id: expense.id,
        rejectionReason: rejectionReason.trim(),
      });
      if (res.success) {
        addToast({ type: "attention", message: `Expense for ${expense.payee} rejected.` });
        setIsRejecting(false);
        setRejectionReason("");
        onClose();
        onSuccess?.();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleVoid = () => {
    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setErrorMessage("Enter a valid reason (minimum 5 characters) to void this expense.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await voidExpenseAction({
        id: expense.id,
        voidReason: voidReason.trim(),
      });
      if (res.success) {
        addToast({ type: "attention", message: `Expense for ${expense.payee} voided.` });
        setIsVoiding(false);
        setVoidReason("");
        onClose();
        onSuccess?.();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const attachment = expense.attachments?.[0];

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={onClose}
        title="Expense Verification & Approval"
        description={`Ref: ${expense.id} • ${formatAccraDate(new Date(expense.expenseDate))}`}
      >
        <div className="space-y-6 py-2">
          {errorMessage && (
            <div className="p-3 bg-variance/10 border border-variance text-variance rounded-[2px] text-xs font-mono">
              {errorMessage}
            </div>
          )}

          {/* Amount Callout */}
          <div className="p-4 bg-ink/[0.02] border border-rule rounded-[2px] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
              Disbursement Amount ({expense.paymentMethod})
            </span>
            <div className="text-3xl font-mono tabular-nums font-bold text-ink">
              {formatCedi(expense.amount)}
            </div>
            <p className="text-xs font-medium text-ink pt-1">{expense.category.name}</p>
          </div>

          {/* Payee & Description */}
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                Payee
              </span>
              <p className="font-semibold text-ink">{expense.payee}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                Purpose & Description
              </span>
              <p className="text-ink leading-relaxed">{expense.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-rule text-xs font-mono">
              <div>
                <span className="text-ink-soft block">Requested By</span>
                <span className="text-ink">{expense.requestedBy.name}</span>
              </div>
              <div>
                <span className="text-ink-soft block">Payment Method</span>
                <span className="text-ink font-semibold">{expense.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Receipt Evidence */}
          <div className="space-y-2 pt-2 border-t border-rule">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft block">
              Receipt / Voucher Document
            </span>
            {attachment ? (
              <div className="p-3 border border-rule rounded-[2px] flex items-center justify-between gap-3 bg-paper">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-ink-soft" />
                  <div>
                    <p className="text-xs font-medium text-ink">Attached Evidence</p>
                    <p className="text-[10px] font-mono text-ink-soft">{attachment.contentType}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewerAttachmentId(attachment.id)}
                >
                  View Receipt
                </Button>
              </div>
            ) : (
              <p className="text-xs text-ink-soft italic">No receipt photo attached to this expense.</p>
            )}
          </div>

          {/* Separation of duties warning */}
          {isSelfRequested && expense.status === "SUBMITTED" && (
            <div className="p-3 bg-attention/10 border border-attention text-attention rounded-[2px] text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Separation of Duties Policy</span>
              </div>
              <p className="leading-relaxed">
                You created this expense request. The church rules prohibit approving your own expenses. Another officer with the Treasurer role must review and approve this.
              </p>
            </div>
          )}

          {/* Rejection Form */}
          {isRejecting && (
            <div className="p-3 border border-variance/40 bg-variance/5 rounded-[2px] space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-variance font-semibold block">
                Reason for Rejection <span className="text-variance">*</span>
              </label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this expense cannot be approved"
                className="w-full p-2 border border-rule rounded-[2px] bg-paper text-ink text-xs focus:outline-none focus:border-ink resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsRejecting(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-variance hover:bg-variance/90 text-paper"
                  isLoading={isPending}
                  onClick={handleReject}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}

          {/* Void Form */}
          {isVoiding && (
            <div className="p-3 border border-variance/40 bg-variance/5 rounded-[2px] space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-variance font-semibold block">
                Reason for Voiding Expense <span className="text-variance">*</span>
              </label>
              <textarea
                rows={2}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Explain why this approved/paid expense is being voided"
                className="w-full p-2 border border-rule rounded-[2px] bg-paper text-ink text-xs focus:outline-none focus:border-ink resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsVoiding(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-variance hover:bg-variance/90 text-paper"
                  isLoading={isPending}
                  onClick={handleVoid}
                >
                  Confirm Void
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-rule flex items-center justify-between gap-3">
            <div>
              {canVoid && !isVoiding && (
                <button
                  type="button"
                  onClick={() => setIsVoiding(true)}
                  className="text-xs font-mono text-variance hover:underline"
                >
                  Void Expense
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>

              {canReject && !isRejecting && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRejecting(true)}
                  className="text-variance border-variance/30 hover:bg-variance/10"
                >
                  Reject
                </Button>
              )}

              {canApprove && (
                <Button
                  type="button"
                  variant="primary"
                  isLoading={isPending}
                  onClick={handleApprove}
                >
                  Approve Expense
                </Button>
              )}
            </div>
          </div>
        </div>
      </Sheet>

      <AttachmentViewerModal
        isOpen={Boolean(viewerAttachmentId)}
        onClose={() => setViewerAttachmentId(null)}
        attachmentId={viewerAttachmentId}
        title={`Receipt Document — ${expense.payee}`}
      />
    </>
  );
}
