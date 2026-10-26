import { z } from "zod";

export const statementRangeSchema = z.object({
  memberId: z.string().min(1, "Member ID is required."),
  rangeStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format."),
  rangeEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format."),
});

export type StatementRangeInput = z.infer<typeof statementRangeSchema>;

export const bulkStatementSchema = z.object({
  year: z
    .number()
    .int()
    .min(2000, "Year must be at least 2000.")
    .max(2100, "Year must be at most 2100."),
});

export type BulkStatementInput = z.infer<typeof bulkStatementSchema>;
