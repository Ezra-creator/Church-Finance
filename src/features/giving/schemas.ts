import { z } from "zod";

export const addGivingEntrySchema = z
  .object({
    serviceRecordId: z.string().min(1, "Service record is required").max(64),
    categoryId: z.string().min(1, "Giving category is required").max(64),
    memberId: z.string().max(64).nullable().optional(),
    payerName: z.string().trim().max(120, "Payer name cannot exceed 120 characters").nullable().optional(),
    amount: z.string().min(1, "Amount is required").max(20),
    reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
    idempotencyKey: z.string().max(128).optional(),
  })
  .refine(
    (data) => {
      // Either memberId or payerName must be present
      return (
        (data.memberId && data.memberId.trim() !== "") ||
        (data.payerName && data.payerName.trim() !== "")
      );
    },
    {
      message: "Please select a registered member or enter a visitor payer name.",
      path: ["memberId"],
    }
  );

export type AddGivingEntryInput = z.infer<typeof addGivingEntrySchema>;

export const updateGivingEntrySchema = z.object({
  id: z.string().min(1, "Entry ID is required").max(64),
  amount: z.string().min(1, "Amount is required").max(20),
  memberId: z.string().max(64).nullable().optional(),
  payerName: z.string().trim().max(120, "Payer name cannot exceed 120 characters").nullable().optional(),
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
  idempotencyKey: z.string().max(128).optional(),
});

export type UpdateGivingEntryInput = z.infer<typeof updateGivingEntrySchema>;

export const deleteGivingEntrySchema = z.object({
  id: z.string().min(1, "Entry ID is required").max(64),
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
  idempotencyKey: z.string().max(128).optional(),
});

export type DeleteGivingEntryInput = z.infer<typeof deleteGivingEntrySchema>;
