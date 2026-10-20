import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { StatementFileType } from "@prisma/client";
import { CsvStatementParser } from "@/features/momo/parsers/csv-parser";
import { XlsxStatementParser } from "@/features/momo/parsers/xlsx-parser";
import {
  validateAndDetectStatementFile,
  MAX_STATEMENT_FILE_SIZE,
} from "@/features/momo/parsers/registry";
import { ParserProfileConfig } from "@/features/momo/parsers/types";
import { AppError } from "@/lib/errors";

describe("Statement Parsers & File Validation", () => {
  describe("validateAndDetectStatementFile", () => {
    it("detects CSV files from filename or MIME type", () => {
      expect(validateAndDetectStatementFile("statement.csv", 1024)).toBe(
        StatementFileType.CSV
      );
      expect(
        validateAndDetectStatementFile("statement.txt", 1024, "text/csv")
      ).toBe(StatementFileType.CSV);
    });

    it("detects XLSX files from extension or MIME type", () => {
      expect(validateAndDetectStatementFile("statement.xlsx", 2048)).toBe(
        StatementFileType.XLSX
      );
    });

    it("rejects files larger than 5 MB", () => {
      const oversized = MAX_STATEMENT_FILE_SIZE + 1;
      expect(() =>
        validateAndDetectStatementFile("statement.csv", oversized)
      ).toThrow(AppError);
    });

    it("rejects unsupported extensions", () => {
      expect(() =>
        validateAndDetectStatementFile("statement.pdf", 1024)
      ).toThrow(AppError);
    });
  });

  describe("CsvStatementParser", () => {
    const profile: ParserProfileConfig = {
      name: "Standard MTN CSV",
      fileType: StatementFileType.CSV,
      headerRow: 1,
      columnMap: {
        dateColumn: "Date",
        amountColumn: "Amount",
        descriptionColumn: "Description",
        referenceColumn: "TxId",
        counterpartyNameColumn: "From",
        counterpartyPhoneColumn: "Phone",
      },
      dateFormat: "YYYY-MM-DD",
      amountSign: "POSITIVE_IN_NEGATIVE_OUT",
    };

    it("parses valid CSV rows with dates, amounts, and metadata", async () => {
      const csvData = [
        "Date,Amount,Description,TxId,From,Phone",
        "2026-10-18,150.00,Tithe payment,MTN1001,Kwame Mensah,0244123456",
        "2026-10-19,-50.00,Cash out withdrawal,MTN1002,Cashier,0200000000",
      ].join("\n");

      const buffer = Buffer.from(csvData, "utf-8");
      const parser = new CsvStatementParser();
      const res = await parser.parse(buffer, profile);

      expect(res.rows.length).toBe(2);
      expect(res.errors.length).toBe(0);

      expect(res.rows[0].externalRef).toBe("MTN1001");
      expect(res.rows[0].amount.toFixed(2)).toBe("150.00");
      expect(res.rows[0].direction).toBe("IN");
      expect(res.rows[0].counterpartyPhone).toBe("+233244123456");

      expect(res.rows[1].amount.toFixed(2)).toBe("50.00");
      expect(res.rows[1].direction).toBe("OUT");
    });

    it("reports specific row-level errors for invalid rows", async () => {
      const csvData = [
        "Date,Amount,Description,TxId,From,Phone",
        "2026-10-18,invalid-amount,Tithe payment,MTN1001,Kwame Mensah,0244123456",
        ",100.00,Missing date row,MTN1002,Yaw,0244000000",
      ].join("\n");

      const buffer = Buffer.from(csvData, "utf-8");
      const parser = new CsvStatementParser();
      const res = await parser.parse(buffer, profile);

      expect(res.rows.length).toBe(0);
      expect(res.errors.length).toBe(2);
      expect(res.errors[0].message).toContain("Row 2 has an invalid or zero amount");
      expect(res.errors[1].message).toContain("Row 3 has no date");
    });
  });

  describe("XlsxStatementParser", () => {
    const profile: ParserProfileConfig = {
      name: "Standard Excel",
      fileType: StatementFileType.XLSX,
      headerRow: 1,
      columnMap: {
        dateColumn: "Transaction Date",
        amountColumn: "Net Amount",
        descriptionColumn: "Narration",
        referenceColumn: "Reference",
      },
      dateFormat: "YYYY-MM-DD",
      amountSign: "POSITIVE_IN_NEGATIVE_OUT",
    };

    it("parses valid XLSX statement buffer created in test", async () => {
      // Build in-memory workbook
      const wsData = [
        ["Transaction Date", "Net Amount", "Narration", "Reference"],
        ["2026-10-18", "250.00", "Harvest Thanksgiving", "REF9901"],
        ["2026-10-19", "500.00", "Monthly Church Tithe", "REF9902"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

      const parser = new XlsxStatementParser();
      const res = await parser.parse(xlsxBuffer, profile);

      expect(res.rows.length).toBe(2);
      expect(res.errors.length).toBe(0);
      expect(res.rows[0].externalRef).toBe("REF9901");
      expect(res.rows[0].amount.toFixed(2)).toBe("250.00");
      expect(res.rows[1].amount.toFixed(2)).toBe("500.00");
    });
  });
});
