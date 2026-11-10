import React from "react";
import { Badge, BadgeTone } from "./badge";

export type StatusTone = "balanced" | "variance" | "attention" | "neutral" | "success" | "danger" | "warning";

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
  const toneMap: Record<StatusTone, BadgeTone> = {
    balanced: "success",
    variance: "danger",
    attention: "warning",
    neutral: "neutral",
    success: "success",
    danger: "danger",
    warning: "warning",
  };

  return (
    <Badge tone={toneMap[tone]} className={className}>
      {label}
    </Badge>
  );
}
