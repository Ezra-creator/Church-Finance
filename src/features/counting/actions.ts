"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { handleActionError, successResult, Result } from "@/lib/errors";
import { saveCountSheetSchema, SaveCountSheetInput } from "./schemas";
import { saveCount } from "./service";

export async function saveCountAction(
  rawInput: SaveCountSheetInput
): Promise<Result<{ id: string; total: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = saveCountSheetSchema.parse(rawInput);
    const sheet = await saveCount(input, user.id);

    revalidatePath(`/services/${input.serviceRecordId}`);
    revalidatePath("/today");
    return successResult({ id: sheet.id, total: sheet.total.toFixed(2) });
  } catch (error) {
    return handleActionError(error);
  }
}
