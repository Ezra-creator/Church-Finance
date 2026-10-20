import { z } from "zod";

export const setBookTotalSchema = z.object({
  periodId: z.string().min(1, "Period ID is required."),
  amount: z.string().nullable().optional(),
});

export const setVarianceReasonSchema = z.object({
  periodId: z.string().min(1, "Period ID is required."),
  reason: z.string().max(2000, "Reason must be under 2000 characters.").nullable().optional(),
});

export const submitPeriodSchema = z.object({
  periodId: z.string().min(1, "Period ID is required."),
});

export const unlockPeriodSchema = z.object({
  periodId: z.string().min(1, "Period ID is required."),
  reason: z.string().min(5, "Unlock reason must be at least 5 characters."),
});

export type SetBookTotalInput = z.infer<typeof setBookTotalSchema>;
export type SetVarianceReasonInput = z.infer<typeof setVarianceReasonSchema>;
export type SubmitPeriodInput = z.infer<typeof submitPeriodSchema>;
export type UnlockPeriodInput = z.infer<typeof unlockPeriodSchema>;
