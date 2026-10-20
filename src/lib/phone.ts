import { AppError } from "@/lib/errors";

/**
 * Normalises Ghana phone numbers to standard E.164 format (+233XXXXXXXXX).
 * Accepts variations:
 * - 0244123456 (standard local 10 digits with leading 0)
 * - 244123456 (9 digits without leading 0)
 * - 233244123456 (international without plus)
 * - +233244123456 (standard international)
 * - +233 (0)24 412-3456 (international with trunk 0)
 * Ignores spaces, dashes, dots, and parentheses.
 */
export function normalizeGhanaPhone(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  // Remove spaces, hyphens, parentheses, and dots
  const cleaned = trimmed.replace(/[\s\-().]/g, "");

  let digits: string;

  if (cleaned.startsWith("+233")) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith("233")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else {
    digits = cleaned;
  }

  // If there was a trunk 0 after country code (e.g. +233 0244...), strip it
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Ghana mobile and fixed numbers have exactly 9 digits after the country code / leading zero
  if (!/^\d{9}$/.test(digits)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid Ghana phone number: "${input}". Expected 10 digits starting with 0 (e.g. 0244123456) or international format (+233244123456).`
    );
  }

  return `+233${digits}`;
}
