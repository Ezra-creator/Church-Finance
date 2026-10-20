export const ACCRA_TIMEZONE = "Africa/Accra";

/**
 * Returns current timestamp in UTC.
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Formats a Date or ISO string into a human-readable Accra date.
 * e.g. "Sunday, 18 Oct 2026"
 */
export function formatAccraDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Formats a Date or ISO string into date and time in Accra timezone.
 * e.g. "18 Oct 2026, 09:30:00 GMT"
 */
export function formatAccraDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${formatted} GMT`;
}

/**
 * Returns a DATE string (YYYY-MM-DD) for a given date in Accra timezone.
 */
export function toServiceDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export const toAccraDateString = toServiceDateString;


/**
 * Parses a YYYY-MM-DD service date string into a Date object at UTC midnight.
 */
export function parseServiceDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
