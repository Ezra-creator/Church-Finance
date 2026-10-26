import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Role, User } from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { CreateUserInput, ChangeRoleInput } from "./schemas";

function generateTemporaryPassword(): string {
  // Generates a readable 10-character alphanumeric temporary password
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#%";
  const bytes = crypto.randomBytes(10);
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export async function createUser(
  input: CreateUserInput,
  actorId: string
): Promise<{ user: User; temporaryPassword: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    throw new AppError("CONFLICT", "A user with this email address already exists.");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await withAudit(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        active: true,
        mustChangePassword: true,
        failedLogins: 0,
      },
    });

    return {
      result: created,
      audit: {
        actorId,
        action: "USER_CREATE",
        entityType: "User",
        entityId: created.id,
        before: null,
        after: {
          name: created.name,
          email: created.email,
          role: created.role,
          active: created.active,
          mustChangePassword: created.mustChangePassword,
        },
      },
    };
  });

  return { user, temporaryPassword };
}

export async function changeUserRole(
  input: ChangeRoleInput,
  actorId: string
): Promise<User> {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!target) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  if (target.role === input.role) {
    return target;
  }

  return withAudit(async (tx) => {
    // If demoting an active Finance Secretary, verify at least one other active Finance Secretary exists
    if (target.role === Role.FINANCE_SECRETARY && target.active) {
      const activeSecretaryCount = await tx.user.count({
        where: {
          role: Role.FINANCE_SECRETARY,
          active: true,
        },
      });

      if (activeSecretaryCount <= 1) {
        throw new AppError(
          "LAST_SECRETARY_PROTECTED",
          "Cannot demote the last active finance secretary."
        );
      }
    }

    const updated = await tx.user.update({
      where: { id: input.userId },
      data: {
        role: input.role,
        tokenVersion: { increment: 1 },
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "USER_UPDATE_ROLE",
        entityType: "User",
        entityId: updated.id,
        before: { role: target.role },
        after: { role: updated.role },
      },
    };
  });
}

export async function deactivateUser(
  targetUserId: string,
  actorId: string
): Promise<User> {
  if (targetUserId === actorId) {
    throw new AppError(
      "SELF_DEACTIVATION_FORBIDDEN",
      "You cannot deactivate your own account."
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  if (!target.active) {
    return target;
  }

  return withAudit(async (tx) => {
    // Prevent deactivating the last active Finance Secretary
    if (target.role === Role.FINANCE_SECRETARY) {
      const activeSecretaryCount = await tx.user.count({
        where: {
          role: Role.FINANCE_SECRETARY,
          active: true,
        },
      });

      if (activeSecretaryCount <= 1) {
        throw new AppError(
          "LAST_SECRETARY_PROTECTED",
          "Cannot deactivate the last active finance secretary."
        );
      }
    }

    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        active: false,
        tokenVersion: { increment: 1 },
      },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "USER_DEACTIVATE",
        entityType: "User",
        entityId: updated.id,
        before: { active: true },
        after: { active: false },
      },
    };
  });
}

export async function reactivateUser(
  targetUserId: string,
  actorId: string
): Promise<User> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  if (target.active) {
    return target;
  }

  return withAudit(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { active: true },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "USER_REACTIVATE",
        entityType: "User",
        entityId: updated.id,
        before: { active: false },
        after: { active: true },
      },
    };
  });
}

export async function resetUserPassword(
  targetUserId: string,
  actorId: string
): Promise<{ temporaryPassword: string }> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await withAudit(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLogins: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    });

    return {
      result: null,
      audit: {
        actorId,
        action: "USER_RESET_PASSWORD",
        entityType: "User",
        entityId: targetUserId,
        before: null,
        after: { mustChangePassword: true, accountUnlocked: true },
      },
    };
  });

  return { temporaryPassword };
}
