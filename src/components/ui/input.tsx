import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  detail?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, detail, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const helpText = hint || detail;

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helpText ? hintId : undefined}
          className={twMerge(
            clsx(
              "w-full h-11 sm:h-10 px-3 bg-surface border border-border rounded-control text-body text-text placeholder:text-muted transition-colors duration-120",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-accent",
              "disabled:bg-hover disabled:text-muted disabled:cursor-not-allowed",
              error && "border-bad focus:border-bad focus-visible:ring-bad",
              className
            )
          )}
          {...props}
        />
        {helpText && !error && (
          <p id={hintId} className="text-caption text-muted">
            {helpText}
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

Input.displayName = "Input";
export const TextField = Input;
