import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface RuleHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function RuleHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: RuleHeadingProps) {
  return (
    <header className={twMerge(clsx("pb-4 border-b border-rule", className))}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-xs uppercase tracking-wider font-medium text-ink-soft">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-ink leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-ink-soft max-w-xl pt-0.5">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 pt-2 sm:pt-0">{action}</div>}
      </div>
    </header>
  );
}
