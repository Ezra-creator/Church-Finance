import { z } from "zod";
import { RuleMatchType, StatementFileType } from "@prisma/client";

export const columnMapSchema = z.object({
  dateColumn: z.string().min(1, "Date column name is required"),
  amountColumn: z.string().optional(),
  creditColumn: z.string().optional(),
  debitColumn: z.string().optional(),
  directionColumn: z.string().optional(),
  referenceColumn: z.string().optional(),
  descriptionColumn: z.string().min(1, "Description column name is required"),
  counterpartyNameColumn: z.string().optional(),
  counterpartyPhoneColumn: z.string().optional(),
});

export const parserProfileSchema = z.object({
  name: z.string().trim().min(2, "Profile name must be at least 2 characters"),
  fileType: z.nativeEnum(StatementFileType),
  headerRow: z.number().int().min(1).default(1),
  columnMap: columnMapSchema,
  dateFormat: z.string().default("YYYY-MM-DD"),
  amountSign: z
    .enum([
      "POSITIVE_IN_NEGATIVE_OUT",
      "SEPARATE_COLUMNS",
      "ALWAYS_POSITIVE_USE_DIRECTION",
    ])
    .default("POSITIVE_IN_NEGATIVE_OUT"),
});

export type CreateParserProfileInput = z.infer<typeof parserProfileSchema>;

export const classifySingleTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  categoryId: z.string().min(1, "Category is required"),
  rememberRule: z.boolean().default(false),
  rulePattern: z.string().trim().optional(),
  matchType: z.nativeEnum(RuleMatchType).default(RuleMatchType.CONTAINS_WORD),
});

export type ClassifySingleTransactionInput = z.infer<
  typeof classifySingleTransactionSchema
>;

export const bulkClassifyTransactionsSchema = z.object({
  transactionIds: z
    .array(z.string().min(1))
    .min(1, "At least one transaction must be selected"),
  categoryId: z.string().min(1, "Category is required"),
});

export type BulkClassifyTransactionsInput = z.infer<
  typeof bulkClassifyTransactionsSchema
>;

export const createClassificationRuleSchema = z.object({
  pattern: z.string().trim().min(2, "Pattern must be at least 2 characters"),
  matchType: z.nativeEnum(RuleMatchType),
  categoryId: z.string().min(1, "Category is required"),
  priority: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
});

export type CreateClassificationRuleInput = z.infer<
  typeof createClassificationRuleSchema
>;

export const updateClassificationRuleSchema = z.object({
  id: z.string().min(1, "Rule ID is required"),
  pattern: z.string().trim().min(2, "Pattern must be at least 2 characters"),
  matchType: z.nativeEnum(RuleMatchType),
  categoryId: z.string().min(1, "Category is required"),
  priority: z.number().int().min(1),
  active: z.boolean(),
});

export type UpdateClassificationRuleInput = z.infer<
  typeof updateClassificationRuleSchema
>;

export const rollbackImportSchema = z.object({
  importId: z.string().min(1, "Import ID is required"),
  reason: z
    .string()
    .trim()
    .min(5, "A clear audit reason (minimum 5 characters) is required to roll back an import"),
});

export type RollbackImportInput = z.infer<typeof rollbackImportSchema>;
