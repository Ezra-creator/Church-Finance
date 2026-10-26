import { z } from "zod";
import { AttachmentEntityType } from "@prisma/client";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/storage";

export const requestUploadUrlSchema = z.object({
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: z.string().optional().default("pending"),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "Only JPEG, PNG, WebP, and PDF files are allowed." }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive("File size must be greater than 0")
    .max(MAX_FILE_SIZE_BYTES, "File size must not exceed 8 MB"),
  fileName: z.string().min(1, "File name is required"),
});

export type RequestUploadUrlInput = z.input<typeof requestUploadUrlSchema>;
