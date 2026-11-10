import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const churchSetupSchema = z.object({
  assemblyName: z.string().trim().min(2, "Assembly name must be at least 2 characters.").default("PUCA English Assembly"),
  parentBodyName: z.string().trim().min(2, "Denomination name must be at least 2 characters.").default("The Church of Pentecost"),
  assemblyAbbreviation: z.string().trim().min(1, "Abbreviation must be at least 1 character.").default("PUCA"),
  districtName: z.string().trim().optional(),
  areaName: z.string().trim().optional(),
  reportRecipientName: z.string().trim().optional(),
  signatoryTitles: z.array(z.string()).default([]),
  currency: z.string().default("GHS"),
  timezone: z.string().default("Africa/Accra"),
  weekStartsOn: z.string().default("Sunday"),
  weekEndsOn: z.coerce.number().int().min(0).max(6).default(0),
});

export type ChurchSetupInput = z.infer<typeof churchSetupSchema>;
