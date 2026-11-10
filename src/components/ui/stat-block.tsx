import React from "react";
import { clsx } from "clsx";

export interface StatBlockProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

export function StatBlock({ label, value, hint, className }: StatBlockProps) {
  return (
    <div className={clsx("flex flex-col space-y-1 text-left", className)}>
      <span className="text-caption text-muted font-medium leading-none">
        {label}
      </span>
      <div className="text-figure font-semibold text-text tnum tabular-nums leading-tight">
        {value}
      </div>
      {hint && (
        <span className="text-caption text-muted leading-normal">
          {hint}
        </span>
      )}
    </div>
  );
}
