"use client";

import React from "react";
import { Dialog } from "./dialog";
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
  tone?: string;
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
  const handleClose = onClose || onCancel || (() => {});
  const loading = isLoading || isPending;
  const destructive = isDestructive || tone === "danger";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={loading}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div />
    </Dialog>
  );
}
