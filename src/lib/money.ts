import { Prisma } from "@prisma/client";
import { AppError } from "./errors";

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export type CediValue =
  | Prisma.Decimal
  | string
  | number
  | { toString(): string };

/**
 * Converts any value into a Prisma Decimal safely without floating point issues.
 */
export function toDecimal(value: CediValue): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return new Prisma.Decimal(value.toString());
  }
  return new Prisma.Decimal(String(value));
}

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

  const normalized = stripped.replace(/,/g, "");
  const decimal = new Prisma.Decimal(normalized);

  if (!options.allowNegative && decimal.isNegative()) {
    throw new AppError("VALIDATION_ERROR", "Amount cannot be negative.");
  }

  return decimal;
}

/**
 * Formats a Decimal or cedi amount into string representation with 2 decimal places.
 * Pure string & Decimal logic without floating point toFixed, parseFloat, or Number conversions.
 */
export function formatMoney(
  amount: CediValue | null | undefined,
  currency = "GH₵"
): string {
  if (amount === null || amount === undefined || amount === "") {
    return `${currency} 0.00`;
  }

  const dec = toDecimal(amount);
  const isNegative = dec.isNegative();
  const rawStr = dec.toString();
  const cleanStr = isNegative ? rawStr.slice(1) : rawStr;
  const parts = cleanStr.split(".");
  const intPart = parts[0] || "0";
  let fracPart = parts[1] || "";

  if (fracPart.length === 0) {
    fracPart = "00";
  } else if (fracPart.length === 1) {
    fracPart = `${fracPart}0`;
  } else {
    fracPart = fracPart.slice(0, 2);
  }

  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = `${currency} ${intWithCommas}.${fracPart}`;

  return isNegative ? `-${formatted}` : formatted;
}

export const formatCedi = formatMoney;

/**
 * Sums a list of cedi values safely using Decimal arithmetic.
 */
export function sumCedi(list: CediValue[]): Prisma.Decimal {
  return list.reduce<Prisma.Decimal>((acc, item) => {
    return acc.plus(toDecimal(item));
  }, new Prisma.Decimal(0));
}

/**
 * Converts a cedi amount into minor units (pesewas) as an integer string for exact comparison.
 */
export function toMinorUnits(amount: CediValue): number {
  const dec = toDecimal(amount);
  const rawStr = dec.toString();
  const parts = rawStr.split(".");
  const intPart = parts[0] || "0";
  let fracPart = parts[1] || "";
  if (fracPart.length === 0) fracPart = "00";
  else if (fracPart.length === 1) fracPart = `${fracPart}0`;
  else fracPart = fracPart.slice(0, 2);

  return parseInt(`${intPart}${fracPart}`, 10);
}
