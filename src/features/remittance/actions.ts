"use server";

import { revalidatePath } from "next/cache";
import { requireSecretaryOrTreasurer } from "@/server/guards";
import { recordRemittancePaymentSchema } from "./schemas";
import { recordRemittancePayment } from "./service";
import { AppError } from "@/lib/errors";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export async function recordRemittancePaymentAction(
  rawInput: unknown
): Promise<ActionResult<{ remittanceId: string }>> {
  try {
    const user = await requireSecretaryOrTreasurer();
    const parsed = recordRemittancePaymentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input.",
        },
      };
    }

    const { remittance } = await recordRemittancePayment(parsed.data, user.id);
    revalidatePath("/district");
    revalidatePath("/today");
    return { success: true, data: { remittanceId: remittance.id } };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to record payment." },
    };
  }
}
