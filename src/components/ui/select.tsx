import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, AlertCircle } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, children, disabled, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="text-label font-medium text-text"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={twMerge(
              clsx(
                "w-full h-11 sm:h-10 px-3 pr-9 bg-surface border border-border rounded-control text-body text-text appearance-none transition-colors duration-120 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-accent",
                "disabled:bg-hover disabled:text-muted disabled:cursor-not-allowed",
                error && "border-bad focus:border-bad focus-visible:ring-bad",
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
            <ChevronDown className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
          </div>
        </div>
        {hint && !error && (
          <p id={hintId} className="text-caption text-muted">
            {hint}
          </p>
        )}
        {error && (
          <div
            id={errorId}
            aria-live="polite"
            className="flex items-center gap-1 text-caption text-bad font-medium mt-0.5"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.75]" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
