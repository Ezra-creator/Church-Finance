import { Member } from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { normalizeGhanaPhone } from "@/lib/phone";
import { CreateMemberInput, UpdateMemberInput } from "./schemas";

export async function createMember(
  input: CreateMemberInput,
  actorId: string
): Promise<Member> {
  const normalizedPhone = normalizeGhanaPhone(input.phone);
  const cleanMemberNumber = input.memberNumber?.trim() || null;

  return withAudit(async (tx) => {
    // Check phone uniqueness if provided
    if (normalizedPhone) {
      const existingPhone = await tx.member.findUnique({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        throw new AppError(
          "CONFLICT",
          `A member with phone number ${normalizedPhone} already exists (${existingPhone.fullName}).`
        );
      }
    }

    // Check member number uniqueness if provided
    if (cleanMemberNumber) {
      const existingNumber = await tx.member.findUnique({
        where: { memberNumber: cleanMemberNumber },
      });
      if (existingNumber) {
        throw new AppError(
          "CONFLICT",
          `A member with number "${cleanMemberNumber}" already exists (${existingNumber.fullName}).`
        );
      }
    }

    const member = await tx.member.create({
      data: {
        fullName: input.fullName.trim(),
        phone: normalizedPhone,
        memberNumber: cleanMemberNumber,
        active: true,
      },
    });

    return {
      result: member,
      audit: {
        actorId,
        action: "MEMBER_CREATE",
        entityType: "Member",
        entityId: member.id,
        after: {
          id: member.id,
          fullName: member.fullName,
          phone: member.phone,
          memberNumber: member.memberNumber,
          active: member.active,
        },
      },
    };
  });
}

export async function updateMember(
  input: UpdateMemberInput,
  actorId: string
): Promise<Member> {
  const existing = await prisma.member.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Member not found.");
  }

  const normalizedPhone = normalizeGhanaPhone(input.phone);
  const cleanMemberNumber = input.memberNumber?.trim() || null;

  return withAudit(async (tx) => {
    // If phone changed, verify uniqueness
    if (normalizedPhone && normalizedPhone !== existing.phone) {
      const existingPhone = await tx.member.findUnique({
        where: { phone: normalizedPhone },
      });
      if (existingPhone && existingPhone.id !== input.id) {
        throw new AppError(
          "CONFLICT",
          `Phone number ${normalizedPhone} is already in use by another member (${existingPhone.fullName}).`
        );
      }
    }

    // If member number changed, verify uniqueness
    if (cleanMemberNumber && cleanMemberNumber !== existing.memberNumber) {
      const existingNum = await tx.member.findUnique({
        where: { memberNumber: cleanMemberNumber },
      });
      if (existingNum && existingNum.id !== input.id) {
        throw new AppError(
          "CONFLICT",
          `Member number "${cleanMemberNumber}" is already in use by ${existingNum.fullName}.`
        );
      }
    }

    const updated = await tx.member.update({
      where: { id: input.id },
      data: {
        fullName: input.fullName.trim(),
        phone: normalizedPhone,
        memberNumber: cleanMemberNumber,
        active: input.active !== undefined ? input.active : existing.active,
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "MEMBER_UPDATE",
        entityType: "Member",
        entityId: input.id,
        before: {
          id: existing.id,
          fullName: existing.fullName,
          phone: existing.phone,
          memberNumber: existing.memberNumber,
          active: existing.active,
        },
        after: {
          id: updated.id,
          fullName: updated.fullName,
          phone: updated.phone,
          memberNumber: updated.memberNumber,
          active: updated.active,
        },
      },
    };
  });
}

export async function deactivateMember(
  id: string,
  actorId: string
): Promise<Member> {
  const existing = await prisma.member.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Member not found.");
  }

  return withAudit(async (tx) => {
    const updated = await tx.member.update({
      where: { id },
      data: { active: false },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "MEMBER_DEACTIVATE",
        entityType: "Member",
        entityId: id,
        before: { active: true },
        after: { active: false },
      },
    };
  });
}

export async function reactivateMember(
  id: string,
  actorId: string
): Promise<Member> {
  const existing = await prisma.member.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Member not found.");
  }

  return withAudit(async (tx) => {
    const updated = await tx.member.update({
      where: { id },
      data: { active: true },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "MEMBER_REACTIVATE",
        entityType: "Member",
        entityId: id,
        before: { active: false },
        after: { active: true },
      },
    };
  });
}
