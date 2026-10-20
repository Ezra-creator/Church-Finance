import { Prisma } from "@prisma/client";
import { AppError } from "./errors";

export type CediValue = Prisma.Decimal | string | number;

/**
 * Parses a string representation of Ghana cedis into a Decimal.
 * Rejects more than 2 decimal places and rejects negative amounts unless allowNegative is explicitly true.
 */
export function parseCedi(
  input: string,
  options: { allowNegative?: boolean } = {}
): Prisma.Decimal {
  if (typeof input !== "string") {
    throw new AppError("VALIDATION_ERROR", "Amount must be a string.");
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    throw new AppError("VALIDATION_ERROR", "Amount cannot be empty.");
  }

  // Strip currency prefixes: GH₵, GHS, or GHc
  const stripped = trimmed.replace(/^(GH[₵c]|GHS)\s*/i, "").trim();
  if (stripped === "") {
    throw new AppError("VALIDATION_ERROR", "Amount cannot be empty.");
  }

  // Validate number format (optional negative sign, optional thousands commas, optional decimal with up to 2 places)
  const pattern = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
  if (!pattern.test(stripped)) {
    throw new AppError("VALIDATION_ERROR", "Invalid cedi amount format.");
  }

  // Check decimal places
  const decimalPointIndex = stripped.indexOf(".");
  if (decimalPointIndex !== -1) {
    const decimals = stripped.substring(decimalPointIndex + 1);
    if (decimals.length > 2) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid cedi amount. Must have at most two decimal places."
      );
    }
  }

  // Clean out commas for Decimal instantiation
  const normalized = stripped.replace(/,/g, "");
  const decimal = new Prisma.Decimal(normalized);

  if (!options.allowNegative && decimal.isNegative()) {
    throw new AppError("VALIDATION_ERROR", "Amount cannot be negative.");
  }

  return decimal;
}

/**
 * Formats a Decimal into Ghana cedis with the GH₵ symbol and 2 decimal places.
 * e.g. 1250.5 -> "GH₵ 1,250.50"
 */
export function formatCedi(amount: CediValue | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "GH₵ 0.00";
  }

  const dec = amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
  const isNegative = dec.isNegative();
  const absolute = dec.abs().toFixed(2);
  const [whole, fractional] = absolute.split(".");

  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = `GH₵ ${wholeWithCommas}.${fractional}`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Sums a list of cedi values safely using Decimal arithmetic.
 */
export function sumCedi(list: CediValue[]): Prisma.Decimal {
  return list.reduce<Prisma.Decimal>((acc, item) => {
    const val = item instanceof Prisma.Decimal ? item : new Prisma.Decimal(item);
    return acc.plus(val);
  }, new Prisma.Decimal(0));
}

/**
 * Converts a cedi amount into minor units (pesewas) as an integer for exact comparison.
 * e.g. GH₵ 150.50 -> 15050 pesewas.
 */
export function toMinorUnits(amount: CediValue): number {
  const dec = amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
  return parseInt(dec.times(100).toFixed(0), 10);
}
