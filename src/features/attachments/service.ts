import path from "path";
import { AttachmentEntityType, Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/lib/errors";
import { assertRateLimit } from "@/lib/rate-limiter";
import {
  generateStorageKey,
  createPresignedUploadUrl,
  createPresignedViewUrl,
  validateUploadFile,
} from "@/lib/storage";
import { RequestUploadUrlInput } from "./schemas";

export async function createAttachmentUpload(
  input: RequestUploadUrlInput,
  userId: string
) {
  // Service-level authorization check
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw new AppError("UNAUTHENTICATED", "Active user account required.");
  }
  if (user.role !== Role.FINANCE_SECRETARY && user.role !== Role.TREASURER) {
    throw new AppError(
      "FORBIDDEN",
      "Only Finance Secretary or Treasurer may request upload URLs."
    );
  }

  // Rate limiting: max 20 upload requests per 60 seconds per user
  await assertRateLimit(`upload-url:${userId}`, 20, 60, "receipt upload");

  validateUploadFile(input.contentType, input.sizeBytes);

  const prefix = input.entityType === AttachmentEntityType.EXPENSE ? "expenses" : "deposits";
  const ext = path.extname(input.fileName) || (input.contentType === "application/pdf" ? ".pdf" : ".jpg");
  const storageKey = generateStorageKey(prefix, ext);

  const attachment = await prisma.attachment.create({
    data: {
      storageKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadedById: userId,
      entityType: input.entityType,
      entityId: input.entityId || "pending",
    },
  });

  const uploadUrl = await createPresignedUploadUrl(
    storageKey,
    input.contentType,
    input.sizeBytes
  );

  return {
    attachmentId: attachment.id,
    uploadUrl,
    storageKey,
  };
}

export async function getAttachmentViewUrl(attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new AppError("NOT_FOUND", "Attachment not found.");
  }

  const viewUrl = await createPresignedViewUrl(attachment.storageKey);

  return {
    attachmentId: attachment.id,
    viewUrl,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
  };
}

export async function linkAttachmentToEntity(
  attachmentId: string,
  entityId: string
) {
  await prisma.attachment.update({
    where: { id: attachmentId },
    data: { entityId },
  });
}
