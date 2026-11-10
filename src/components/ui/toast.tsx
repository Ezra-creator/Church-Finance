"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

export type StatusTone = "balanced" | "variance" | "attention" | "neutral" | "success" | "danger" | "warning" | "ok" | "bad" | "warn";

export type ToastTone = StatusTone | "success" | "error" | "ok" | "bad" | "warn";

export interface ToastOptions {
  type?: ToastTone;
  tone?: ToastTone;
  message: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  tone?: StatusTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: StatusTone) => void;
  addToast: {
    (tone: ToastTone, message: string): void;
    (options: ToastOptions): void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: StatusTone = "neutral") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, tone }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const addToast = useCallback(
    ((toneOrOptions: ToastTone | ToastOptions, messageParam?: string) => {
      let resolvedTone: ToastTone = "neutral";
      let message = "";

      if (typeof toneOrOptions === "object" && toneOrOptions !== null) {
        resolvedTone = toneOrOptions.tone || toneOrOptions.type || "neutral";
        message = toneOrOptions.message;
      } else {
        resolvedTone = toneOrOptions;
        message = messageParam || "";
      }

      const finalTone: StatusTone =
        resolvedTone === "success"
          ? "balanced"
          : resolvedTone === "error"
          ? "variance"
          : resolvedTone;
      showToast(message, finalTone);
    }) as ToastContextValue["addToast"],
    [showToast]
  );

  const toneDot: Record<string, string> = {
    balanced: "bg-ok",
    success: "bg-ok",
    ok: "bg-ok",
    variance: "bg-bad",
    danger: "bg-bad",
    error: "bg-bad",
    bad: "bg-bad",
    attention: "bg-warn",
    warning: "bg-warn",
    warn: "bg-warn",
    neutral: "bg-muted",
  };

  return (
    <ToastContext.Provider value={{ showToast, addToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 bg-surface border border-border text-text rounded-panel shadow-overlay"
            )}
          >
            <span
              className={clsx(
                "w-2 h-2 rounded-full flex-shrink-0",
                toneDot[toast.tone || "neutral"]
              )}
              aria-hidden="true"
            />
            <span className="flex-1 text-body font-medium text-text">
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 -mr-1 text-muted hover:text-text rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close notification"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
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
