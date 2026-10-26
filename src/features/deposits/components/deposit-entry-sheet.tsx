"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { useToast } from "@/components/ui/toast";
import { DepositKind, AttachmentEntityType } from "@prisma/client";
import { formatCedi, parseCedi } from "@/lib/money";
import { AttachmentUploader } from "@/features/attachments/components/attachment-uploader";
import { recordDepositAction } from "../actions";
import { AlertTriangle, Info } from "lucide-react";

export interface ChurchUserOption {
  id: string;
  name: string;
  role: string;
}

export interface DepositEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChurchUserOption[];
  cashHeld: string; // e.g. "1250.00"
  momoHeld: string; // e.g. "800.00"
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

  // Calculate comparison with held money
  const mismatchWarning = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return null;

    try {
      const enteredDec = parseCedi(amount);
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

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage("Enter a valid deposit amount.");
      return;
    }

    if (!bankReference.trim()) {
      setErrorMessage("Bank reference / slip number is required.");
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
          message: "Bank deposit recorded and submitted to treasurer for confirmation.",
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

  const targetHeldFormatted = kind === DepositKind.CASH_DEPOSIT
    ? formatCedi(cashHeld)
    : formatCedi(momoHeld);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Record Bank Deposit"
      description="Record a cash bank deposit or Mobile Money bank transfer with slip verification."
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {errorMessage && (
          <div className="p-3 bg-variance/10 border border-variance text-variance rounded-[2px] text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Kind Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
            Deposit Kind <span className="text-variance">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: DepositKind.CASH_DEPOSIT, label: "Cash Bank Deposit" },
              { id: DepositKind.MOMO_TRANSFER, label: "MoMo Bank Transfer" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={`py-2 px-3 text-xs font-medium rounded-[2px] border text-center transition-colors ${
                  kind === item.id
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper text-ink hover:border-ink-soft"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <TextField
          label="Deposit Date"
          type="date"
          value={depositDate}
          onChange={(e) => setDepositDate(e.target.value)}
          required
        />

        {/* Amount Input */}
        <div>
          <AmountInput
            label="Deposit Amount (GH₵)"
            value={amount}
            onChange={(val) => setAmount(val)}
            placeholder="0.00"
            required
          />

          {/* Pre-submit comparison line */}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-ink-soft">
            <Info className="w-3.5 h-3.5" />
            <span>
              Held in the system: <strong className="text-ink">{targetHeldFormatted}</strong>
            </span>
          </div>

          {/* Mismatch warning banner */}
          {mismatchWarning && (
            <div className="mt-2.5 p-3 bg-attention/10 border border-attention text-attention rounded-[2px] text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Deposit Amount Differs from Held Balance</span>
              </div>
              <p className="leading-relaxed font-mono">
                The entered deposit of {formatCedi(amount)} is {mismatchWarning.diffFormatted} {mismatchWarning.direction} than the {mismatchWarning.heldFormatted} currently recorded as held.
              </p>
            </div>
          )}
        </div>

        {/* Bank Reference */}
        <TextField
          label="Bank Reference / Slip Number"
          placeholder="e.g. SLIP-892341 or Transfer Ref"
          value={bankReference}
          onChange={(e) => setBankReference(e.target.value)}
          required
        />

        {/* Who carried it */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
            Carried By (Church Officer / Member) <span className="text-variance">*</span>
          </label>
          <select
            value={carriedById}
            onChange={(e) => setCarriedById(e.target.value)}
            className="w-full h-10 px-3 border border-rule rounded-[2px] bg-paper text-ink text-sm focus:outline-none focus:border-ink"
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
          label="Bank Deposit Slip Photo"
          required={kind === DepositKind.CASH_DEPOSIT}
          onAttachmentUploaded={(id) => setAttachmentId(id)}
        />

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
            Notes / Bank Branch (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. GCB Bank High Street Branch"
            className="w-full p-2.5 border border-rule rounded-[2px] bg-paper text-ink text-sm focus:outline-none focus:border-ink resize-none"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-rule flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Record Deposit
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
