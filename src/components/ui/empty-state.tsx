"use client";

import React from "react";
import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`p-8 text-left bg-surface border border-border rounded-panel ${className || ""}`}>
      <h3 className="text-[16px] font-semibold text-text leading-[24px]">
        {title}
      </h3>
      <p className="text-[14px] text-muted leading-[20px] mt-1 mb-4">
        {description}
      </p>
      {action ? (
        <div>{action}</div>
      ) : actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
