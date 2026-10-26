import { z } from "zod";
import { DepositKind, DepositStatus } from "@prisma/client";

export const recordDepositSchema = z.object({
  depositDate: z.string().min(1, "Deposit date is required."),
  kind: z.nativeEnum(DepositKind),
  amount: z
    .string()
    .min(1, "Deposit amount is required.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Deposit amount must be a positive number.",
    }),
  bankReference: z.string().trim().min(2, "Bank reference is required.").max(100),
  carriedById: z.string().min(1, "Person who carried the deposit is required."),
  notes: z.string().trim().max(1000).optional().nullable(),
  attachmentId: z.string().optional().nullable(),
}).refine(
  (data) => {
    // For CASH_DEPOSIT, a slip attachment is strictly required
    if (data.kind === DepositKind.CASH_DEPOSIT && !data.attachmentId) {
      return false;
    }
    return true;
  },
  {
    message: "A bank deposit slip photo is required for cash deposits.",
    path: ["attachmentId"],
  }
);

export const confirmDepositSchema = z.object({
  id: z.string().min(1, "Deposit ID is required."),
});

export type RecordDepositInput = z.infer<typeof recordDepositSchema>;
export type ConfirmDepositInput = z.infer<typeof confirmDepositSchema>;
