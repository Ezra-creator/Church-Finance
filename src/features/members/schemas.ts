import { z } from "zod";

export const createMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name cannot exceed 120 characters"),
  phone: z
    .string()
    .trim()
    .nullable()
    .optional(),
  memberNumber: z
    .string()
    .trim()
    .max(30, "Member number cannot exceed 30 characters")
    .nullable()
    .optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = z.object({
  id: z.string().min(1, "Member ID is required"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name cannot exceed 120 characters"),
  phone: z
    .string()
    .trim()
    .nullable()
    .optional(),
  memberNumber: z
    .string()
    .trim()
    .max(30, "Member number cannot exceed 30 characters")
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const searchMemberSchema = z.object({
  query: z.string().default(""),
  includeInactive: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(20),
});

export type SearchMemberInput = z.infer<typeof searchMemberSchema>;
