import {
  DepositKind,
  DepositStatus,
  Role,
  Deposit,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { toDecimal } from "@/lib/money";
import { linkAttachmentToEntity } from "@/features/attachments/service";
import { RecordDepositInput } from "./schemas";

export async function recordDeposit(
  input: RecordDepositInput,
  actorId: string
): Promise<Deposit> {
  // Enforce slip attachment for cash deposits
  if (input.kind === DepositKind.CASH_DEPOSIT && !input.attachmentId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "A bank deposit slip photo is required for cash deposits."
    );
  }

  const carriedByUser = await prisma.user.findUnique({
    where: { id: input.carriedById },
  });

  if (!carriedByUser) {
    throw new AppError("NOT_FOUND", "Selected carrier user not found.");
  }

  const result = await withAudit(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        depositDate: new Date(input.depositDate),
        kind: input.kind,
        amount: toDecimal(input.amount),
        bankReference: input.bankReference.trim(),
        carriedById: input.carriedById,
        status: DepositStatus.PENDING_CONFIRMATION,
        notes: input.notes?.trim() || null,
      },
    });

    return {
      result: deposit,
      audit: {
        actorId,
        action: "DEPOSIT_RECORDED",
        entityType: "Deposit",
        entityId: deposit.id,
        after: {
          kind: deposit.kind,
          amount: deposit.amount.toString(),
          bankReference: deposit.bankReference,
        },
      },
    };
  });

  if (input.attachmentId) {
    await linkAttachmentToEntity(input.attachmentId, result.id);
  }

  return result;
}

export async function confirmDeposit(
  id: string,
  actorId: string,
  actorRole: Role
): Promise<Deposit> {
  if (actorRole !== Role.TREASURER) {
    throw new AppError("FORBIDDEN", "Only the Treasurer can confirm bank deposits.");
  }

  const deposit = await prisma.deposit.findUnique({
    where: { id },
  });

  if (!deposit) {
    throw new AppError("NOT_FOUND", "Deposit not found.");
  }

  if (deposit.status === DepositStatus.CONFIRMED) {
    throw new AppError("LOCKED_RECORD", "This deposit has already been confirmed.");
  }

  return withAudit(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.CONFIRMED,
        confirmedById: actorId,
        confirmedAt: new Date(),
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "DEPOSIT_CONFIRMED",
        entityType: "Deposit",
        entityId: deposit.id,
        before: { status: deposit.status },
        after: { status: updated.status, confirmedById: actorId },
      },
    };
  });
}
