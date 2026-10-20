import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: "Select a valid role." }),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const changeRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: "Select a valid role." }),
  }),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const toggleUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  active: z.boolean(),
});

export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
