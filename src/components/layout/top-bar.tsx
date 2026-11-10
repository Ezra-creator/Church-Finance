"use client";

import React from "react";
import { WeekSelector } from "@/components/ui/week-selector";

export interface TopBarProps {
  title: string;
  hasWeekSelector?: boolean;
  primaryAction?: React.ReactNode;
  phonePrimaryAction?: React.ReactNode;
}

export function TopBar({
  title,
  hasWeekSelector = false,
  primaryAction,
  phonePrimaryAction,
}: TopBarProps) {
  return (
    <>
      {/* Phone Top Bar (< 768px): Brand color background */}
      <header className="block md:hidden bg-brand text-on-brand pt-safe sticky top-0 z-30">
        <div className="h-[56px] px-4 flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-on-brand leading-[24px] truncate">
            {title}
          </h1>
          {phonePrimaryAction ? (
            <div>{phonePrimaryAction}</div>
          ) : primaryAction ? (
            <div>{primaryAction}</div>
          ) : null}
        </div>
        {hasWeekSelector && (
          <div className="h-[52px] px-4 bg-surface border-b border-border flex items-center justify-center">
            <WeekSelector className="w-full justify-between" />
          </div>
        )}
      </header>

      {/* Desktop & Tablet Top Bar (>= 768px): White background, 64px tall */}
      <header className="hidden md:flex h-[64px] bg-surface border-b border-border px-6 lg:px-8 items-center justify-between sticky top-0 z-30">
        <h1 className="text-[20px] font-semibold text-text leading-[28px] truncate">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          {hasWeekSelector && <WeekSelector />}
          {primaryAction && <div>{primaryAction}</div>}
        </div>
      </header>
    </>
  );
}

