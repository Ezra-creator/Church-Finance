"use client";

import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatMoney, parseCedi } from "@/lib/money";
import { AlertCircle } from "lucide-react";

export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  error?: string;
  optional?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ className, label, error, optional, id, value = "", onChange, onBlur, onFocus, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
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
          const formatted = formatMoney(dec);
          setDisplayValue(formatted);
          onChange?.(dec.toFixed(2));
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
      setDisplayValue(e.target.value);
    };

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-text leading-[18px]">
            {label}
            {optional && <span className="text-muted font-normal ml-1">(optional)</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder="0.00"
            className={twMerge(
              clsx(
                "w-full h-[40px] px-3 bg-surface border rounded-control text-text text-[16px] md:text-[14px] placeholder:text-muted transition-colors num touch-target",
                "border-border-strong focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                error && "border-bad focus:border-bad focus-visible:outline-bad",
                className
              )
            )}
            {...props}
          />
        </div>
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

AmountInput.displayName = "AmountInput";
