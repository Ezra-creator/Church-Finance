import { z } from "zod";

export const addGivingEntrySchema = z
  .object({
    serviceRecordId: z.string().min(1, "Service record is required"),
    categoryId: z.string().min(1, "Giving category is required"),
    memberId: z.string().nullable().optional(),
    payerName: z.string().trim().nullable().optional(),
    amount: z.string().min(1, "Amount is required"),
    reason: z.string().trim().optional(),
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
  id: z.string().min(1, "Entry ID is required"),
  amount: z.string().min(1, "Amount is required"),
  memberId: z.string().nullable().optional(),
  payerName: z.string().trim().nullable().optional(),
  reason: z.string().trim().optional(),
});

export type UpdateGivingEntryInput = z.infer<typeof updateGivingEntrySchema>;

export const deleteGivingEntrySchema = z.object({
  id: z.string().min(1, "Entry ID is required"),
  reason: z.string().trim().optional(),
});

export type DeleteGivingEntryInput = z.infer<typeof deleteGivingEntrySchema>;
