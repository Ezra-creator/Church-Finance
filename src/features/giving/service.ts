import { GivingEntry, Prisma, ServiceStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { parseCedi, sumCedi } from "@/lib/money";
import {
  AddGivingEntryInput,
  UpdateGivingEntryInput,
  DeleteGivingEntryInput,
} from "./schemas";

/**
 * Generates the next sequential receipt number for a given calendar year.
 * Row-locks the `receipt_sequences` table via `SELECT ... FOR UPDATE` inside
 * the active interactive transaction to prevent race conditions and ensure
 * receipt numbers never repeat or skip under concurrent requests.
 */
async function generateNextReceiptNumber(
  tx: Prisma.TransactionClient,
  year: number
): Promise<string> {
  // Ensure the sequence record exists for this year
  await tx.$executeRaw`
    INSERT INTO receipt_sequences (\`year\`, \`last\`)
    VALUES (${year}, 0)
    ON DUPLICATE KEY UPDATE \`year\` = \`year\`
  `;

  // Row-level lock for atomic sequential increment
  const rows = await tx.$queryRaw<{ last: number }[]>`
    SELECT \`last\` FROM receipt_sequences WHERE \`year\` = ${year} FOR UPDATE
  `;

  const currentLast = rows[0]?.last ?? 0;
  const nextSeq = currentLast + 1;

  await tx.$executeRaw`
    UPDATE receipt_sequences SET \`last\` = ${nextSeq} WHERE \`year\` = ${year}
  `;

  const padded = String(nextSeq).padStart(4, "0");
  return `R-${year}-${padded}`;
}

export async function addGivingEntry(
  input: AddGivingEntryInput,
  actorId: string
): Promise<GivingEntry> {
  const amount = parseCedi(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new AppError("VALIDATION_ERROR", "Entry amount must be greater than zero.");
  }

  const record = await prisma.serviceRecord.findUnique({
    where: { id: input.serviceRecordId },
  });

  if (!record) {
    throw new AppError("NOT_FOUND", "Service record not found.");
  }

  if (record.status === ServiceStatus.LOCKED) {
    throw new AppError("FORBIDDEN", "This service record is locked and cannot be edited.");
  }

  // Once marked as COUNTED, edits require a mandatory audit reason
  if (record.status === ServiceStatus.COUNTED && (!input.reason || input.reason.trim() === "")) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This service record has already been marked counted. A reason is required to add or alter giving entries."
    );
  }

  const category = await prisma.givingCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw new AppError("NOT_FOUND", "Giving category not found.");
  }

  // Tithe-specific validation
  const isTithe = category.code === "TITHE";
  if (isTithe) {
    if (!input.memberId && (!input.payerName || input.payerName.trim() === "")) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Tithe entries require either a registered member or a visitor payer name."
      );
    }

    const countSheet = await prisma.countSheet.findUnique({
      where: {
        serviceRecordId_categoryId: {
          serviceRecordId: input.serviceRecordId,
          categoryId: input.categoryId,
        },
      },
    });

    if (!countSheet) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Physical cash count for Tithe must be entered and saved before recording individual tithe payments."
      );
    }

    // Check existing tithe entries total
    const existingEntries = await prisma.givingEntry.findMany({
      where: {
        serviceRecordId: input.serviceRecordId,
        categoryId: input.categoryId,
      },
    });

    const currentTotal = sumCedi(existingEntries.map((e) => e.amount));
    const newTotal = currentTotal.add(amount);

    if (newTotal.greaterThan(countSheet.total)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Tithe entries total (GH₵ ${newTotal.toFixed(
          2
        )}) cannot exceed the counted cash tithe total of GH₵ ${countSheet.total.toFixed(
          2
        )}. Remaining unattributed amount is GH₵ ${countSheet.total.sub(currentTotal).toFixed(2)}.`
      );
    }
  }

  const year = record.serviceDate.getUTCFullYear();

  return withAudit(async (tx) => {
    let receiptId: string | null = null;

    // Automatically issue an official receipt for tithe entries
    if (isTithe) {
      const receiptNumber = await generateNextReceiptNumber(tx, year);
      const receipt = await tx.receipt.create({
        data: {
          number: receiptNumber,
          amount,
          issuedById: actorId,
        },
      });
      receiptId = receipt.id;
    }

    const entry = await tx.givingEntry.create({
      data: {
        serviceRecordId: input.serviceRecordId,
        categoryId: input.categoryId,
        memberId: input.memberId || null,
        payerName: input.payerName?.trim() || null,
        amount,
        receiptId,
      },
    });

    return {
      result: entry,
      audit: {
        actorId,
        action: "GIVING_ENTRY_ADD",
        entityType: "GivingEntry",
        entityId: entry.id,
        reason: input.reason?.trim() || undefined,
        after: {
          id: entry.id,
          serviceRecordId: entry.serviceRecordId,
          categoryId: entry.categoryId,
          memberId: entry.memberId,
          payerName: entry.payerName,
          amount: entry.amount.toString(),
          receiptId: entry.receiptId,
        },
      },
    };
  });
}

export async function updateGivingEntry(
  input: UpdateGivingEntryInput,
  actorId: string
): Promise<GivingEntry> {
  const newAmount = parseCedi(input.amount);
  if (newAmount.lessThanOrEqualTo(0)) {
    throw new AppError("VALIDATION_ERROR", "Entry amount must be greater than zero.");
  }

  const existing = await prisma.givingEntry.findUnique({
    where: { id: input.id },
    include: {
      serviceRecord: true,
      category: true,
    },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Giving entry not found.");
  }

  if (existing.serviceRecord.status === ServiceStatus.LOCKED) {
    throw new AppError("FORBIDDEN", "This service record is locked and cannot be edited.");
  }

  if (
    existing.serviceRecord.status === ServiceStatus.COUNTED &&
    (!input.reason || input.reason.trim() === "")
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This service record has already been marked counted. A reason is required to alter entries."
    );
  }

  // Tithe validation: ensure total does not exceed countSheet
  if (existing.category.code === "TITHE") {
    const countSheet = await prisma.countSheet.findUnique({
      where: {
        serviceRecordId_categoryId: {
          serviceRecordId: existing.serviceRecordId,
          categoryId: existing.categoryId,
        },
      },
    });

    if (countSheet) {
      const otherEntries = await prisma.givingEntry.findMany({
        where: {
          serviceRecordId: existing.serviceRecordId,
          categoryId: existing.categoryId,
          id: { not: existing.id },
        },
      });

      const otherTotal = sumCedi(otherEntries.map((e) => e.amount));
      const projectedTotal = otherTotal.add(newAmount);

      if (projectedTotal.greaterThan(countSheet.total)) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Tithe entries total (GH₵ ${projectedTotal.toFixed(
            2
          )}) cannot exceed counted tithe of GH₵ ${countSheet.total.toFixed(2)}.`
        );
      }
    }
  }

  return withAudit(async (tx) => {
    // If there is an associated receipt, update its amount to match
    if (existing.receiptId) {
      await tx.receipt.update({
        where: { id: existing.receiptId },
        data: { amount: newAmount },
      });
    }

    const updated = await tx.givingEntry.update({
      where: { id: input.id },
      data: {
        amount: newAmount,
        memberId: input.memberId !== undefined ? input.memberId : existing.memberId,
        payerName: input.payerName !== undefined ? input.payerName?.trim() || null : existing.payerName,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "GIVING_ENTRY_UPDATE",
        entityType: "GivingEntry",
        entityId: input.id,
        reason: input.reason?.trim() || undefined,
        before: {
          amount: existing.amount.toString(),
          memberId: existing.memberId,
          payerName: existing.payerName,
        },
        after: {
          amount: updated.amount.toString(),
          memberId: updated.memberId,
          payerName: updated.payerName,
        },
      },
    };
  });
}

