"use server";

import { requireUser, requireRole } from "@/server/guards";
import { Role } from "@prisma/client";
import { changePasswordSchema, churchSetupSchema, ChangePasswordInput, ChurchSetupInput } from "./schemas";
import { changePassword, setupChurch } from "./service";
import { Result, successResult, handleActionError, errorResult } from "@/lib/errors";
import { revalidatePath } from "next/cache";

export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<Result<{ message: string }>> {
  try {
    const user = await requireUser();
    const parsed = changePasswordSchema.safeParse(input);

    if (!parsed.success) {
      return errorResult("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input.");
    }

    await changePassword(user.id, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    revalidatePath("/today");
    revalidatePath("/settings/users");
    return successResult({ message: "Password updated successfully." });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setupChurchAction(
  input: ChurchSetupInput
): Promise<Result<{ message: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY);
    const parsed = churchSetupSchema.safeParse(input);

    if (!parsed.success) {
      return errorResult("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input.");
    }

    await setupChurch(parsed.data, user.id);

    revalidatePath("/today");
    revalidatePath("/settings/users");
    revalidatePath("/settings/audit");
    return successResult({ message: "Church details saved successfully." });
  } catch (error) {
    return handleActionError(error);
  }
}
