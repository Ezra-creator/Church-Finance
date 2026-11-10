import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle } from "lucide-react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, disabled, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-label font-medium text-text"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          disabled={disabled}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={twMerge(
            clsx(
              "w-full px-3 py-2 bg-surface border border-border rounded-control text-body text-text placeholder:text-muted transition-colors duration-120",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-accent",
              "disabled:bg-hover disabled:text-muted disabled:cursor-not-allowed",
              error && "border-bad focus:border-bad focus-visible:ring-bad",
              className
            )
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";
