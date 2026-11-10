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
          const rawStr = dec.toString();
          const parts = rawStr.split(".");
          const frac = parts[1] || "";
          const paddedFrac = frac.length === 0 ? "00" : frac.length === 1 ? `${frac}0` : frac.slice(0, 2);
          onChange?.(`${parts[0] || "0"}.${paddedFrac}`);
        } catch {
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
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label font-medium text-text"
          >
            {label}
          </label>
        )}
        <div
          className={twMerge(
            clsx(
              "relative flex items-center w-full h-11 sm:h-10 bg-surface border border-border rounded-control transition-colors duration-120",
              "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent",
              error && "border-bad focus-within:border-bad focus-within:ring-bad",
              className
            )
          )}
        >
          <span className="pl-3 pr-2 text-body font-medium text-muted select-none pointer-events-none">
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
            className="w-full h-full pr-3 py-2 bg-transparent text-body font-normal tnum tabular-nums text-right text-text placeholder:text-muted outline-none"
            placeholder="0.00"
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="text-caption text-muted">{hint}</p>
        )}
        {error && (
          <p className="text-caption text-bad font-medium mt-0.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
