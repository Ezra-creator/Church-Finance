"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface StepperProps {
  value: number;
  onChange: (nextValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  disabled = false,
  className,
  ariaLabel = "Quantity",
}: StepperProps) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(max !== undefined ? Math.min(max, value + step) : value + step);
    }
  };

  return (
    <div
      className={twMerge(
        clsx(
          "inline-flex items-center border border-border bg-surface rounded-control overflow-hidden h-14 min-h-[56px]",
          disabled && "opacity-50 pointer-events-none bg-hover",
          className
        )
      )}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
        className={clsx(
          "w-14 h-14 min-h-[56px] inline-flex items-center justify-center text-muted hover:text-text hover:bg-hover transition-colors duration-120 border-r border-border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          !canDecrease && "opacity-40 cursor-not-allowed hover:bg-transparent"
        )}
      >
        <Minus className="w-4 h-4 stroke-[1.75]" />
      </button>

      <span
        aria-label={ariaLabel}
        className="px-4 min-w-[56px] text-center font-medium text-body text-text tnum tabular-nums select-none"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrease}
        disabled={!canIncrease}
        aria-label="Increase quantity"
        className={clsx(
          "w-14 h-14 min-h-[56px] inline-flex items-center justify-center text-muted hover:text-text hover:bg-hover transition-colors duration-120 border-l border-border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          !canIncrease && "opacity-40 cursor-not-allowed hover:bg-transparent"
        )}
      >
        <Plus className="w-4 h-4 stroke-[1.75]" />
      </button>
    </div>
  );
}
