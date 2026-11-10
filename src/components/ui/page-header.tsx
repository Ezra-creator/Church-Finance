import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border text-left",
          className
        )
      )}
    >
      <div className="space-y-1">
        <h1 className="text-heading font-semibold text-text leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-body text-muted leading-normal">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}
