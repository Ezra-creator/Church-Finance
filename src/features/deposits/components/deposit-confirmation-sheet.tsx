"use client";

import React, { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import { confirmDepositAction } from "../actions";
import { AttachmentViewerModal } from "@/features/attachments/components/attachment-viewer-modal";

export interface DepositWithDetails {
  id: string;
  depositDate: Date;
  kind: string;
  amount: any;
  bankReference: string;
  status: string;
  notes?: string | null;
  carriedBy: { id: string; name: string; email: string };
  confirmedBy?: { id: string; name: string; email: string } | null;
  attachments?: Array<{ id: string; contentType: string; storageKey: string }>;
}

export interface DepositConfirmationSheetProps {
  deposit: DepositWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  isTreasurer: boolean;
  onSuccess?: () => void;
}

export function DepositConfirmationSheet({
  deposit,
  isOpen,
  onClose,
  isTreasurer,
  onSuccess,
}: DepositConfirmationSheetProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [viewerAttachmentId, setViewerAttachmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!deposit) return null;

  const isConfirmed = deposit.status === "CONFIRMED";
  const canConfirm = isTreasurer && !isConfirmed;

  const handleConfirm = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await confirmDepositAction({ id: deposit.id });
      if (res.success) {
        addToast({
          type: "ok",
          message: `Bank deposit of ${formatMoney(deposit.amount)} confirmed.`,
        });
        onClose();
        onSuccess?.();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const attachment = deposit.attachments?.[0];

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={onClose}
        title="Bank deposit verification"
        description={`Ref: ${deposit.bankReference} • ${formatAccraDate(new Date(deposit.depositDate))}`}
      >
        <div className="space-y-5 py-2">
          {errorMessage && (
            <InlineAlert variant="danger" title={errorMessage} />
          )}

          {/* Amount Callout */}
          <div className="p-4 bg-hover border border-border rounded-panel space-y-1">
            <span className="text-caption font-medium text-muted">
              {deposit.kind === "CASH_DEPOSIT" ? "Cash bank deposit" : "MoMo bank transfer"}
            </span>
            <div className="text-heading font-semibold text-text tnum">
              {formatMoney(deposit.amount)}
            </div>
            <div className="pt-1">
              <Badge variant={isConfirmed ? "Balanced" : "Needs attention"}>
                {isConfirmed ? "Confirmed by treasurer" : "Pending confirmation"}
              </Badge>
            </div>
          </div>

          {/* Deposit Details */}
          <div className="space-y-3 text-caption">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
              <div>
                <span className="text-muted block">Bank reference</span>
                <span className="text-body font-medium text-text">{deposit.bankReference}</span>
              </div>
              <div>
                <span className="text-muted block">Deposit date</span>
                <span className="text-body font-medium text-text">
                  {formatAccraDate(new Date(deposit.depositDate))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
              <div>
                <span className="text-muted block">Carried by</span>
                <span className="text-text font-medium">{deposit.carriedBy.name}</span>
              </div>
              <div>
                <span className="text-muted block">Confirmed by</span>
                <span className="text-text font-medium">
                  {deposit.confirmedBy ? deposit.confirmedBy.name : "Awaiting confirmation"}
                </span>
              </div>
            </div>

            {deposit.notes && (
              <div>
                <span className="text-muted block">Notes or branch</span>
                <p className="text-text pt-0.5">{deposit.notes}</p>
              </div>
            )}
          </div>

          {/* Attached Slip Photo */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-caption font-medium text-muted block">
              Bank deposit slip
            </span>
            {attachment ? (
              <div className="p-3 border border-border rounded-control flex items-center justify-between gap-3 bg-surface">
                <div>
                  <p className="text-caption font-medium text-text">Deposit slip document</p>
                  <p className="text-caption text-muted">{attachment.contentType}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewerAttachmentId(attachment.id)}
                >
                  View slip photo
                </Button>
              </div>
            ) : (
              <p className="text-caption text-muted">No deposit slip attached.</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            {canConfirm && (
              <Button
                type="button"
                variant="primary"
                isLoading={isPending}
                onClick={handleConfirm}
              >
                Confirm deposit
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      <AttachmentViewerModal
        isOpen={Boolean(viewerAttachmentId)}
        onClose={() => setViewerAttachmentId(null)}
        attachmentId={viewerAttachmentId}
        title={`Bank deposit slip — Ref ${deposit.bankReference}`}
      />
    </>
  );
}
