import { CountSheet, Prisma, Role, ServiceStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import {
  checkIdempotentRequest,
  saveIdempotentResponse,
} from "@/features/idempotency/service";
import { AppError } from "@/lib/errors";
import { sumCedi } from "@/lib/money";
import { SaveCountSheetInput } from "./schemas";

export async function saveCount(
  input: SaveCountSheetInput,
  actorId: string
): Promise<CountSheet> {
  const { serviceRecordId, categoryId, lines, idempotencyKey } = input;

  // Authorisation check inside service
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || !actor.active) {
    throw new AppError("UNAUTHENTICATED", "Active user account required.");
  }
  if (actor.role !== Role.FINANCE_SECRETARY && actor.role !== Role.TREASURER) {
    throw new AppError(
      "FORBIDDEN",
      "Only Finance Secretary or Treasurer may record counts."
    );
  }

  // Idempotency check: return cached result if already processed
  if (idempotencyKey) {
    const cached = await checkIdempotentRequest<CountSheet>(
      idempotencyKey,
      actorId,
      "COUNT_SHEET_SAVE"
    );
    if (cached) return cached;
  }

  // Verify service record exists and is not LOCKED
  const record = await prisma.serviceRecord.findUnique({
    where: { id: serviceRecordId },
  });

  if (!record) {
    throw new AppError("NOT_FOUND", "Service record not found.");
  }

  if (record.status === ServiceStatus.LOCKED) {
    throw new AppError("FORBIDDEN", "This service record is locked and cannot be edited.");
  }

  // Verify category exists
  const category = await prisma.givingCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError("NOT_FOUND", "Giving category not found.");
  }

  // Fetch active denominations from database to strictly calculate totals
  const denominations = await prisma.denomination.findMany({
    where: { active: true },
  });

  const denomMap = new Map<string, Prisma.Decimal>();
  for (const d of denominations) {
    denomMap.set(d.id, d.value);
  }

  // Server-side calculation of line totals and sheet total
  const computedLines: Array<{
    denominationId: string;
    quantity: number;
    lineTotal: Prisma.Decimal;
  }> = [];

  for (const line of lines) {
    const denomValue = denomMap.get(line.denominationId);
    if (!denomValue) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Unknown or inactive denomination ID: ${line.denominationId}`
      );
    }

    if (line.quantity > 0) {
      const lineTotal = denomValue.mul(line.quantity);
      computedLines.push({
        denominationId: line.denominationId,
        quantity: line.quantity,
        lineTotal,
      });
    }
  }

  const computedTotal = sumCedi(computedLines.map((l) => l.lineTotal));

  // If this is the Tithe category, verify that existing tithe entries do not exceed the new total
  if (category.code === "TITHE") {
    const existingGivingEntries = await prisma.givingEntry.findMany({
      where: {
        serviceRecordId,
        categoryId,
      },
    });

    const existingEntriesTotal = sumCedi(existingGivingEntries.map((e) => e.amount));
    if (existingEntriesTotal.greaterThan(computedTotal)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Tithe count cannot be reduced to GH₵ ${computedTotal.toFixed(
          2
        )} because member tithe entries already total GH₵ ${existingEntriesTotal.toFixed(
          2
        )}. Adjust the tithe entries first.`
      );
    }
  }

  return withAudit(async (tx) => {
    // Find or create the count sheet
    const existingSheet = await tx.countSheet.findUnique({
      where: {
        serviceRecordId_categoryId: {
          serviceRecordId,
          categoryId,
        },
      },
    });

    let sheet: CountSheet;

    if (existingSheet) {
      // Update existing sheet and wipe old lines to replace with new set
      sheet = await tx.countSheet.update({
        where: { id: existingSheet.id },
        data: { total: computedTotal },
      });

      await tx.countLine.deleteMany({
        where: { countSheetId: sheet.id },
      });
    } else {
      sheet = await tx.countSheet.create({
        data: {
          serviceRecordId,
          categoryId,
          total: computedTotal,
        },
      });
    }

    // Insert computed lines
    if (computedLines.length > 0) {
      await tx.countLine.createMany({
        data: computedLines.map((l) => ({
          countSheetId: sheet.id,
          denominationId: l.denominationId,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      });
    }

    if (idempotencyKey) {
      await saveIdempotentResponse(
        tx,
        idempotencyKey,
        actorId,
        "COUNT_SHEET_SAVE",
        sheet
      );
    }

    return {
      result: sheet,
      audit: {
        actorId,
        action: "COUNT_SHEET_SAVE",
        entityType: "CountSheet",
        entityId: sheet.id,
        after: {
          id: sheet.id,
          serviceRecordId: sheet.serviceRecordId,
          categoryId: sheet.categoryId,
          categoryCode: category.code,
          total: sheet.total.toString(),
          linesCount: computedLines.length,
        },
      },
    };
  });
}
