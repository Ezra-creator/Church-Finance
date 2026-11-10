"use client";

import React from "react";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, checked, disabled, onChange, onCheckedChange, ...props }, ref) => {
    const checkboxId =
      id ||
      (typeof label === "string"
        ? label.toLowerCase().replace(/\s+/g, "-")
        : undefined);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label
        htmlFor={checkboxId}
        className={clsx(
          "inline-flex items-start gap-2.5 cursor-pointer select-none py-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={twMerge(
              clsx(
                "w-4 h-4 rounded-control border border-border bg-surface text-on-accent flex items-center justify-center transition-colors duration-120",
                "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                "peer-checked:bg-accent peer-checked:border-accent",
                className
              )
            )}
          >
            <Check className="w-3.5 h-3.5 stroke-[1.75] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col text-label">
            {label && (
              <span className="font-medium text-text leading-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="text-caption text-muted mt-0.5 leading-normal">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
