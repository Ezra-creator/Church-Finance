"use server";

import { requireRole } from "@/server/guards";
import { Role } from "@prisma/client";
import {
  createUserSchema,
  changeRoleSchema,
  CreateUserInput,
  ChangeRoleInput,
} from "./schemas";
import {
  createUser,
  changeUserRole,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
} from "./service";
import { Result, successResult, handleActionError, errorResult } from "@/lib/errors";
import { revalidatePath } from "next/cache";

export async function createUserAction(
  input: CreateUserInput
): Promise<Result<{ email: string; temporaryPassword: string }>> {
  try {
    const actor = await requireRole(Role.FINANCE_SECRETARY);
    const parsed = createUserSchema.safeParse(input);

    if (!parsed.success) {
      return errorResult("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input.");
    }

    const { user, temporaryPassword } = await createUser(parsed.data, actor.id);

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit");
    return successResult({ email: user.email, temporaryPassword });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function changeUserRoleAction(
  input: ChangeRoleInput
): Promise<Result<{ message: string }>> {
  try {
    const actor = await requireRole(Role.FINANCE_SECRETARY);
    const parsed = changeRoleSchema.safeParse(input);

    if (!parsed.success) {
      return errorResult("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input.");
    }

    await changeUserRole(parsed.data, actor.id);

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit");
    return successResult({ message: "User role updated successfully." });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleUserStatusAction(
  userId: string,
  active: boolean
): Promise<Result<{ message: string }>> {
  try {
    const actor = await requireRole(Role.FINANCE_SECRETARY);

    if (active) {
      await reactivateUser(userId, actor.id);
    } else {
      await deactivateUser(userId, actor.id);
    }

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit");
    return successResult({
      message: active ? "User reactivated successfully." : "User deactivated successfully.",
    });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetPasswordAction(
  userId: string
): Promise<Result<{ temporaryPassword: string }>> {
  try {
    const actor = await requireRole(Role.FINANCE_SECRETARY);
    const { temporaryPassword } = await resetUserPassword(userId, actor.id);

    revalidatePath("/settings/users");
    revalidatePath("/settings/audit");
    return successResult({ temporaryPassword });
  } catch (error) {
    return handleActionError(error);
  }
}
