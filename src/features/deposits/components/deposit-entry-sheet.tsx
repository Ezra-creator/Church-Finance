"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useToast } from "@/components/ui/toast";
import { DepositKind, AttachmentEntityType } from "@prisma/client";
import { formatCedi, parseCedi, toDecimal } from "@/lib/money";
import { AttachmentUploader } from "@/features/attachments/components/attachment-uploader";
import { recordDepositAction } from "../actions";

export interface ChurchUserOption {
  id: string;
  name: string;
  role: string;
}

export interface DepositEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChurchUserOption[];
  cashHeld: string;
  momoHeld: string;
  onSuccess?: () => void;
}

export function DepositEntrySheet({
  isOpen,
  onClose,
  users,
  cashHeld,
  momoHeld,
  onSuccess,
}: DepositEntrySheetProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<DepositKind>(DepositKind.CASH_DEPOSIT);
  const [amount, setAmount] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [carriedById, setCarriedById] = useState(users[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mismatchWarning = useMemo(() => {
    const enteredDec = toDecimal(amount);
    if (!enteredDec || enteredDec.lte(0)) return null;

    try {
      const heldTarget = kind === DepositKind.CASH_DEPOSIT ? cashHeld : momoHeld;
      const heldDec = parseCedi(heldTarget);

      if (!enteredDec.equals(heldDec)) {
        const diff = enteredDec.minus(heldDec).abs();
        const direction = enteredDec.greaterThan(heldDec) ? "more" : "less";
        return {
          diffFormatted: formatCedi(diff),
          direction,
          heldFormatted: formatCedi(heldDec),
        };
      }
    } catch {
      return null;
    }

    return null;
  }, [amount, kind, cashHeld, momoHeld]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const enteredDec = toDecimal(amount);
    if (!enteredDec || enteredDec.lte(0)) {
      setErrorMessage("Enter a valid deposit amount.");
      return;
    }

    if (!bankReference.trim()) {
      setErrorMessage("Bank reference or slip number is required.");
      return;
    }

    if (!carriedById) {
      setErrorMessage("Select the person who carried the deposit.");
      return;
    }

    if (kind === DepositKind.CASH_DEPOSIT && !attachmentId) {
      setErrorMessage("A bank deposit slip photo is required for cash deposits.");
      return;
    }

    startTransition(async () => {
      const res = await recordDepositAction({
        depositDate,
        kind,
        amount,
        bankReference: bankReference.trim(),
        carriedById,
        notes: notes.trim() || undefined,
        attachmentId,
      });

      if (res.success) {
        addToast({
          type: "success",
          message: `Bank deposit of ${formatCedi(amount)} recorded.`,
        });
        setAmount("");
        setBankReference("");
        setNotes("");
        setAttachmentId(null);
        onClose();
        onSuccess?.();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const targetHeld = kind === DepositKind.CASH_DEPOSIT ? cashHeld : momoHeld;
  const targetHeldFormatted = formatCedi(targetHeld);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Record bank deposit"
      description="Record physical cash or Mobile Money funds deposited into the church bank account."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMessage && (
          <InlineAlert variant="danger" title={errorMessage} />
        )}

        {/* Kind Toggle */}
        <div className="space-y-1.5">
          <label className="text-caption font-medium text-muted">
            Deposit type <span className="text-bad-ink">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: DepositKind.CASH_DEPOSIT, label: "Cash bank deposit" },
              { id: DepositKind.MOMO_TRANSFER, label: "MoMo to bank transfer" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={`py-2 px-3 text-caption font-medium rounded-control border text-center transition-colors min-h-[44px] ${
                  kind === item.id
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-page text-muted hover:border-border-strong"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Input */}
        <TextField
          label="Deposit date"
          type="date"
          value={depositDate}
          onChange={(e) => setDepositDate(e.target.value)}
          required
        />

        {/* Amount Input */}
        <div>
          <AmountInput
            label="Deposit amount"
            value={amount}
            onChange={(val) => setAmount(val)}
            placeholder="0.00"
            required
          />

          {/* Pre-submit comparison line */}
          <div className="mt-1.5 flex items-center gap-1.5 text-caption text-muted">
            <span>
              Held in the system: <strong className="text-text tnum">{targetHeldFormatted}</strong>
            </span>
          </div>

          {/* Mismatch warning banner */}
          {mismatchWarning && (
            <div className="mt-2.5">
              <InlineAlert
                variant="warn"
                title="Deposit amount differs from held balance"
              />
            </div>
          )}
        </div>

        {/* Bank Reference */}
        <TextField
          label="Bank reference / slip number"
          placeholder="e.g. SLIP-892341 or Transfer Ref"
          value={bankReference}
          onChange={(e) => setBankReference(e.target.value)}
          required
        />

        {/* Who carried it */}
        <div className="space-y-1.5">
          <label htmlFor="deposit-carried-by" className="text-caption font-medium text-muted">
            Carried by (church officer or member) <span className="text-bad-ink">*</span>
          </label>
          <select
            id="deposit-carried-by"
            value={carriedById}
            onChange={(e) => setCarriedById(e.target.value)}
            className="w-full h-10 px-3 border border-border rounded-control bg-page text-text text-body focus:outline-none focus:border-accent"
            required
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.replace(/_/g, " ")})
              </option>
            ))}
          </select>
        </div>

        {/* Slip Photo Uploader */}
        <AttachmentUploader
          entityType={AttachmentEntityType.DEPOSIT}
          label="Bank deposit slip photo"
          required={kind === DepositKind.CASH_DEPOSIT}
          onAttachmentUploaded={(id) => setAttachmentId(id)}
        />

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-caption font-medium text-muted">
            Notes / bank branch (optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. GCB Bank High Street Branch"
            className="w-full p-2.5 border border-border rounded-control bg-page text-text text-body focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Record deposit
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
