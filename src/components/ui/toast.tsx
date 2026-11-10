"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { clsx } from "clsx";
import { X, AlertCircle } from "lucide-react";

export type ToastTone = "neutral" | "balanced" | "mismatch" | "attention" | "success" | "error";

export interface ToastOptions {
  type?: ToastTone;
  tone?: ToastTone;
  message: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  isError: boolean;
}

interface ToastContextValue {
  showToast: (message: string, isErrorOrTone?: boolean | string) => void;
  addToast: {
    (tone: ToastTone, message: string): void;
    (options: ToastOptions): void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, isErrorOrTone: boolean | string = false) => {
    const isError =
      typeof isErrorOrTone === "boolean"
        ? isErrorOrTone
        : isErrorOrTone === "error" ||
          isErrorOrTone === "variance" ||
          isErrorOrTone === "mismatch";
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, isError }]);

    if (!isError) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  const addToast = useCallback(
    ((toneOrOptions: ToastTone | ToastOptions, messageParam?: string) => {
      let message = "";
      let isError = false;

      if (typeof toneOrOptions === "object" && toneOrOptions !== null) {
        const tone = toneOrOptions.tone || toneOrOptions.type || "neutral";
        isError = tone === "error" || tone === "mismatch";
        message = toneOrOptions.message;
      } else {
        isError = toneOrOptions === "error" || toneOrOptions === "mismatch";
        message = messageParam || "";
      }

      showToast(message, isError);
    }) as ToastContextValue["addToast"],
    [showToast]
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, addToast }}>
      {children}
      {/* Phone: top below top bar. Desktop: bottom-left. */}
      <div
        aria-live="polite"
        className={clsx(
          "fixed z-50 flex flex-col gap-2 max-w-[360px] w-full pointer-events-none p-4",
          // Phone: top below top bar
          "top-[56px] left-0 right-0 mx-auto",
          // Desktop: bottom-left
          "md:top-auto md:bottom-6 md:left-6 md:right-auto md:mx-0"
        )}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 bg-surface border rounded-control shadow-overlay text-[14px] leading-[20px]",
              toast.isError
                ? "border-bad text-bad-ink bg-bad-tint"
                : "border-border text-text bg-surface"
            )}
          >
            <div className="flex items-center gap-2">
              {toast.isError && <AlertCircle className="w-4 h-4 flex-shrink-0 text-bad" aria-hidden="true" />}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 -mr-1 text-muted hover:text-text rounded-control hover:bg-hover transition-colors touch-target flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
