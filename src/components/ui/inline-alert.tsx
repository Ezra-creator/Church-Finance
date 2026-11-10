import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type InlineAlertTone = "info" | "success" | "warning" | "danger" | "warn" | "neutral";

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  variant?: InlineAlertTone;
  title?: string;
  description?: React.ReactNode;
  message?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function InlineAlert({
  tone,
  variant = "info",
  title,
  description,
  message,
  children,
  action,
  className,
}: InlineAlertProps) {
  const activeTone = tone || variant;
  const toneStyles: Record<InlineAlertTone, string> = {
    info: "bg-hover text-text border border-border",
    neutral: "bg-hover text-text border border-border",
    success: "bg-ok-tint text-ok-ink border border-ok",
    warning: "bg-warn-tint text-warn-ink border border-warn",
    warn: "bg-warn-tint text-warn-ink border border-warn",
    danger: "bg-bad-tint text-bad-ink border border-bad",
  };

  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          "flex items-start justify-between gap-3 p-4 rounded-panel text-body leading-normal text-left",
          toneStyles[activeTone],
          className
        )
      )}
    >
      <div className="flex-1 space-y-0.5">
        {title && <h4 className="font-semibold text-title leading-tight">{title}</h4>}
        {(description || message || children) && (
          <div className="text-body">{description || message || children}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
