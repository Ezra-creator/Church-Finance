"use client";

import React, { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { useToast } from "@/components/ui/toast";
import { formatCedi } from "@/lib/money";
import { formatAccraDate } from "@/lib/dates";
import { confirmDepositAction } from "../actions";
import { AttachmentViewerModal } from "@/features/attachments/components/attachment-viewer-modal";
import { FileText, CheckCircle2 } from "lucide-react";

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
          type: "success",
          message: `Bank deposit of ${formatCedi(deposit.amount)} confirmed.`,
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
        title="Bank Deposit Verification"
        description={`Ref: ${deposit.bankReference} • ${formatAccraDate(new Date(deposit.depositDate))}`}
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
              {deposit.kind === "CASH_DEPOSIT" ? "Cash Bank Deposit" : "MoMo Bank Transfer"}
            </span>
            <div className="text-3xl font-mono tabular-nums font-bold text-ink">
              {formatCedi(deposit.amount)}
            </div>
            <div className="pt-1">
              <StatusMark
                tone={isConfirmed ? "balanced" : "attention"}
                label={isConfirmed ? "Confirmed by Treasurer" : "Pending Confirmation"}
              />
            </div>
          </div>

          {/* Deposit Details */}
          <div className="space-y-3 text-xs font-mono">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-rule">
              <div>
                <span className="text-ink-soft block uppercase">Bank Reference</span>
                <span className="text-sm font-semibold text-ink">{deposit.bankReference}</span>
              </div>
              <div>
                <span className="text-ink-soft block uppercase">Deposit Date</span>
                <span className="text-sm font-semibold text-ink">
                  {formatAccraDate(new Date(deposit.depositDate))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-rule">
              <div>
                <span className="text-ink-soft block uppercase">Carried By</span>
                <span className="text-ink">{deposit.carriedBy.name}</span>
              </div>
              <div>
                <span className="text-ink-soft block uppercase">Confirmed By</span>
                <span className="text-ink">
                  {deposit.confirmedBy ? deposit.confirmedBy.name : "Awaiting confirmation"}
                </span>
              </div>
            </div>

            {deposit.notes && (
              <div>
                <span className="text-ink-soft block uppercase">Notes / Branch</span>
                <p className="text-ink font-sans pt-0.5">{deposit.notes}</p>
              </div>
            )}
          </div>

          {/* Attached Slip Photo */}
          <div className="space-y-2 pt-2 border-t border-rule">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft block">
              Bank Deposit Slip
            </span>
            {attachment ? (
              <div className="p-3 border border-rule rounded-[2px] flex items-center justify-between gap-3 bg-paper">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-ink-soft" />
                  <div>
                    <p className="text-xs font-medium text-ink">Deposit Slip Document</p>
                    <p className="text-[10px] font-mono text-ink-soft">{attachment.contentType}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewerAttachmentId(attachment.id)}
                >
                  View Slip Photo
                </Button>
              </div>
            ) : (
              <p className="text-xs text-ink-soft italic">No deposit slip attached.</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-rule flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {canConfirm && (
              <Button
                type="button"
                variant="primary"
                isLoading={isPending}
                onClick={handleConfirm}
              >
                Confirm Deposit
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      <AttachmentViewerModal
        isOpen={Boolean(viewerAttachmentId)}
        onClose={() => setViewerAttachmentId(null)}
        attachmentId={viewerAttachmentId}
        title={`Bank Deposit Slip — Ref ${deposit.bankReference}`}
      />
    </>
  );
}
