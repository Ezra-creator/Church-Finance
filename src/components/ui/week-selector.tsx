"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isAfter,
  isSameYear,
  eachWeekOfInterval,
  subMonths,
} from "date-fns";

export interface WeekSelectorProps {
  currentWeekStartString?: string;
  className?: string;
}

export function WeekSelector({
  currentWeekStartString,
  className = "",
}: WeekSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday

  const weekParam = searchParams.get("week") || currentWeekStartString;
  const activeWeekStart = weekParam
    ? startOfWeek(parseISO(weekParam), { weekStartsOn: 0 })
    : thisWeekStart;

  const prevWeek = subWeeks(activeWeekStart, 1);
  const nextWeek = addWeeks(activeWeekStart, 1);
  const isNextDisabled = isAfter(nextWeek, thisWeekStart);

  const formatWeekLabel = (date: Date) => {
    const sameYear = isSameYear(date, today);
    return `Week of ${format(date, sameYear ? "d MMM" : "d MMM yyyy")}`;
  };

  const navigateToWeek = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", formatted);
    router.replace(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Generate selectable weeks for the past 3 months
  const recentWeeks = eachWeekOfInterval(
    { start: subMonths(thisWeekStart, 3), end: thisWeekStart },
    { weekStartsOn: 0 }
  ).reverse();

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Previous Week */}
      <button
        type="button"
        onClick={() => navigateToWeek(prevWeek)}
        aria-label="Previous week"
        className="w-[40px] h-[40px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text hover:bg-hover active:bg-hover transition-colors touch-target flex-shrink-0"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Week Label Popover Trigger */}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="h-[40px] px-3 bg-surface border border-border-strong rounded-control text-[14px] font-medium text-text hover:bg-hover active:bg-hover transition-colors touch-target whitespace-nowrap"
        >
          {formatWeekLabel(activeWeekStart)}
        </button>

        {/* Popover Menu with week selection */}
        {isOpen && (
          <div
            role="dialog"
            aria-label="Select week"
            className="absolute right-0 top-full mt-1.5 z-40 w-[240px] max-h-[300px] overflow-y-auto bg-surface border border-border rounded-panel shadow-overlay p-1"
          >
            <div className="px-3 py-1.5 text-[12px] font-medium text-muted border-b border-border mb-1">
              Select week
            </div>
            {recentWeeks.map((weekDate) => {
              const isSelected =
                format(weekDate, "yyyy-MM-dd") === format(activeWeekStart, "yyyy-MM-dd");
              return (
                <button
                  key={weekDate.toISOString()}
                  type="button"
                  onClick={() => navigateToWeek(weekDate)}
                  className={`w-full text-left px-3 py-2 rounded-control text-[13px] transition-colors ${
                    isSelected
                      ? "bg-brand text-on-brand font-medium"
                      : "text-text hover:bg-hover"
                  }`}
                >
                  {formatWeekLabel(weekDate)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Week */}
      <button
        type="button"
        disabled={isNextDisabled}
        onClick={() => !isNextDisabled && navigateToWeek(nextWeek)}
        aria-label="Next week"
        className="w-[40px] h-[40px] flex items-center justify-center bg-surface border border-border-strong rounded-control text-text hover:bg-hover active:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target flex-shrink-0"
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

