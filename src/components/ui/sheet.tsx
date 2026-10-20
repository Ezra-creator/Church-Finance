"use client";

import React, { useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";
import { Button } from "./button";

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
    <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/25 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel: bottom sheet on mobile, right side panel on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={twMerge(
          clsx(
            "relative z-10 w-full bg-paper flex flex-col border-t lg:border-t-0 lg:border-l border-rule shadow-none",
            "max-h-[90vh] lg:max-h-full lg:w-[440px] transition-transform",
            className
          )
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-rule">
          <div>
            <h2
              id="sheet-title"
              className="text-lg font-serif font-normal text-ink leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-ink-soft mt-1">{description}</p>
            )}
          </div>
          <Button
            variant="quiet"
            size="sm"
            onClick={onClose}
            className="p-1 min-h-[36px] min-w-[36px] -mr-2 -mt-1 text-ink-soft hover:text-ink"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-rule bg-paper flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
