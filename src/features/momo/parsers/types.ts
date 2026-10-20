import { MomoTransactionDirection, StatementFileType, Prisma } from "@prisma/client";

export interface ColumnMapConfig {
  dateColumn: string;
  amountColumn?: string;
  creditColumn?: string;
  debitColumn?: string;
  directionColumn?: string;
  referenceColumn?: string;
  descriptionColumn: string;
  counterpartyNameColumn?: string;
  counterpartyPhoneColumn?: string;
}

export type AmountSignConvention =
  | "POSITIVE_IN_NEGATIVE_OUT"
  | "SEPARATE_COLUMNS"
  | "ALWAYS_POSITIVE_USE_DIRECTION";

export interface ParserProfileConfig {
  id?: string;
  name: string;
  fileType: StatementFileType;
  headerRow: number; // 1-indexed
  columnMap: ColumnMapConfig;
  dateFormat: string;
  amountSign: AmountSignConvention;
}

export interface NormalizedStatementRow {
  rowIndex: number; // 1-indexed row in the sheet
  occurredAt: Date;
  direction: MomoTransactionDirection;
  amount: Prisma.Decimal;
  externalRef: string | null;
  rawDescription: string;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  rawRow: Record<string, unknown>;
}

export interface ParseRowError {
  rowIndex: number;
  column?: string;
  message: string;
  rawRow?: Record<string, unknown>;
}

export interface ParsedStatementResult {
  rows: NormalizedStatementRow[];
  errors: ParseRowError[];
  detectedFileType: StatementFileType;
  periodStart: Date | null;
  periodEnd: Date | null;
}

export interface StatementParser {
  parse(buffer: Buffer, profile: ParserProfileConfig): Promise<ParsedStatementResult>;
  inspect(buffer: Buffer, headerRow?: number): Promise<{ headers: string[]; sampleRows: Record<string, string>[] }>;
}
