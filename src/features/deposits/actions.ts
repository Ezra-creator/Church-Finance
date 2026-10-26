"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { Result, successResult, handleActionError } from "@/lib/errors";
import {
  recordDepositSchema,
  confirmDepositSchema,
  RecordDepositInput,
  ConfirmDepositInput,
} from "./schemas";
import {
  recordDeposit,
  confirmDeposit,
} from "./service";

export async function recordDepositAction(
  rawInput: RecordDepositInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = recordDepositSchema.parse(rawInput);
    const deposit = await recordDeposit(input, user.id);
    revalidatePath("/money");
    return successResult({ id: deposit.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function confirmDepositAction(
  rawInput: ConfirmDepositInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.TREASURER);
    const input = confirmDepositSchema.parse(rawInput);
    const deposit = await confirmDeposit(input.id, user.id, user.role);
    revalidatePath("/money");
    return successResult({ id: deposit.id });
  } catch (error) {
    return handleActionError(error);
  }
}
