import { z } from "zod";

export const countLineInputSchema = z.object({
  denominationId: z.string().min(1, "Denomination is required").max(64),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative")
    .max(1_000_000, "Quantity exceeds practical limit"),
});

export const saveCountSheetSchema = z.object({
  serviceRecordId: z.string().min(1, "Service record is required").max(64),
  categoryId: z.string().min(1, "Giving category is required").max(64),
  lines: z.array(countLineInputSchema).max(50),
  idempotencyKey: z.string().max(128).optional(),
});

export type SaveCountSheetInput = z.infer<typeof saveCountSheetSchema>;
