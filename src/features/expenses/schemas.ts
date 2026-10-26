import { z } from "zod";
import { ExpensePaymentMethod, ExpenseStatus } from "@prisma/client";

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters.").max(100),
});

export const createExpenseSchema = z.object({
  expenseDate: z.string().min(1, "Date is required."),
  categoryId: z.string().min(1, "Category is required."),
  payee: z.string().trim().min(2, "Payee must be at least 2 characters.").max(150),
  description: z.string().trim().min(3, "Description must be at least 3 characters.").max(500),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number.",
    }),
  paymentMethod: z.nativeEnum(ExpensePaymentMethod),
  attachmentId: z.string().optional().nullable(),
  submitImmediately: z.boolean().optional().default(false),
});

export const updateExpenseDraftSchema = z.object({
  id: z.string().min(1, "Expense ID is required."),
  expenseDate: z.string().min(1, "Date is required."),
  categoryId: z.string().min(1, "Category is required."),
  payee: z.string().trim().min(2, "Payee must be at least 2 characters.").max(150),
  description: z.string().trim().min(3, "Description must be at least 3 characters.").max(500),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number.",
    }),
  paymentMethod: z.nativeEnum(ExpensePaymentMethod),
  attachmentId: z.string().optional().nullable(),
});

export const submitExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required."),
});

export const approveExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required."),
});

export const rejectExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required."),
  rejectionReason: z.string().trim().min(3, "Rejection reason must be at least 3 characters.").max(500),
});

export const markExpensePaidSchema = z.object({
  id: z.string().min(1, "Expense ID is required."),
  paymentMethod: z.nativeEnum(ExpensePaymentMethod),
  paidAt: z.string().optional(),
});

export const voidExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required."),
  voidReason: z.string().trim().min(5, "Void reason must be at least 5 characters.").max(500),
});

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDraftInput = z.infer<typeof updateExpenseDraftSchema>;
export type SubmitExpenseInput = z.infer<typeof submitExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
export type MarkExpensePaidInput = z.infer<typeof markExpensePaidSchema>;
export type VoidExpenseInput = z.infer<typeof voidExpenseSchema>;
