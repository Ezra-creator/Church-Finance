"use client";

import React, { useState, useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle } from "lucide-react";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
  detail?: string;
}

export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(({ className, label, error, hint, detail, id, disabled, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperText = detail || hint;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

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
      <div className="relative flex items-center">
        <input
          id={inputId}
          ref={ref}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? hintId : undefined}
          className={twMerge(
            clsx(
              "w-full h-11 sm:h-10 pl-3 pr-14 bg-surface border border-border rounded-control text-body text-text placeholder:text-muted transition-colors duration-120",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-accent",
              "disabled:bg-hover disabled:text-muted disabled:cursor-not-allowed",
              error && "border-bad focus:border-bad focus-visible:ring-bad",
              className
            )
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-2 px-2 py-1 text-caption font-medium text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control transition-colors duration-120"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      {helperText && !error && (
        <p id={hintId} className="text-caption text-muted">{helperText}</p>
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
});

PasswordField.displayName = "PasswordField";
