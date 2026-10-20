"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { clsx } from "clsx";
import { StatusTone } from "./status-mark";

export interface ToastMessage {
  id: string;
  message: string;
  tone?: StatusTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: StatusTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, tone: StatusTone = "neutral") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, tone }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const toneDot = {
    balanced: "bg-balanced",
    variance: "bg-variance",
    attention: "bg-attention",
    neutral: "bg-ink",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-16 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto flex items-center gap-2.5 px-4 py-3 bg-paper border border-ink text-sm text-ink rounded-[2px]"
            )}
          >
            <span
              className={clsx("w-2 h-2 rounded-[1px] flex-shrink-0", toneDot[toast.tone || "neutral"])}
            />
            <span className="flex-1 text-xs font-medium">{toast.message}</span>
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
