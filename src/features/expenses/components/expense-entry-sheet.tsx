"use client";

import React, { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AmountInput } from "@/components/ui/amount-input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useToast } from "@/components/ui/toast";
import { ExpensePaymentMethod, AttachmentEntityType } from "@prisma/client";
import { AttachmentUploader } from "@/features/attachments/components/attachment-uploader";
import { createExpenseAction, createExpenseCategoryAction } from "../actions";
import { toDecimal } from "@/lib/money";

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

    const dec = toDecimal(amount);
    if (!dec || dec.lte(0)) {
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
      title="Record expense"
      description="Record an expense with payee, description, approval evidence, and receipt photo."
    >
      <div className="space-y-4 py-2">
        {errorMessage && (
          <InlineAlert variant="danger" title={errorMessage} />
        )}

        {/* Date Input */}
        <TextField
          label="Expense date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />

        {/* Category Select + Inline Creator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="expense-category-id" className="text-caption font-medium text-muted">
              Expense category <span className="text-bad-ink">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="text-caption text-accent hover:underline min-h-[44px] flex items-center"
            >
              {isCreatingCategory ? "Select existing" : "+ New category"}
            </button>
          </div>

          {!isCreatingCategory ? (
            categories.length > 0 ? (
              <select
                id="expense-category-id"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-control bg-page text-text text-body focus:outline-none focus:border-accent"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 border border-dashed border-border rounded-control text-caption text-muted">
                No expense categories yet. Click &quot;+ New category&quot; to create the first one.
              </div>
            )
          ) : (
            <div className="p-3 border border-border rounded-control space-y-2 bg-surface">
              <TextField
                label="New category name"
                placeholder="e.g. Utility bills, Stationery, Mission"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                error={categoryError || undefined}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
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
                  Save category
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Payee */}
        <TextField
          label="Payee / recipient"
          placeholder="e.g. ECG Power, Local Vendor"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          required
        />

        {/* Description */}
        <div className="space-y-1">
          <label className="text-caption font-medium text-muted">
            Description / purpose <span className="text-bad-ink">*</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what the funds were spent on"
            className="w-full p-2.5 border border-border rounded-control bg-page text-text text-body focus:outline-none focus:border-accent resize-none"
            required
          />
        </div>

        {/* Amount Input */}
        <AmountInput
          label="Amount"
          value={amount}
          onChange={(val) => setAmount(val)}
          placeholder="0.00"
          required
        />

        {/* Payment Method */}
        <div className="space-y-1.5">
          <label className="text-caption font-medium text-muted">
            Payment method <span className="text-bad-ink">*</span>
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
                  className={`py-2 px-3 text-caption font-medium rounded-control border text-center transition-colors min-h-[44px] ${
                    isSelected
                      ? "border-accent bg-accent text-on-accent"
                      : "border-border bg-page text-muted hover:border-border-strong"
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
          label="Receipt or voucher photo"
          onAttachmentUploaded={(id) => setAttachmentId(id)}
        />

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSave(false)}
            isLoading={isPending}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave(true)}
            isLoading={isPending}
          >
            Submit for approval
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
