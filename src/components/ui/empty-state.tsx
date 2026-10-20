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
          "flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-rule rounded-[2px] bg-ink/[0.01]",
          className
        )
      )}
    >
      <h3 className="text-xl font-serif font-normal text-ink mb-2">
        {title}
      </h3>
      <p className="text-sm text-ink-soft max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
