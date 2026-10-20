import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type StatusTone = "balanced" | "variance" | "attention" | "neutral";

export interface StatusMarkProps {
  tone?: StatusTone;
  label: string;
  className?: string;
}

export function StatusMark({
  tone = "neutral",
  label,
  className,
}: StatusMarkProps) {
  const toneStyles = {
    balanced: {
      dot: "bg-balanced",
      text: "text-balanced",
    },
    variance: {
      dot: "bg-variance",
      text: "text-variance",
    },
    attention: {
      dot: "bg-attention",
      text: "text-attention",
    },
    neutral: {
      dot: "bg-ink-soft",
      text: "text-ink-soft",
    },
  };

  const current = toneStyles[tone];

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase select-none",
          current.text,
          className
        )
      )}
    >
      <span
        className={clsx("w-2 h-2 rounded-[1px] flex-shrink-0", current.dot)}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
