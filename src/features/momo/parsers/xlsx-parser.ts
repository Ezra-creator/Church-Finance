import * as XLSX from "xlsx";
import { StatementFileType } from "@prisma/client";
import {
  StatementParser,
  ParserProfileConfig,
  ParsedStatementResult,
  NormalizedStatementRow,
  ParseRowError,
} from "./types";
import { normalizeStatementRow } from "./normalizer";

export class XlsxStatementParser implements StatementParser {
  async parse(
    buffer: Buffer,
    profile: ParserProfileConfig
  ): Promise<ParsedStatementResult> {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        rows: [],
        errors: [{ rowIndex: 1, message: "Spreadsheet contains no worksheets." }],
        detectedFileType: StatementFileType.XLSX,
        periodStart: null,
        periodEnd: null,
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    // Read sheet as 2D array of raw values
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });

    const headerIndex = Math.max(0, profile.headerRow - 1);

    if (rawData.length <= headerIndex) {
      return {
        rows: [],
        errors: [
          {
            rowIndex: profile.headerRow,
            message: `Worksheet has only ${rawData.length} rows, but header was expected at row ${profile.headerRow}.`,
          },
        ],
        detectedFileType: StatementFileType.XLSX,
        periodStart: null,
        periodEnd: null,
      };
    }

    const headers = (rawData[headerIndex] || []).map((h) => String(h || "").trim());

    const rows: NormalizedStatementRow[] = [];
    const errors: ParseRowError[] = [];

    for (let i = headerIndex + 1; i < rawData.length; i++) {
      const line = rawData[i];
      if (!line || line.every((cell) => String(cell || "").trim() === "")) {
        continue;
      }

      const rowObject: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => {
        if (header) {
          rowObject[header] = line[colIdx];
        }
      });

      const actualRowNumber = i + 1; // 1-indexed Excel row
      const { row, error } = normalizeStatementRow(
        rowObject,
        actualRowNumber,
        profile
      );

      if (error) {
        errors.push(error);
      } else if (row) {
        rows.push(row);
      }
    }

    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    for (const r of rows) {
      if (!periodStart || r.occurredAt < periodStart) {
        periodStart = r.occurredAt;
      }
      if (!periodEnd || r.occurredAt > periodEnd) {
        periodEnd = r.occurredAt;
      }
    }

    return {
      rows,
      errors,
      detectedFileType: StatementFileType.XLSX,
      periodStart,
      periodEnd,
    };
  }

  async inspect(
    buffer: Buffer,
    headerRow: number = 1
  ): Promise<{ headers: string[]; sampleRows: Record<string, string>[] }> {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { headers: [], sampleRows: [] };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });

    const headerIndex = Math.max(0, headerRow - 1);
    if (rawData.length <= headerIndex) {
      return { headers: [], sampleRows: [] };
    }

    const headers = (rawData[headerIndex] || [])
      .map((h) => String(h || "").trim())
      .filter((h) => h.length > 0);

    const sampleRows: Record<string, string>[] = [];
    for (let i = headerIndex + 1; i < rawData.length && sampleRows.length < 5; i++) {
      const line = rawData[i] || [];
      if (line.every((cell) => String(cell || "").trim() === "")) continue;

      const rowObj: Record<string, string> = {};
      (rawData[headerIndex] || []).forEach((header, colIdx) => {
        const cleanHeader = String(header || "").trim();
        if (cleanHeader) {
          rowObj[cleanHeader] = String(line[colIdx] ?? "").trim();
        }
      });
      sampleRows.push(rowObj);
    }

    return { headers, sampleRows };
  }
}
