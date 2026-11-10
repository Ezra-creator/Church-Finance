"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  optional?: boolean;
  options?: SelectOption[];
  hint?: string;
  detail?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, optional, hint, detail, id, options, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-text leading-[18px]">
            {label}
            {optional && <span className="text-muted font-normal ml-1">(optional)</span>}
          </label>
        )}
        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className={twMerge(
              clsx(
                "w-full h-[40px] px-3 pr-8 bg-surface border rounded-control text-text text-[16px] md:text-[14px] appearance-none transition-colors cursor-pointer touch-target",
                "border-border-strong focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                error && "border-bad focus:border-bad focus-visible:outline-bad",
                className
              )
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        {(hint || detail) && !error && (
          <p className="text-[12px] text-muted leading-[16px]">{hint || detail}</p>
        )}
        {error && (
          <div
            id={errorId}
            aria-live="polite"
            className="flex items-center gap-1.5 text-[13px] text-bad-ink leading-[18px]"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
