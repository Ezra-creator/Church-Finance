import { StatementFileType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { StatementParser } from "./types";
import { CsvStatementParser } from "./csv-parser";
import { XlsxStatementParser } from "./xlsx-parser";

export const MAX_STATEMENT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit

const parsers: Record<StatementFileType, StatementParser> = {
  [StatementFileType.CSV]: new CsvStatementParser(),
  [StatementFileType.XLSX]: new XlsxStatementParser(),
};

/**
 * Registry returning the appropriate StatementParser based on file type.
 * Additional formats (e.g. PDF) can be plugged in here without altering caller services.
 */
export function getStatementParser(fileType: StatementFileType): StatementParser {
  const parser = parsers[fileType];
  if (!parser) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unsupported statement file type: ${fileType}. Supported types are CSV and XLSX.`
    );
  }
  return parser;
}

/**
 * Validates uploaded file size and infers statement file type from filename and MIME type.
 */
export function validateAndDetectStatementFile(
  fileName: string,
  fileSize: number,
  mimeType?: string
): StatementFileType {
  if (fileSize > MAX_STATEMENT_FILE_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Statement file exceeds the 5 MB limit (size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB). Please upload a smaller file.`
    );
  }

  const lowerName = fileName.toLowerCase();

  if (
    lowerName.endsWith(".csv") ||
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "text/plain"
  ) {
    return StatementFileType.CSV;
  }

  if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return StatementFileType.XLSX;
  }

  throw new AppError(
    "VALIDATION_ERROR",
    `Unsupported file format: "${fileName}". Please upload a CSV (.csv) or Excel (.xlsx) Mobile Money statement.`
  );
}
