"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={twMerge(
        clsx(
          "inline-flex items-center bg-hover p-1 rounded-panel border border-border",
          className
        )
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={clsx(
              "flex-1 inline-flex items-center justify-center font-medium transition-colors duration-120 rounded-control select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              size === "sm" ? "px-2.5 py-1 text-caption" : "px-3.5 py-1.5 text-label",
              isSelected
                ? "bg-surface text-text border border-border"
                : "text-muted hover:text-text border border-transparent",
              option.disabled && "opacity-50 pointer-events-none"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
