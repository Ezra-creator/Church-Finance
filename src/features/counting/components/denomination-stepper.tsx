"use client";

import React, { useRef } from "react";
import { Minus, Plus } from "lucide-react";

interface DenominationStepperProps {
  quantity: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
}

export function DenominationStepper({
  quantity,
  onChange,
  disabled = false,
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
    <div className="flex items-center border border-rule rounded-[2px] bg-paper">
      <button
        type="button"
        disabled={disabled || quantity <= 0}
        onClick={decrement}
        onMouseDown={() => startRepeating(decrement)}
        onMouseUp={stopRepeating}
        onMouseLeave={stopRepeating}
        onTouchStart={() => startRepeating(decrement)}
        onTouchEnd={stopRepeating}
        className="w-11 h-11 flex items-center justify-center text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/[0.05] transition-colors select-none active:bg-ink/10"
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        type="number"
        min={0}
        value={quantity === 0 ? "" : quantity}
        placeholder="0"
        disabled={disabled}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onChange(isNaN(val) || val < 0 ? 0 : val);
        }}
        className="w-16 h-11 text-center font-mono text-sm text-ink bg-transparent focus:outline-none focus:ring-1 focus:ring-ink"
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
        className="w-11 h-11 flex items-center justify-center text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/[0.05] transition-colors select-none active:bg-ink/10"
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
