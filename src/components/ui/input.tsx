"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  detail?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, optional, hint, detail, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-text leading-[18px]">
            {label}
            {optional && <span className="text-muted font-normal ml-1">(optional)</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          className={twMerge(
            clsx(
              "w-full h-[40px] px-3 bg-surface border rounded-control text-text text-[16px] md:text-[14px] placeholder:text-muted transition-colors touch-target",
              "border-border-strong focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
              error && "border-bad focus:border-bad focus-visible:outline-bad",
              className
            )
          )}
          {...props}
        />
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

Input.displayName = "Input";
export const TextField = Input;
