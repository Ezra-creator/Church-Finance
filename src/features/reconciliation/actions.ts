"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { handleActionError, successResult, Result } from "@/lib/errors";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import {
  setBookTotal,
  setVarianceReason,
  submitPeriod,
  unlockPeriod,
} from "./service";
import {
  setBookTotalSchema,
  setVarianceReasonSchema,
  submitPeriodSchema,
  unlockPeriodSchema,
  SetBookTotalInput,
  SetVarianceReasonInput,
  SubmitPeriodInput,
  UnlockPeriodInput,
} from "./schemas";

export async function setBookTotalAction(
  rawInput: SetBookTotalInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = setBookTotalSchema.parse(rawInput);
    const period = await setBookTotal(input, user.id);

    revalidatePath("/reconcile");
    revalidatePath(`/reconcile/${period.weekEnding.toISOString().slice(0, 10)}`);
    return successResult({ id: period.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setVarianceReasonAction(
  rawInput: SetVarianceReasonInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = setVarianceReasonSchema.parse(rawInput);
    const period = await setVarianceReason(input, user.id);

    revalidatePath("/reconcile");
    revalidatePath(`/reconcile/${period.weekEnding.toISOString().slice(0, 10)}`);
    return successResult({ id: period.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function submitPeriodAction(
  rawInput: SubmitPeriodInput
): Promise<Result<{ id: string; version: number }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = submitPeriodSchema.parse(rawInput);
    const period = await submitPeriod(input.periodId, user.id);

    revalidatePath("/reconcile");
    revalidatePath(`/reconcile/${period.weekEnding.toISOString().slice(0, 10)}`);
    return successResult({ id: period.id, version: period.reportVersion });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function unlockPeriodAction(
  rawInput: UnlockPeriodInput
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireRole(Role.TREASURER);
    const input = unlockPeriodSchema.parse(rawInput);
    const period = await unlockPeriod(input, user.id, user.role);

    revalidatePath("/reconcile");
    revalidatePath(`/reconcile/${period.weekEnding.toISOString().slice(0, 10)}`);
    return successResult({ id: period.id });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleParallelRunSettingAction(
  active: boolean
): Promise<Result<{ parallelRunActive: boolean }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);

    const updated = await withAudit(async (tx) => {
      const setting = await tx.churchSettings.update({
        where: { id: "singleton" },
        data: { parallelRunActive: active },
      });

      return {
        result: setting,
        audit: {
          actorId: user.id,
          action: "CHURCH_SETTINGS_UPDATE",
          entityType: "ChurchSettings",
          entityId: "singleton",
          after: { parallelRunActive: active },
        },
      };
    });

    revalidatePath("/reconcile");
    return successResult({ parallelRunActive: updated.parallelRunActive });
  } catch (error) {
    return handleActionError(error);
  }
}
