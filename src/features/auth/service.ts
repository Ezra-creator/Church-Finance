import bcrypt from "bcryptjs";
import { User, ChurchSettings } from "@prisma/client";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { assertRateLimit } from "@/lib/rate-limiter";
import { AppError } from "@/lib/errors";
import { ChangePasswordInput, ChurchSetupInput } from "./schemas";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates credentials against the database.
 * Enforces database-backed rate limiting and account lockout after failed attempts.
 * Returns the authenticated user on success.
 */
export async function verifyCredentials(
  email: string,
  plainPassword: string
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();

  // Enforce rate limit: max 10 login attempts per 60 seconds per email
  await assertRateLimit(`login:${normalizedEmail}`, 10, 60, "login");

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const genericError = new AppError(
    "INVALID_CREDENTIALS",
    "Email or password is incorrect."
  );

  if (!user || !user.active) {
    throw genericError;
  }

  const now = new Date();

  // Check if account is currently locked
  if (user.lockedUntil && user.lockedUntil > now) {
    throw new AppError(
      "ACCOUNT_LOCKED",
      "Account is temporarily locked due to multiple failed login attempts. Please try again later."
    );
  }

  // Compare password hash
  const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);

  if (!isMatch) {
    // If previous lockout expired, restart count from 1; otherwise increment
    const previousAttempts =
      user.lockedUntil && user.lockedUntil <= now ? 0 : user.failedLogins;
    const newFailedCount = previousAttempts + 1;

    if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: newFailedCount,
          lockedUntil,
        },
      });

      throw new AppError(
        "ACCOUNT_LOCKED",
        "Account is temporarily locked due to multiple failed login attempts. Please try again later."
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: newFailedCount,
      },
    });

    throw genericError;
  }

  // Successful login: reset failed attempts and lockout
  return prisma.user.update({
    where: { id: user.id },
    data: {
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: now,
    },
  });
}

/**
 * Changes a user's password and removes the mustChangePassword requirement.
 */
export async function changePassword(
  userId: string,
  input: Omit<ChangePasswordInput, "confirmPassword">
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found.");
  }

  const isCurrentMatch = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash
  );

  if (!isCurrentMatch) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Current password is incorrect."
    );
  }

  if (input.newPassword === input.currentPassword) {
    throw new AppError(
      "VALIDATION_ERROR",
      "New password must be different from the current password."
    );
  }

  const newHash = await bcrypt.hash(input.newPassword, 12);

  await withAudit(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });

    return {
      result: null,
      audit: {
        actorId: userId,
        action: "USER_CHANGE_PASSWORD",
        entityType: "User",
        entityId: userId,
        before: { mustChangePassword: user.mustChangePassword },
        after: { mustChangePassword: false },
      },
    };
  });
}

/**
 * Retrieves singleton church settings.
 */
export async function getChurchSettings(): Promise<ChurchSettings | null> {
  return prisma.churchSettings.findUnique({
    where: { id: "singleton" },
  });
}

/**
 * Saves initial church settings on first visit.
 */
export async function setupChurch(
  input: ChurchSetupInput,
  actorId: string
): Promise<ChurchSettings> {
  return withAudit(async (tx) => {
    const existing = await tx.churchSettings.findUnique({
      where: { id: "singleton" },
    });

    const settings = await tx.churchSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        churchName: input.churchName,
        presbyteryName: input.presbyteryName,
        weekEndsOn: input.weekEndsOn,
      },
      update: {
        churchName: input.churchName,
        presbyteryName: input.presbyteryName,
        weekEndsOn: input.weekEndsOn,
      },
    });

    return {
      result: settings,
      audit: {
        actorId,
        action: existing ? "CHURCH_SETTINGS_UPDATE" : "CHURCH_SETTINGS_CREATE",
        entityType: "ChurchSettings",
        entityId: "singleton",
        before: existing
          ? {
              churchName: existing.churchName,
              presbyteryName: existing.presbyteryName,
              weekEndsOn: existing.weekEndsOn,
            }
          : null,
        after: {
          churchName: settings.churchName,
          presbyteryName: settings.presbyteryName,
          weekEndsOn: settings.weekEndsOn,
        },
      },
    };
  });
}
