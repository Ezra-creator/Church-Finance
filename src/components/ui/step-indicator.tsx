import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check } from "lucide-react";

export interface StepItem {
  id: string | number;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStep: number; // 0-indexed or 1-indexed
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  className,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={twMerge("w-full py-2", className)}>
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={step.id} className="flex-1 flex items-center">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-caption font-medium select-none flex-shrink-0",
                    isCompleted && "bg-ok text-on-accent",
                    isCurrent && "bg-accent text-on-accent",
                    !isCompleted && !isCurrent && "bg-hover text-muted border border-border"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={clsx(
                    "text-caption font-medium hidden sm:inline whitespace-nowrap",
                    isCurrent ? "text-text" : "text-muted"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    "flex-1 h-px mx-3",
                    index < currentStep ? "bg-ok" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
