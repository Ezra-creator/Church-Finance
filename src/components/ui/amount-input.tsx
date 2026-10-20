"use client";

import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCedi, parseCedi } from "@/lib/money";

export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  error?: string;
  hint?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ className, label, error, hint, id, value = "", onChange, onBlur, onFocus, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const [displayValue, setDisplayValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value);
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Strip formatting and prefix when typing
      const raw = displayValue.replace(/^(GH[₵c]|GHS)\s*/i, "").replace(/,/g, "").trim();
      setDisplayValue(raw);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const raw = e.target.value.trim();
      if (raw !== "") {
        try {
          const dec = parseCedi(raw);
          const formatted = formatCedi(dec);
          setDisplayValue(formatted);
          onChange?.(dec.toFixed(2));
        } catch {
          // If invalid, preserve raw input so validation error can display
          setDisplayValue(raw);
          onChange?.(raw);
        }
      } else {
        setDisplayValue("");
        onChange?.("");
      }
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDisplayValue(next);
      onChange?.(next);
    };

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
        <div
          className={twMerge(
            clsx(
              "relative flex items-center w-full min-h-[44px] bg-transparent border rounded-[2px] transition-colors",
              "border-rule focus-within:border-ink",
              error && "border-variance focus-within:border-variance",
              className
            )
          )}
        >
          <span className="pl-3 pr-2 text-xs font-mono font-medium text-ink-soft select-none pointer-events-none">
            GH₵
          </span>
          <input
            id={inputId}
            ref={ref}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="w-full h-full pr-3 py-2 bg-transparent text-sm font-mono tabular-nums text-right text-ink placeholder:text-ink-soft/40 outline-none"
            placeholder="0.00"
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="text-xs text-ink-soft">{hint}</p>
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

AmountInput.displayName = "AmountInput";
