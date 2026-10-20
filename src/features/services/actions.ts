"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { handleActionError, successResult, Result } from "@/lib/errors";
import {
  createServiceRecordSchema,
  markCountedSchema,
  reopenServiceRecordSchema,
  CreateServiceRecordInput,
  MarkCountedInput,
  ReopenServiceRecordInput,
} from "./schemas";
import {
  createServiceRecord,
  markCounted,
  reopenServiceRecord,
} from "./service";

export async function createServiceRecordAction(
  rawInput: CreateServiceRecordInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = createServiceRecordSchema.parse(rawInput);
    const record = await createServiceRecord(input, user.id);

    revalidatePath("/today");
    revalidatePath("/services");
    return successResult({ id: record.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function markCountedAction(
  serviceRecordId: string,
  rawInput: MarkCountedInput
): Promise<Result<{ id: string; status: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = markCountedSchema.parse(rawInput);
    const record = await markCounted(serviceRecordId, input, user.id);

    revalidatePath("/today");
    revalidatePath(`/services/${serviceRecordId}`);
    return successResult({ id: record.id, status: record.status });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function reopenServiceRecordAction(
  serviceRecordId: string,
  rawInput: ReopenServiceRecordInput
): Promise<Result<{ id: string; status: string }>> {
  try {
    // Only Finance Secretary can reopen a counted record
    const user = await requireRole(Role.FINANCE_SECRETARY);
    const input = reopenServiceRecordSchema.parse(rawInput);
    const record = await reopenServiceRecord(
      serviceRecordId,
      input,
      user.id,
      user.role
    );

    revalidatePath("/today");
    revalidatePath(`/services/${serviceRecordId}`);
    return successResult({ id: record.id, status: record.status });
  } catch (error) {
    return handleActionError(error);
  }
}