export async function deleteGivingEntry(
  input: DeleteGivingEntryInput,
  actorId: string
): Promise<GivingEntry> {
  const existing = await prisma.givingEntry.findUnique({
    where: { id: input.id },
    include: {
      serviceRecord: true,
      receipt: true,
    },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Giving entry not found.");
  }

  if (existing.serviceRecord.status === ServiceStatus.LOCKED) {
    throw new AppError("FORBIDDEN", "This service record is locked and cannot be edited.");
  }

  if (
    existing.serviceRecord.status === ServiceStatus.COUNTED &&
    (!input.reason || input.reason.trim() === "")
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This service record has already been marked counted. A reason is required to delete entries."
    );
  }

  return withAudit(async (tx) => {
    // Delete giving entry
    const deleted = await tx.givingEntry.delete({
      where: { id: input.id },
    });

    // If associated receipt exists, delete it too
    if (existing.receiptId) {
      await tx.receipt.delete({
        where: { id: existing.receiptId },
      });
    }

    return {
      result: deleted,
      audit: {
        actorId,
        action: "GIVING_ENTRY_DELETE",
        entityType: "GivingEntry",
        entityId: input.id,
        reason: input.reason?.trim() || undefined,
        before: {
          id: existing.id,
          amount: existing.amount.toString(),
          memberId: existing.memberId,
          payerName: existing.payerName,
          receiptNumber: existing.receipt?.number,
        },
      },
    };
  });
}
