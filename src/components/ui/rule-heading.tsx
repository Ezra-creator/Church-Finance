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
    <header className={twMerge(clsx("pb-6 border-b border-border text-left", className))}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-caption font-medium text-muted">
              {eyebrow}
            </p>
          )}
          <h1 className="text-heading font-semibold text-text leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-body text-muted max-w-xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 pt-2 sm:pt-0">{action}</div>}
      </div>
    </header>
  );
}
