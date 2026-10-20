"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { handleActionError, successResult, Result } from "@/lib/errors";
import {
  createMemberSchema,
  updateMemberSchema,
  CreateMemberInput,
  UpdateMemberInput,
} from "./schemas";
import {
  createMember,
  updateMember,
  deactivateMember,
  reactivateMember,
} from "./service";

export async function createMemberAction(
  rawInput: CreateMemberInput
): Promise<Result<{ id: string; fullName: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = createMemberSchema.parse(rawInput);
    const member = await createMember(input, user.id);

    revalidatePath("/members");
    revalidatePath("/services");
    return successResult({ id: member.id, fullName: member.fullName });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateMemberAction(
  rawInput: UpdateMemberInput
): Promise<Result<{ id: string; fullName: string }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const input = updateMemberSchema.parse(rawInput);
    const member = await updateMember(input, user.id);

    revalidatePath("/members");
    return successResult({ id: member.id, fullName: member.fullName });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleMemberActiveAction(
  id: string,
  targetActive: boolean
): Promise<Result<{ id: string; active: boolean }>> {
  try {
    const user = await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);
    const member = targetActive
      ? await reactivateMember(id, user.id)
      : await deactivateMember(id, user.id);

    revalidatePath("/members");
    return successResult({ id: member.id, active: member.active });
  } catch (error) {
    return handleActionError(error);
  }
}
