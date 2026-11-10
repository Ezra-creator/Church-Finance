import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check, AlertTriangle, Clock } from "lucide-react";
import { formatMoney, toDecimal, CediValue } from "@/lib/money";

export type BadgeVariant =
  | "Balanced"
  | "Mismatch"
  | "Needs attention"
  | "Neutral"
  | "balanced"
  | "mismatch"
  | "attention"
  | "success"
  | "danger"
  | "warning"
  | "neutral"
  | "accent";

export type BadgeTone = BadgeVariant;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  tone?: BadgeVariant;
  label?: string;
  difference?: CediValue | null;
  amount?: CediValue | null;
  children?: React.ReactNode;
}

export function Badge({
  variant,
  tone,
  label,
  difference,
  amount,
  className,
  children,
  ...props
}: BadgeProps) {
  const raw = variant || tone || "Neutral";

  let resolvedVariant: "Balanced" | "Mismatch" | "Needs attention" | "Neutral" = "Neutral";
  if (raw === "Balanced" || raw === "balanced" || raw === "success" || raw === "accent") {
    resolvedVariant = "Balanced";
  } else if (raw === "Mismatch" || raw === "mismatch" || raw === "danger") {
    resolvedVariant = "Mismatch";
  } else if (raw === "Needs attention" || raw === "attention" || raw === "warning") {
    resolvedVariant = "Needs attention";
  } else {
    resolvedVariant = "Neutral";
  }

  let icon = <Clock className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />;
  let defaultText = "Neutral";
  let colorClasses = "bg-hover text-muted border border-border";

  if (resolvedVariant === "Balanced") {
    icon = <Check className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />;
    defaultText = "Balanced";
    colorClasses = "bg-ok-tint text-ok-ink border border-ok";
  } else if (resolvedVariant === "Mismatch") {
    icon = <AlertTriangle className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />;
    defaultText = "Mismatch";
    colorClasses = "bg-bad-tint text-bad-ink border border-bad";

    const diff = difference ?? amount;
    if (diff !== undefined && diff !== null) {
      const dec = toDecimal(diff);
      const isNeg = dec.isNegative();
      const absDec = isNeg ? dec.negated() : dec;
      const formatted = formatMoney(absDec);
      defaultText = isNeg ? `Short by ${formatted}` : `Over by ${formatted}`;
    }
  } else if (resolvedVariant === "Needs attention") {
    icon = <Clock className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />;
    defaultText = "Needs attention";
    colorClasses = "bg-warn-tint text-warn-ink border border-warn";
  }

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control text-caption font-medium select-none",
          colorClasses,
          className
        )
      )}
      {...props}
    >
      {icon}
      <span>{children ?? label ?? defaultText}</span>
    </span>
  );
}
