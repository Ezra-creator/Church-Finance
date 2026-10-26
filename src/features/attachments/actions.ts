"use server";

import { Role } from "@prisma/client";
import { requireRole, requireUser } from "@/server/guards";
import { Result, successResult, handleActionError } from "@/lib/errors";
import {
  requestUploadUrlSchema,
  RequestUploadUrlInput,
} from "./schemas";
import {
  createAttachmentUpload,
  getAttachmentViewUrl,
} from "./service";

export async function requestUploadUrlAction(
  rawInput: RequestUploadUrlInput
): Promise<Result<{ attachmentId: string; uploadUrl: string; storageKey: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = requestUploadUrlSchema.parse(rawInput);
    const result = await createAttachmentUpload(input, user.id);
    return successResult(result);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getAttachmentViewUrlAction(
  attachmentId: string
): Promise<Result<{ attachmentId: string; viewUrl: string; contentType: string; sizeBytes: number }>> {
  try {
    await requireUser(); // All authenticated roles can view attachments
    const result = await getAttachmentViewUrl(attachmentId);
    return successResult(result);
  } catch (error) {
    return handleActionError(error);
  }
}
