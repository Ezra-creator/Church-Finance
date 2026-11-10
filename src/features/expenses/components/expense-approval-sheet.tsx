"use client";

import React, { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import { approveExpenseAction, rejectExpenseAction, voidExpenseAction } from "../actions";
import { AttachmentViewerModal } from "@/features/attachments/components/attachment-viewer-modal";

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
        addToast({ type: "ok", message: `Expense for ${expense.payee} approved.` });
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
        addToast({ type: "warn", message: `Expense for ${expense.payee} rejected.` });
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
        addToast({ type: "warn", message: `Expense for ${expense.payee} voided.` });
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
        title="Expense verification and approval"
        description={`Ref: ${expense.id} • ${formatAccraDate(new Date(expense.expenseDate))}`}
      >
        <div className="space-y-5 py-2">
          {errorMessage && (
            <InlineAlert variant="danger" title={errorMessage} />
          )}

          {/* Amount Callout */}
          <div className="p-4 bg-hover border border-border rounded-panel space-y-1">
            <span className="text-caption font-medium text-muted">
              Expense amount ({expense.paymentMethod})
            </span>
            <div className="text-heading font-semibold text-text tnum">
              {formatMoney(expense.amount)}
            </div>
            <p className="text-caption text-muted">{expense.category.name}</p>
          </div>

          {/* Payee & Description */}
          <div className="space-y-3 text-body">
            <div>
              <span className="text-caption font-medium text-muted block">
                Payee
              </span>
              <p className="font-medium text-text">{expense.payee}</p>
            </div>

            <div>
              <span className="text-caption font-medium text-muted block">
                Purpose and description
              </span>
              <p className="text-text leading-relaxed">{expense.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border text-caption">
              <div>
                <span className="text-muted block">Requested by</span>
                <span className="text-text font-medium">{expense.requestedBy.name}</span>
              </div>
              <div>
                <span className="text-muted block">Payment method</span>
                <span className="text-text font-medium">{expense.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Receipt Evidence */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-caption font-medium text-muted block">
              Receipt or voucher document
            </span>
            {attachment ? (
              <div className="p-3 border border-border rounded-control flex items-center justify-between gap-3 bg-surface">
                <div>
                  <p className="text-caption font-medium text-text">Attached evidence</p>
                  <p className="text-caption text-muted">{attachment.contentType}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewerAttachmentId(attachment.id)}
                >
                  View receipt
                </Button>
              </div>
            ) : (
              <p className="text-caption text-muted">No receipt photo attached to this expense.</p>
            )}
          </div>

          {/* Separation of duties warning */}
          {isSelfRequested && expense.status === "SUBMITTED" && (
            <InlineAlert
              variant="warn"
              title="Separation of duties policy"
              description="You created this expense request. Church rules prohibit approving your own expenses. Another officer with the Treasurer role must review and approve this."
            />
          )}

          {/* Rejection Form */}
          {isRejecting && (
            <div className="p-3 border border-bad bg-bad-tint rounded-panel space-y-3">
              <label className="text-caption font-medium text-bad-ink block">
                Reason for rejection
              </label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this expense cannot be approved"
                className="w-full p-2 border border-border rounded-control bg-surface text-text text-caption focus:outline-none focus:border-border-strong resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsRejecting(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isPending}
                  onClick={handleReject}
                >
                  Confirm rejection
                </Button>
              </div>
            </div>
          )}

          {/* Void Form */}
          {isVoiding && (
            <div className="p-3 border border-bad bg-bad-tint rounded-panel space-y-3">
              <label className="text-caption font-medium text-bad-ink block">
                Reason for voiding expense
              </label>
              <textarea
                rows={2}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Explain why this approved or paid expense is being voided"
                className="w-full p-2 border border-border rounded-control bg-surface text-text text-caption focus:outline-none focus:border-border-strong resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsVoiding(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isPending}
                  onClick={handleVoid}
                >
                  Confirm void
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div>
              {canVoid && !isVoiding && (
                <button
                  type="button"
                  onClick={() => setIsVoiding(true)}
                  className="text-caption text-bad-ink hover:underline"
                >
                  Void expense
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>

              {canReject && !isRejecting && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setIsRejecting(true)}
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
                  Approve expense
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
        title={`Receipt document — ${expense.payee}`}
      />
    </>
  );
}
