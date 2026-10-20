import { ServiceRecord, ServiceStatus, Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { parseServiceDate } from "@/lib/dates";
import { CreateServiceRecordInput, MarkCountedInput, ReopenServiceRecordInput } from "./schemas";

export async function createServiceRecord(
  input: CreateServiceRecordInput,
  actorId: string
): Promise<ServiceRecord> {
  const serviceDate = parseServiceDate(input.serviceDate);
  const cleanTitle = input.title?.trim() || null;
  const cleanNotes = input.notes?.trim() || null;

  return withAudit(async (tx) => {
    // Business rule: only one OPEN record per date and service type
    const existingOpen = await tx.serviceRecord.findFirst({
      where: {
        serviceDate,
        serviceType: input.serviceType,
        status: ServiceStatus.OPEN,
      },
    });

    if (existingOpen) {
      throw new AppError(
        "CONFLICT",
        `An open service record already exists for ${input.serviceDate} (${input.serviceType}). Complete or lock it before starting a new one.`
      );
    }

    const record = await tx.serviceRecord.create({
      data: {
        serviceDate,
        serviceType: input.serviceType,
        title: cleanTitle,
        notes: cleanNotes,
        status: ServiceStatus.OPEN,
      },
    });

    return {
      result: record,
      audit: {
        actorId,
        action: "SERVICE_RECORD_CREATE",
        entityType: "ServiceRecord",
        entityId: record.id,
        after: {
          id: record.id,
          serviceDate: record.serviceDate,
          serviceType: record.serviceType,
          title: record.title,
          status: record.status,
        },
      },
    };
  });
}

export async function markCounted(
  serviceRecordId: string,
  input: MarkCountedInput,
  actorId: string
): Promise<ServiceRecord> {
  const record = await prisma.serviceRecord.findUnique({
    where: { id: serviceRecordId },
    include: {
      countSheets: true,
    },
  });

  if (!record) {
    throw new AppError("NOT_FOUND", "Service record not found.");
  }

  if (record.status === ServiceStatus.LOCKED) {
    throw new AppError("FORBIDDEN", "This service record is locked and cannot be modified.");
  }

  if (record.status === ServiceStatus.COUNTED) {
    throw new AppError("CONFLICT", "This service record has already been marked as counted.");
  }

  // Business rule: requires all active category sheets saved at least once or an explicit zero count
  const activeCategories = await prisma.givingCategory.findMany({
    where: { active: true },
  });

  const savedCategoryIds = new Set(record.countSheets.map((s) => s.categoryId));
  const missingCategories = activeCategories.filter(
    (c) => !savedCategoryIds.has(c.id)
  );

  if (missingCategories.length > 0) {
    const missingNames = missingCategories.map((c) => c.name).join(", ");
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot mark as counted: count sheets have not been saved for: ${missingNames}. Enter counts (or 0) for every category first.`
    );
  }

  return withAudit(async (tx) => {
    const updated = await tx.serviceRecord.update({
      where: { id: serviceRecordId },
      data: {
        status: ServiceStatus.COUNTED,
        countedById: actorId,
        witnessName: input.witnessName.trim(),
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "SERVICE_RECORD_MARK_COUNTED",
        entityType: "ServiceRecord",
        entityId: serviceRecordId,
        before: {
          status: record.status,
          countedById: record.countedById,
          witnessName: record.witnessName,
        },
        after: {
          status: updated.status,
          countedById: updated.countedById,
          witnessName: updated.witnessName,
        },
      },
    };
  });
}

export async function reopenServiceRecord(
  serviceRecordId: string,
  input: ReopenServiceRecordInput,
  actorId: string,
  actorRole: Role
): Promise<ServiceRecord> {
  // Business rule: only Finance Secretary can reopen a counted record
  if (actorRole !== Role.FINANCE_SECRETARY) {
    throw new AppError(
      "FORBIDDEN",
      "Only the Finance Secretary can reopen a counted service record."
    );
  }

  const record = await prisma.serviceRecord.findUnique({
    where: { id: serviceRecordId },
  });

  if (!record) {
    throw new AppError("NOT_FOUND", "Service record not found.");
  }

  if (record.status === ServiceStatus.LOCKED) {
    throw new AppError("FORBIDDEN", "This service record is permanently locked and cannot be reopened.");
  }

  if (record.status === ServiceStatus.OPEN) {
    throw new AppError("CONFLICT", "This service record is already open.");
  }

  return withAudit(async (tx) => {
    const updated = await tx.serviceRecord.update({
      where: { id: serviceRecordId },
      data: {
        status: ServiceStatus.OPEN,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "SERVICE_RECORD_REOPEN",
        entityType: "ServiceRecord",
        entityId: serviceRecordId,
        reason: input.reason.trim(),
        before: {
          status: record.status,
        },
        after: {
          status: updated.status,
        },
      },
    };
  });
}
