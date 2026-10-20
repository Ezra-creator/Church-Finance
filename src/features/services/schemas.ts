import { z } from "zod";
import { ServiceType } from "@prisma/client";

export const createServiceRecordSchema = z.object({
  serviceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Service date must be in YYYY-MM-DD format"),
  serviceType: z.nativeEnum(ServiceType),
  title: z
    .string()
    .trim()
    .max(120, "Title cannot exceed 120 characters")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .nullable()
    .optional(),
});

export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>;

export const markCountedSchema = z.object({
  witnessName: z
    .string()
    .trim()
    .min(2, "Witness name is required (at least 2 characters)")
    .max(100, "Witness name cannot exceed 100 characters"),
});

export type MarkCountedInput = z.infer<typeof markCountedSchema>;

export const reopenServiceRecordSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "A clear audit reason is required to reopen a counted record")
    .max(255, "Reason cannot exceed 255 characters"),
});

export type ReopenServiceRecordInput = z.infer<typeof reopenServiceRecordSchema>;
