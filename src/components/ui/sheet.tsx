"use client";

import React, { useEffect } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      className="fixed inset-0 z-50 flex items-stretch justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-scrim transition-opacity duration-150 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Panel: Full-screen below 1024px, right-side 480px on 1024px+ */}
      <div
        className={clsx(
          "relative z-10 w-full lg:w-[480px] bg-surface border-l border-border shadow-overlay flex flex-col h-full max-h-screen transition-transform duration-150 ease-out",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-4 border-b border-border">
          <div>
            <h2 id="sheet-title" className="text-[20px] font-semibold text-text leading-[28px]">
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
            aria-label="Close panel"
            className="p-1 -mr-1 text-muted hover:text-text rounded-control hover:bg-hover transition-colors touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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
