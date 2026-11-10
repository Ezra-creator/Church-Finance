"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className="inline-flex items-center gap-2 cursor-pointer select-none text-[14px] text-text"
      >
        <span className="relative flex items-center justify-center w-[18px] h-[18px] touch-target">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            checked={checked}
            className={twMerge(
              clsx(
                "peer appearance-none w-[18px] h-[18px] rounded-[4px] border border-border-strong bg-surface transition-colors cursor-pointer",
                "checked:bg-brand checked:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                className
              )
            )}
            {...props}
          />
          <Check
            className="absolute w-3 h-3 text-on-brand pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity stroke-[2.5]"
            aria-hidden="true"
          />
        </span>
        {label && <span>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

