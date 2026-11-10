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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    }
  };

  return (
    <div className="flex items-center border border-border rounded-control bg-surface overflow-hidden h-14 min-h-[56px]">
      <button
        type="button"
        disabled={disabled || quantity <= 0}
        onClick={decrement}
        onMouseDown={() => startRepeating(decrement)}
        onMouseUp={stopRepeating}
        onMouseLeave={stopRepeating}
        onTouchStart={() => startRepeating(decrement)}
        onTouchEnd={stopRepeating}
        className="w-14 h-14 min-w-[56px] min-h-[56px] flex items-center justify-center text-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-hover transition-colors duration-120 select-none border-r border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4 stroke-[1.75]" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={quantity === 0 ? "" : String(quantity)}
        placeholder="0"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(isNaN(val) || val < 0 ? 0 : val);
        }}
        className="w-16 h-14 text-center font-sans tnum tabular-nums text-body text-text bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
        className="w-14 h-14 min-w-[56px] min-h-[56px] flex items-center justify-center text-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-hover transition-colors duration-120 select-none border-l border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4 stroke-[1.75]" />
      </button>
    </div>
  );
}
