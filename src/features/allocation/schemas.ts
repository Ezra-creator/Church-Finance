import { z } from "zod";

export const createAllocationRuleSchema = z.object({
  categoryId: z.string().min(1, "Giving category is required."),
  percentage: z
    .string()
    .min(1, "Percentage is required.")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 100;
    }, "Percentage must be greater than 0 and at most 100."),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective from date must be in YYYY-MM-DD format."),
});

export type CreateAllocationRuleInput = z.infer<typeof createAllocationRuleSchema>;

export const closeAllocationRuleSchema = z.object({
  ruleId: z.string().min(1, "Rule ID is required."),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective to date must be in YYYY-MM-DD format."),
});

export type CloseAllocationRuleInput = z.infer<typeof closeAllocationRuleSchema>;
