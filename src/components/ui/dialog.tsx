"use client";

import React, { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "default" | "import";
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "default",
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = size === "import" ? "md:max-w-[640px]" : "md:max-w-[480px]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
    >
      {/* Opaque Scrim Backdrop */}
      <div
        className="fixed inset-0 bg-scrim transition-opacity duration-150 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Panel: Bottom Sheet below 768px, Centered Dialog on 768px+ */}
      <div
        ref={panelRef}
        className={clsx(
          "relative z-10 w-full bg-surface border border-border shadow-overlay flex flex-col transition-transform duration-150 ease-out",
          // Mobile: bottom sheet
          "max-h-[90dvh] rounded-t-[12px] md:rounded-panel",
          // Tablet & Desktop: centered dialog
          maxWidthClass,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-2">
          <div>
            <h2 id="dialog-title" className="text-[20px] font-semibold text-text leading-[28px]">
              {title}
            </h2>
            {description && (
              <p className="text-[14px] text-muted leading-[20px] mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 -mr-1 text-muted hover:text-text rounded-control hover:bg-hover transition-colors touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 pt-2 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

