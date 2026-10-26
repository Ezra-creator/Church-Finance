"use client";

import React, { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { useToast } from "@/components/ui/toast";
import { ExpensePaymentMethod, AttachmentEntityType } from "@prisma/client";
import { AttachmentUploader } from "@/features/attachments/components/attachment-uploader";
import { createExpenseAction, createExpenseCategoryAction } from "../actions";

export interface ExpenseCategoryItem {
  id: string;
  name: string;
}

export interface ExpenseEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategoryItem[];
  onSuccess?: () => void;
}

export function ExpenseEntrySheet({
  isOpen,
  onClose,
  categories: initialCategories,
  onSuccess,
}: ExpenseEntrySheetProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState(initialCategories);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>(ExpensePaymentMethod.CASH);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);

  // New category inline creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    startTransition(async () => {
      setCategoryError(null);
      const res = await createExpenseCategoryAction({ name: newCategoryName.trim() });
      if (res.success) {
        const newCat = { id: res.data.id, name: res.data.name };
        setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
        setCategoryId(newCat.id);
        setIsCreatingCategory(false);
        setNewCategoryName("");
        addToast({ type: "success", message: `Expense category "${newCat.name}" created.` });
      } else {
        setCategoryError(res.error.message);
      }
    });
  };

  const handleSave = async (submitImmediately: boolean) => {
    setErrorMessage(null);

    if (!categoryId) {
      setErrorMessage("Please select or create an expense category.");
      return;
    }

    if (!payee.trim()) {
      setErrorMessage("Payee is required.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Description is required.");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage("Enter a valid expense amount.");
      return;
    }

    startTransition(async () => {
      const res = await createExpenseAction({
        expenseDate,
        categoryId,
        payee: payee.trim(),
        description: description.trim(),
        amount,
        paymentMethod,
        attachmentId,
        submitImmediately,
      });

      if (res.success) {
        addToast({
          type: "success",
          message: submitImmediately
            ? "Expense submitted to treasurer for approval."
            : "Expense draft saved.",
        });
        // Reset form
        setPayee("");
        setDescription("");
        setAmount("");
        setAttachmentId(null);
        onClose();
        onSuccess?.();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Record Parish Expense"
      description="Record支出with payee, description, approval evidence, and receipt photo."
    >
      <div className="space-y-5 py-2">
        {errorMessage && (
          <div className="p-3 bg-variance/10 border border-variance text-variance rounded-[2px] text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Date Input */}
        <TextField
          label="Expense Date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />

        {/* Category Select + Inline Creator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
              Expense Category <span className="text-variance">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="text-xs font-mono text-ink-soft hover:text-ink underline"
            >
              {isCreatingCategory ? "Select existing" : "+ New category"}
            </button>
          </div>

          {!isCreatingCategory ? (
            categories.length > 0 ? (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 border border-rule rounded-[2px] bg-paper text-ink text-sm focus:outline-none focus:border-ink"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 border border-dashed border-rule rounded-[2px] text-xs text-ink-soft">
                No expense categories yet. Click &quot;+ New category&quot; to create the first one.
              </div>
            )
          ) : (
            <div className="p-3 border border-rule rounded-[2px] space-y-2 bg-ink/[0.02]">
              <TextField
                label="New Category Name"
                placeholder="e.g. Utility Bills, Stationery, Mission"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                error={categoryError || undefined}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingCategory(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                  onClick={handleCreateCategory}
                >
                  Save Category
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Payee */}
        <TextField
          label="Payee / Recipient"
          placeholder="e.g. ECG Power, Rev. Minister, Local Vendor"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          required
        />

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
            Description / Purpose <span className="text-variance">*</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what the funds were spent on"
            className="w-full p-2.5 border border-rule rounded-[2px] bg-paper text-ink text-sm focus:outline-none focus:border-ink resize-none"
            required
          />
        </div>

        {/* Amount Input */}
        <AmountInput
          label="Amount (GH₵)"
          value={amount}
          onChange={(val) => setAmount(val)}
          placeholder="0.00"
          required
        />

        {/* Payment Method - Three text options */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
            Payment Method <span className="text-variance">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: ExpensePaymentMethod.CASH, label: "Cash" },
              { id: ExpensePaymentMethod.MOMO, label: "Mobile Money" },
              { id: ExpensePaymentMethod.BANK, label: "Bank Transfer" },
            ].map((method) => {
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`py-2 px-3 text-xs font-medium rounded-[2px] border text-center transition-colors ${
                    isSelected
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper text-ink hover:border-ink-soft"
                  }`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Attachment Uploader */}
        <AttachmentUploader
          entityType={AttachmentEntityType.EXPENSE}
          label="Receipt or Voucher Photo"
          onAttachmentUploaded={(id) => setAttachmentId(id)}
        />

        {/* Action Buttons */}
        <div className="pt-4 border-t border-rule flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave(false)}
            isLoading={isPending}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave(true)}
            isLoading={isPending}
          >
            Submit for Approval
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
