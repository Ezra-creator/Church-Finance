"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { handleActionError, successResult, Result } from "@/lib/errors";
import {
  addGivingEntrySchema,
  updateGivingEntrySchema,
  deleteGivingEntrySchema,
  AddGivingEntryInput,
  UpdateGivingEntryInput,
  DeleteGivingEntryInput,
} from "./schemas";
import {
  addGivingEntry,
  updateGivingEntry,
  deleteGivingEntry,
} from "./service";

export async function addGivingEntryAction(
  rawInput: AddGivingEntryInput
): Promise<Result<{ id: string; receiptId: string | null }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = addGivingEntrySchema.parse(rawInput);
    const entry = await addGivingEntry(input, user.id);

    revalidatePath(`/services/${input.serviceRecordId}`);
    return successResult({ id: entry.id, receiptId: entry.receiptId });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateGivingEntryAction(
  rawInput: UpdateGivingEntryInput,
  serviceRecordId: string
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = updateGivingEntrySchema.parse(rawInput);
    const entry = await updateGivingEntry(input, user.id);

    revalidatePath(`/services/${serviceRecordId}`);
    return successResult({ id: entry.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteGivingEntryAction(
  rawInput: DeleteGivingEntryInput,
  serviceRecordId: string
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = deleteGivingEntrySchema.parse(rawInput);
    const entry = await deleteGivingEntry(input, user.id);

    revalidatePath(`/services/${serviceRecordId}`);
    return successResult({ id: entry.id });
  } catch (error) {
    return handleActionError(error);
  }
}
