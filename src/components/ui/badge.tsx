import React from "react";
import { clsx } from "clsx";
import { Check, AlertTriangle, Clock } from "lucide-react";

export type StatusTone = "balanced" | "mismatch" | "attention" | "neutral" | "variance" | string;
export type BadgeVariant = "balanced" | "mismatch" | "attention" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  tone?: StatusTone;
  label?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ variant, tone, label, children, className }: BadgeProps) {
  let effectiveVariant: BadgeVariant = "neutral";
  const t = tone || variant;
  if (t === "balanced") effectiveVariant = "balanced";
  else if (t === "mismatch" || t === "variance") effectiveVariant = "mismatch";
  else if (t === "attention") effectiveVariant = "attention";
  else effectiveVariant = "neutral";

  const config = {
    balanced: {
      bg: "bg-ok-tint",
      text: "text-ok-ink",
      icon: <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    },
    mismatch: {
      bg: "bg-bad-tint",
      text: "text-bad-ink",
      icon: <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    },
    attention: {
      bg: "bg-warn-tint",
      text: "text-warn-ink",
      icon: <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    },
    neutral: {
      bg: "bg-hover",
      text: "text-muted",
      icon: null,
    },
  }[effectiveVariant];

  const content = children ?? label;

  return (
    <span
      className={clsx(
        "inline-flex items-center h-[24px] px-2 rounded-control text-[12px] font-medium leading-none gap-1 select-none",
        config.bg,
        config.text,
        className
      )}
    >
      {config.icon}
      <span>{content}</span>
    </span>
  );
}

// Re-export StatusMark for existing usages
export const StatusMark = Badge;
