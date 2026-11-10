import React from "react";
import { Check } from "lucide-react";

export interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 1-indexed
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  className = "",
}: StepIndicatorProps) {
  const total = steps.length;
  const currentLabel = steps[currentStep - 1] || "";
  const progressPercent = Math.min(100, Math.max(0, (currentStep / total) * 100));

  return (
    <div className={`w-full ${className}`}>
      {/* Phone View (< 768px): One line + 4px progress bar */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between text-[13px] font-medium text-text mb-2">
          <span>
            Step {currentStep} of {total}, {currentLabel}
          </span>
        </div>
        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop View (>= 768px): Horizontal stepped list */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-2.5">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full border border-brand flex items-center justify-center text-brand flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-brand text-on-brand flex items-center justify-center text-[12px] font-semibold flex-shrink-0">
                    {stepNum}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-border-strong text-muted flex items-center justify-center text-[12px] font-medium flex-shrink-0">
                    {stepNum}
                  </div>
                )}
                <span
                  className={`text-[14px] leading-[20px] ${
                    isCurrent
                      ? "font-medium text-text"
                      : isCompleted
                      ? "text-text"
                      : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[1px] bg-border mx-4" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

