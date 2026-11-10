"use client";

import React, { useEffect, useRef } from "react";
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
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
      if (sheetRef.current) {
        const firstFocusable = sheetRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          sheetRef.current.focus();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end">
      {/* Opaque scrim backdrop */}
      <div
        className="fixed inset-0 bg-scrim"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel: bottom sheet on mobile (12px top corners), 480px right panel on desktop with shadow */}
      <div
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={twMerge(
          clsx(
            "relative z-10 w-full bg-surface flex flex-col border-t lg:border-t-0 lg:border-l border-border shadow-overlay outline-none text-left",
            "rounded-t-sheet lg:rounded-none max-h-[90vh] lg:max-h-full lg:w-[480px] lg:max-w-[480px]",
            className
          )
        )}
      >
        {/* Mobile Drag Indicator */}
        <div className="lg:hidden mx-auto my-2.5 h-1 w-12 rounded-full bg-border-strong flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="space-y-0.5">
            <h2
              id="sheet-title"
              className="text-title font-medium text-text leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-caption text-muted">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8 min-h-0 -mr-2 -mt-1 text-muted hover:text-text"
            aria-label="Close sheet"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </Button>
        </div>

        {/* Content body with internal scrolling */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-border bg-surface flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
