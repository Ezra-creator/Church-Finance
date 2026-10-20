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
  churchName: z.string().trim().min(3, "Church name must be at least 3 characters."),
  presbyteryName: z.string().trim().min(3, "Presbytery name must be at least 3 characters."),
  weekEndsOn: z.coerce.number().int().min(0).max(6).default(0),
});

export type ChurchSetupInput = z.infer<typeof churchSetupSchema>;
