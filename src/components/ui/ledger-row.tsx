import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface LedgerRowProps {
  label: React.ReactNode;
  detail?: React.ReactNode;
  right?: React.ReactNode;
  amount?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isHeader?: boolean;
}

export function LedgerRow({
  label,
  detail,
  right,
  amount,
  onClick,
  className,
  isHeader = false,
}: LedgerRowProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={twMerge(
        clsx(
          "w-full flex items-center justify-between py-3 px-1 border-b border-rule text-left transition-colors",
          onClick && "hover:bg-ink/[0.02] cursor-pointer",
          isHeader && "py-2 text-xs uppercase tracking-wider font-medium text-ink-soft border-b-2 border-rule-strong",
          className
        )
      )}
    >
      <div className="flex flex-col pr-4 min-w-0">
        <span className={clsx("text-sm text-ink truncate", isHeader && "text-xs font-medium text-ink-soft")}>
          {label}
        </span>
        {detail && <span className="text-xs text-ink-soft truncate">{detail}</span>}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {right && <div className="text-xs text-ink-soft">{right}</div>}
        {amount && (
          <div className="font-mono text-sm tabular-nums text-right text-ink font-medium">
            {amount}
          </div>
        )}
      </div>
    </Component>
  );
}
