import { z } from "zod";

export const recordRemittancePaymentSchema = z.object({
  remittanceId: z.string().min(1, "Remittance ID is required."),
  amount: z
    .string()
    .min(1, "Payment amount is required.")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Payment amount must be greater than zero."),
  paidOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be in YYYY-MM-DD format."),
  reference: z.string().optional().nullable(),
});

export type RecordRemittancePaymentInput = z.infer<
  typeof recordRemittancePaymentSchema
>;
