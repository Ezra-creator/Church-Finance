import { Prisma } from "@prisma/client";
import { toMinorUnits } from "@/lib/money";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n: number): string {
  if (n === 0) return "";

  if (n < 20) {
    return ONES[n];
  }

  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rem = n % 10;
    return rem === 0 ? TENS[ten] : `${TENS[ten]}-${ONES[rem]}`;
  }

  const hundred = Math.floor(n / 100);
  const rem = n % 100;

  if (rem === 0) {
    return `${ONES[hundred]} Hundred`;
  }

  return `${ONES[hundred]} Hundred and ${convertBelowThousand(rem)}`;
}

function convertIntegerToWords(n: number): string {
  if (n === 0) return "Zero";

  const BILLION = 1_000_000_000;
  const MILLION = 1_000_000;
  const THOUSAND = 1_000;

  const parts: string[] = [];

  const billions = Math.floor(n / BILLION);
  const afterBillions = n % BILLION;
  if (billions > 0) {
    parts.push(`${convertBelowThousand(billions)} Billion`);
  }

  const millions = Math.floor(afterBillions / MILLION);
  const afterMillions = afterBillions % MILLION;
  if (millions > 0) {
    parts.push(`${convertBelowThousand(millions)} Million`);
  }

  const thousands = Math.floor(afterMillions / THOUSAND);
  const remainder = afterMillions % THOUSAND;
  if (thousands > 0) {
    parts.push(`${convertBelowThousand(thousands)} Thousand`);
  }

  if (remainder > 0) {
    // If we already have thousands/millions and remainder is under 100, add "and"
    if (parts.length > 0 && remainder < 100) {
      parts.push(`and ${convertBelowThousand(remainder)}`);
    } else {
      parts.push(convertBelowThousand(remainder));
    }
  }

  return parts.join(", ").replace(", and ", " and ");
}

/**
 * Converts a Ghana Cedi Decimal or number into formal words for receipts.
 * E.g.
 * - 50.00 -> "Fifty Ghana Cedis only"
 * - 125.50 -> "One Hundred and Twenty-Five Ghana Cedis, Fifty Pesewas only"
 * - 0.50 -> "Fifty Pesewas only"
 */
export function amountInWords(amount: Prisma.Decimal | string | number): string {
  const decimal =
    amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
  const minorUnits = toMinorUnits(decimal);

  const cedis = Math.floor(minorUnits / 100);
  const pesewas = minorUnits % 100;

  const parts: string[] = [];

  if (cedis > 0) {
    const cediWords = convertIntegerToWords(cedis);
    const unit = cedis === 1 ? "Ghana Cedi" : "Ghana Cedis";
    parts.push(`${cediWords} ${unit}`);
  }

  if (pesewas > 0) {
    const pesewaWords = convertIntegerToWords(pesewas);
    const unit = pesewas === 1 ? "Pesewa" : "Pesewas";
    parts.push(`${pesewaWords} ${unit}`);
  }

  if (parts.length === 0) {
    return "Zero Ghana Cedis only";
  }

  return `${parts.join(", ")} only`;
}
