import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  detail?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, label, error, hint, detail, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const helperText = detail || hint;


    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs uppercase tracking-wider font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              "w-full min-h-[44px] px-3 py-2 bg-transparent border rounded-[2px] text-sm text-ink placeholder:text-ink-soft/50 transition-colors",
              "border-rule focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2",
              error && "border-variance focus:border-variance",
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-ink-soft">{helperText}</p>
        )}
        {error && (
          <p className="text-xs text-variance font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";
