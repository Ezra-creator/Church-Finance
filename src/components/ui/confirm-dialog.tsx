"use client";

import React, { useEffect, useRef, useCallback } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  }, [onCancel, onClose]);

  const loading = isLoading || isPending;
  const destructive = isDestructive || tone === "variance" || tone === "danger";

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        handleClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      if (dialogRef.current) {
        const confirmBtn = dialogRef.current.querySelector<HTMLElement>('button[data-confirm="true"]');
        if (confirmBtn) {
          confirmBtn.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    });

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, loading, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Opaque scrim backdrop */}
      <div
        className="fixed inset-0 bg-scrim"
        onClick={() => !loading && handleClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog with specified shadow */}
      <div
        ref={dialogRef}
        role="alertdialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative z-10 w-full max-w-md bg-surface border border-border p-6 rounded-panel shadow-overlay outline-none text-left"
      >
        <h2
          id="confirm-dialog-title"
          className="text-title font-medium text-text leading-tight"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="text-body text-muted mt-2 leading-normal"
        >
          {description}
        </p>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            data-confirm="true"
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
            isLoading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
