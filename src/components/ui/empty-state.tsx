import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col items-start justify-start text-left p-6 border border-border rounded-panel bg-surface",
          className
        )
      )}
    >
      <h3 className="text-body font-medium text-text leading-tight">
        {title}
      </h3>
      <p className="text-caption text-muted mt-1 leading-normal max-w-md">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
