import { z } from "zod";

export const countLineInputSchema = z.object({
  denominationId: z.string().min(1, "Denomination is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative"),
});

export const saveCountSheetSchema = z.object({
  serviceRecordId: z.string().min(1, "Service record is required"),
  categoryId: z.string().min(1, "Giving category is required"),
  lines: z.array(countLineInputSchema),
});

export type SaveCountSheetInput = z.infer<typeof saveCountSheetSchema>;
