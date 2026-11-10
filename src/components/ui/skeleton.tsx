import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={twMerge(
        "bg-hover rounded-control",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-border h-11 bg-surface">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx(
            "h-4",
            i === 0 ? "w-1/3" : i === columns - 1 ? "w-20 ml-auto" : "w-1/6"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full border border-border rounded-panel bg-surface overflow-hidden">
      <div className="flex items-center gap-4 px-4 bg-surface border-b border-border h-10">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={clsx(
              "h-3.5",
              i === 0 ? "w-24" : i === columns - 1 ? "w-16 ml-auto" : "w-20"
            )}
          />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}
