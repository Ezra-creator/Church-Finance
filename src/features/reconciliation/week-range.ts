import { formatAccraDate } from "@/lib/dates";

export interface WeekRange {
  weekEndingDate: Date;
  weekEndingString: string; // "YYYY-MM-DD"
  startDate: Date;
  startDateString: string;  // "YYYY-MM-DD"
  startDateUtc: Date;
  endDateUtc: Date;
  formattedRange: string;
}

/**
 * Calculates the current week ending date based on ChurchSettings.weekEndsOn (0 = Sunday).
 */
export function getCurrentWeekEnding(weekEndsOn: number = 0, referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate);
  const currentDay = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = (weekEndsOn - currentDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the 7-day week range for a given week-ending date string (YYYY-MM-DD).
 * Accra is UTC+0, so Africa/Accra calendar dates map cleanly to UTC midnight boundaries.
 */
export function computeWeekRange(weekEndingStr: string): WeekRange {
  const [y, m, d] = weekEndingStr.split("-").map(Number);
  const weekEndingDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

  // Week starts 6 days prior to weekEnding
  const startDate = new Date(weekEndingDate);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  const startDateString = startDate.toISOString().slice(0, 10);
  const weekEndingString = weekEndingStr;

  // UTC query bounds for timestamps (e.g. occurredAt)
  const startDateUtc = new Date(Date.UTC(y, m - 1, d - 6, 0, 0, 0, 0));
  const endDateUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  const formattedRange = `${formatAccraDate(startDate, {
    weekday: "long",
    day: "numeric",
    month: "short",
  })} – ${formatAccraDate(weekEndingDate, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return {
    weekEndingDate,
    weekEndingString,
    startDate,
    startDateString,
    startDateUtc,
    endDateUtc,
    formattedRange,
  };
}
