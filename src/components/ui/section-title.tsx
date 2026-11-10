import React from "react";
import { clsx } from "clsx";

export interface SectionTitleProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
}

export function SectionTitle({
  title,
  eyebrow,
  description,
  action,
  rightElement,
  className,
}: SectionTitleProps) {
  const act = action ?? rightElement;
  return (
    <div className={clsx("mb-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="text-[12px] font-medium text-muted mb-0.5">
              {eyebrow}
            </div>
          )}
          <h2 className="text-[18px] font-semibold text-text leading-[26px]">
            {title}
          </h2>
          {description && (
            <p className="text-[13px] text-muted mt-1">{description}</p>
          )}
        </div>
        {act && <div className="shrink-0">{act}</div>}
      </div>
    </div>
  );
}

// Re-export RuleHeading for existing codebase compatibility
export function RuleHeading(props: SectionTitleProps) {
  return <SectionTitle {...props} />;
}
