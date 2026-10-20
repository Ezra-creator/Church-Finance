import crypto from "crypto";
import { Prisma, MomoTransactionDirection } from "@prisma/client";
import { parseCedi } from "@/lib/money";
import { normalizeGhanaPhone } from "@/lib/phone";
import {
  ParserProfileConfig,
  NormalizedStatementRow,
  ParseRowError,
} from "./types";

/**
 * Parses a date string or Excel serial number into a valid Date object.
 */
export function parseDateWithFormat(value: unknown, format: string): Date {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error("Invalid Date object");
    }
    return value;
  }

  // Handle Excel serial date numbers (e.g. 45123.5)
  if (typeof value === "number") {
    // Excel base date: Dec 30, 1899
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = value - Math.floor(value) + 0.0000001;
    const totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return new Date(
      Date.UTC(
        dateInfo.getUTCFullYear(),
        dateInfo.getUTCMonth(),
        dateInfo.getUTCDate(),
        hours,
        minutes,
        seconds
      )
    );
  }

  if (typeof value !== "string") {
    throw new Error("Date must be a string, Date object, or numeric serial");
  }

  const str = value.trim();
  if (!str) {
    throw new Error("Empty date string");
  }

  // Standard ISO / YYYY-MM-DD
  if (format === "YYYY-MM-DD" || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or DD-MM-YYYY (with optional time)
  const dmyMatch = str.match(
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (dmyMatch && (format.startsWith("DD") || format.includes("DD/MM"))) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    const d = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(d.getTime())) return d;
  }

  // MM/DD/YYYY
  const mdyMatch = str.match(
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (mdyMatch && format.startsWith("MM")) {
    const month = parseInt(mdyMatch[1], 10) - 1;
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    const hour = mdyMatch[4] ? parseInt(mdyMatch[4], 10) : 0;
    const min = mdyMatch[5] ? parseInt(mdyMatch[5], 10) : 0;
    const sec = mdyMatch[6] ? parseInt(mdyMatch[6], 10) : 0;

    const d = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to standard Date parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  throw new Error(`Unrecognized date format "${str}" for pattern "${format}"`);
}

/**
 * Normalises a single raw table row into a strongly typed transaction row according to the profile.
 */
export function normalizeStatementRow(
  rawRow: Record<string, unknown>,
  rowIndex: number,
  profile: ParserProfileConfig
): { row: NormalizedStatementRow | null; error: ParseRowError | null } {
  const { columnMap, dateFormat, amountSign } = profile;

  // 1. Date
  const rawDate = rawRow[columnMap.dateColumn];
  if (rawDate === undefined || rawDate === null || String(rawDate).trim() === "") {
    return {
      row: null,
      error: {
        rowIndex,
        column: columnMap.dateColumn,
        message: `Row ${rowIndex} has no date. Check the Date column mapping.`,
        rawRow,
      },
    };
  }

  let occurredAt: Date;
  try {
    occurredAt = parseDateWithFormat(rawDate, dateFormat);
  } catch (err) {
    return {
      row: null,
      error: {
        rowIndex,
        column: columnMap.dateColumn,
        message: `Row ${rowIndex} has invalid date "${String(rawDate)}": ${(err as Error).message}.`,
        rawRow,
      },
    };
  }

  // 2. Amount and Direction
  let amount: Prisma.Decimal;
  let direction: MomoTransactionDirection = MomoTransactionDirection.IN;

  if (amountSign === "SEPARATE_COLUMNS") {
    const creditRaw = columnMap.creditColumn ? rawRow[columnMap.creditColumn] : undefined;
    const debitRaw = columnMap.debitColumn ? rawRow[columnMap.debitColumn] : undefined;

    const creditStr = creditRaw !== undefined && creditRaw !== null ? String(creditRaw).trim() : "";
    const debitStr = debitRaw !== undefined && debitRaw !== null ? String(debitRaw).trim() : "";

    const creditNum = creditStr !== "" ? parseFloat(creditStr.replace(/[^0-9.-]/g, "")) : 0;
    const debitNum = debitStr !== "" ? parseFloat(debitStr.replace(/[^0-9.-]/g, "")) : 0;

    if (creditNum > 0) {
      direction = MomoTransactionDirection.IN;
      amount = parseCedi(creditStr);
    } else if (debitNum > 0) {
      direction = MomoTransactionDirection.OUT;
      amount = parseCedi(debitStr);
    } else {
      return {
        row: null,
        error: {
          rowIndex,
          message: `Row ${rowIndex} has no valid amount in Credit or Debit columns.`,
          rawRow,
        },
      };
    }
  } else {
    // Single amount column
    const rawAmt = columnMap.amountColumn ? rawRow[columnMap.amountColumn] : undefined;
    if (rawAmt === undefined || rawAmt === null || String(rawAmt).trim() === "") {
      return {
        row: null,
        error: {
          rowIndex,
          column: columnMap.amountColumn,
          message: `Row ${rowIndex} has no amount. Check the Amount column mapping.`,
          rawRow,
        },
      };
    }

    const amtStr = String(rawAmt).trim();
    const cleanNum = parseFloat(amtStr.replace(/[^0-9.-]/g, ""));
    if (isNaN(cleanNum) || cleanNum === 0) {
      return {
        row: null,
        error: {
          rowIndex,
          column: columnMap.amountColumn,
          message: `Row ${rowIndex} has an invalid or zero amount: "${amtStr}".`,
          rawRow,
        },
      };
    }

    if (amountSign === "POSITIVE_IN_NEGATIVE_OUT") {
      direction = cleanNum < 0 ? MomoTransactionDirection.OUT : MomoTransactionDirection.IN;
      amount = parseCedi(Math.abs(cleanNum).toFixed(2));
    } else {
      // ALWAYS_POSITIVE_USE_DIRECTION
      amount = parseCedi(Math.abs(cleanNum).toFixed(2));
      const rawDir = columnMap.directionColumn
        ? String(rawRow[columnMap.directionColumn] || "").toUpperCase()
        : "";

      if (rawDir.includes("DR") || rawDir.includes("DEBIT") || rawDir.includes("OUT") || rawDir.includes("SENT")) {
        direction = MomoTransactionDirection.OUT;
      } else {
        direction = MomoTransactionDirection.IN;
      }
    }
  }

  // 3. Description
  const rawDescVal = rawRow[columnMap.descriptionColumn];
  const rawDescription =
    rawDescVal !== undefined && rawDescVal !== null
      ? String(rawDescVal).trim()
      : "";

  if (!rawDescription) {
    return {
      row: null,
      error: {
        rowIndex,
        column: columnMap.descriptionColumn,
        message: `Row ${rowIndex} has an empty description. Check the Description column mapping.`,
        rawRow,
      },
    };
  }

  // 4. External Reference
  const rawRef = columnMap.referenceColumn ? rawRow[columnMap.referenceColumn] : undefined;
  const externalRef =
    rawRef !== undefined && rawRef !== null && String(rawRef).trim() !== ""
      ? String(rawRef).trim()
      : null;

  // 5. Counterparty Name and Phone
  const rawName = columnMap.counterpartyNameColumn
    ? rawRow[columnMap.counterpartyNameColumn]
    : undefined;
  const counterpartyName =
    rawName !== undefined && rawName !== null && String(rawName).trim() !== ""
      ? String(rawName).trim()
      : null;

  const rawPhone = columnMap.counterpartyPhoneColumn
    ? rawRow[columnMap.counterpartyPhoneColumn]
    : undefined;

  let counterpartyPhone: string | null = null;
  if (rawPhone !== undefined && rawPhone !== null && String(rawPhone).trim() !== "") {
    try {
      counterpartyPhone = normalizeGhanaPhone(String(rawPhone));
    } catch {
      // If phone normalisation fails, retain null or raw digits if not matching E.164
      counterpartyPhone = null;
    }
  }

  return {
    row: {
      rowIndex,
      occurredAt,
      direction,
      amount,
      externalRef,
      rawDescription,
      counterpartyName,
      counterpartyPhone,
      rawRow,
    },
    error: null,
  };
}

/**
 * Computes duplicate detection hash when externalRef is absent:
 * hash of (occurredAt date ISO, amount in 2 decimals, phone or empty, rawDescription).
 */
export function computeTransactionDuplicateHash(
  occurredAt: Date,
  amount: Prisma.Decimal,
  phone: string | null,
  rawDescription: string
): string {
  const payload = `${occurredAt.toISOString()}|${amount.toFixed(2)}|${phone || ""}|${rawDescription.trim()}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
