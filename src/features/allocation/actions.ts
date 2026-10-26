"use server";

import { revalidatePath } from "next/cache";
import { requireSecretaryOrTreasurer } from "@/server/guards";
import { createAllocationRuleSchema, closeAllocationRuleSchema } from "./schemas";
import { createAllocationRule, closeAllocationRule } from "./service";
import { AppError } from "@/lib/errors";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export async function createAllocationRuleAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSecretaryOrTreasurer();
    const parsed = createAllocationRuleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input.",
        },
      };
    }

    const rule = await createAllocationRule(parsed.data, user.id);
    revalidatePath("/district");
    revalidatePath("/district/rules");
    return { success: true, data: { id: rule.id } };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create rule." },
    };
  }
}

export async function closeAllocationRuleAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSecretaryOrTreasurer();
    const parsed = closeAllocationRuleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input.",
        },
      };
    }

    const rule = await closeAllocationRule(parsed.data, user.id);
    revalidatePath("/district");
    revalidatePath("/district/rules");
    return { success: true, data: { id: rule.id } };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to close rule." },
    };
  }
}
