import Papa from "papaparse";
import { StatementFileType } from "@prisma/client";
import {
  StatementParser,
  ParserProfileConfig,
  ParsedStatementResult,
  NormalizedStatementRow,
  ParseRowError,
} from "./types";
import { normalizeStatementRow } from "./normalizer";

export class CsvStatementParser implements StatementParser {
  async parse(
    buffer: Buffer,
    profile: ParserProfileConfig
  ): Promise<ParsedStatementResult> {
    const content = buffer.toString("utf-8");

    // Parse all rows without header first to accurately locate headerRow
    const parseResult = Papa.parse<string[]>(content, {
      skipEmptyLines: false,
    });

    const rawRows = parseResult.data;
    const headerIndex = Math.max(0, profile.headerRow - 1);

    if (rawRows.length <= headerIndex) {
      return {
        rows: [],
        errors: [
          {
            rowIndex: profile.headerRow,
            message: `File has only ${rawRows.length} lines, but header was expected at line ${profile.headerRow}.`,
          },
        ],
        detectedFileType: StatementFileType.CSV,
        periodStart: null,
        periodEnd: null,
      };
    }

    const headers = rawRows[headerIndex].map((h) => String(h || "").trim());

    const rows: NormalizedStatementRow[] = [];
    const errors: ParseRowError[] = [];

    // Parse data rows starting after headerRow
    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const line = rawRows[i];
      // Skip completely empty lines
      if (!line || line.every((cell) => String(cell || "").trim() === "")) {
        continue;
      }

      const rowObject: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => {
        if (header) {
          rowObject[header] = line[colIdx];
        }
      });

      const actualRowNumber = i + 1; // 1-indexed file line
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

    // Determine periodStart and periodEnd
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
      detectedFileType: StatementFileType.CSV,
      periodStart,
      periodEnd,
    };
  }

  async inspect(
    buffer: Buffer,
    headerRow: number = 1
  ): Promise<{ headers: string[]; sampleRows: Record<string, string>[] }> {
    const content = buffer.toString("utf-8");
    const parseResult = Papa.parse<string[]>(content, {
      preview: 20,
      skipEmptyLines: false,
    });

    const rawRows = parseResult.data;
    const headerIndex = Math.max(0, headerRow - 1);

    if (rawRows.length <= headerIndex) {
      return { headers: [], sampleRows: [] };
    }

    const headers = rawRows[headerIndex]
      .map((h) => String(h || "").trim())
      .filter((h) => h.length > 0);

    const sampleRows: Record<string, string>[] = [];
    for (let i = headerIndex + 1; i < rawRows.length && sampleRows.length < 5; i++) {
      const line = rawRows[i];
      if (!line || line.every((cell) => String(cell || "").trim() === "")) continue;

      const rowObj: Record<string, string> = {};
      rawRows[headerIndex].forEach((header, colIdx) => {
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
