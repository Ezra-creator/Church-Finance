"use client";

import React, { useRef } from "react";
import { Minus, Plus } from "lucide-react";

interface DenominationStepperProps {
  quantity: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
  name?: string;
}

export function DenominationStepper({
  quantity,
  onChange,
  disabled = false,
  name = "denomination",
}: DenominationStepperProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const increment = () => {
    if (disabled) return;
    onChange(quantity + 1);
  };

  const decrement = () => {
    if (disabled) return;
    onChange(Math.max(0, quantity - 1));
  };

  const startRepeating = (action: () => void) => {
    if (disabled) return;
    action();
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        action();
      }, 100);
    }, 400);
  };

  const stopRepeating = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || quantity <= 0}
        onClick={decrement}
        onMouseDown={() => startRepeating(decrement)}
        onMouseUp={stopRepeating}
        onMouseLeave={stopRepeating}
        onTouchStart={() => startRepeating(decrement)}
        onTouchEnd={stopRepeating}
        className="w-[56px] h-[56px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-hover active:bg-hover transition-colors select-none touch-target-qty"
        aria-label={`Decrease ${name}`}
      >
        <Minus className="w-5 h-5" aria-hidden="true" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={quantity === 0 ? "" : quantity}
        placeholder="0"
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const val = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
          onChange(isNaN(val) ? 0 : val);
        }}
        className="w-[80px] h-[56px] text-center text-[20px] font-semibold text-text bg-surface border border-border-strong rounded-control num focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={increment}
        onMouseDown={() => startRepeating(increment)}
        onMouseUp={stopRepeating}
        onMouseLeave={stopRepeating}
        onTouchStart={() => startRepeating(increment)}
        onTouchEnd={stopRepeating}
        className="w-[56px] h-[56px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-hover active:bg-hover transition-colors select-none touch-target-qty"
        aria-label={`Increase ${name}`}
      >
        <Plus className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
}
