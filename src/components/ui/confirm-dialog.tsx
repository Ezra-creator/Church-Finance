"use client";

import React, { useEffect, useCallback } from "react";
import { Button } from "./button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  isPending?: boolean;
  tone?: "variance" | "balanced" | "neutral" | "attention" | string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
  isPending = false,
  tone,
}: ConfirmDialogProps) {
  const handleClose = useCallback(() => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  }, [onCancel, onClose]);
  const loading = isLoading || isPending;
  const destructive = isDestructive || tone === "variance";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-[1px]"
        onClick={() => !loading && handleClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative z-10 w-full max-w-md bg-paper border border-ink p-6 rounded-[2px]"
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-serif font-normal text-ink"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="text-sm text-ink-soft mt-2 leading-relaxed"
        >
          {description}
        </p>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-rule">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
            isLoading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
